'use strict';

/** Anthropic Messages API -> CodeBuddy Chat Completions adapter. */
const http = require('http');
const https = require('https');
const { URL } = require('url');
const config = require('./config');
const store = require('./store');
const auth = require('./auth');
const models = require('./models');
const util = require('./util');

function textOf(v) {
  if (typeof v === 'string') return v;
  if (!Array.isArray(v)) return '';
  return v.filter(x => x && x.type === 'text').map(x => x.text || '').join('');
}
function toChat(body) {
  const messages = [];
  const system = textOf(body.system);
  if (system) messages.push({ role: 'system', content: system });
  for (const m of (body.messages || [])) {
    if (!m || !m.role) continue;
    if (typeof m.content === 'string') { messages.push({ role: m.role, content: m.content }); continue; }
    const blocks = Array.isArray(m.content) ? m.content : [];
    if (m.role === 'user') {
      const text = blocks.filter(b => b && b.type === 'text').map(b => b.text || '').join('');
      if (text) messages.push({ role: 'user', content: text });
      for (const b of blocks) if (b && b.type === 'tool_result') messages.push({ role: 'tool', tool_call_id: b.tool_use_id || '', content: textOf(b.content) || String(b.content || '') });
    } else if (m.role === 'assistant') {
      const out = { role: 'assistant', content: blocks.filter(b => b && b.type === 'text').map(b => b.text || '').join('') };
      const calls = blocks.filter(b => b && b.type === 'tool_use').map(b => ({ id: b.id || util.genId('call'), type: 'function', function: { name: b.name || '', arguments: JSON.stringify(b.input || {}) } }));
      if (calls.length) out.tool_calls = calls;
      messages.push(out);
    }
  }
  const chat = { model: body.model, messages, stream: true };
  if (body.max_tokens != null) chat.max_tokens = body.max_tokens;
  for (const k of ['temperature','top_p','stop','top_k']) if (body[k] !== undefined) chat[k] = body[k];
  if (Array.isArray(body.tools)) chat.tools = body.tools.map(t => ({ type:'function', function:{ name:t.name, description:t.description || '', parameters:t.input_schema || {} } }));
  if (body.tool_choice) chat.tool_choice = body.tool_choice.type === 'tool' ? { type:'function', function:{name:body.tool_choice.name} } : body.tool_choice.type;
  return chat;
}

function evt(type, data) { const p = JSON.stringify({ type, ...data }); return `event: ${type}\ndata: ${p}\n\n`; }
class Converter {
  constructor(model) { this.id = util.genId('msg'); this.model = model || 'unknown'; this.text=''; this.calls={}; this.finish='stop'; this.usage=null; this.started=false; }
  feed(line) {
    line=line.trim(); if(!line.startsWith('data:')) return '';
    let c; try { c=JSON.parse(line.slice(5).trim()); } catch { return ''; }
    let out=''; if(!this.started){out+=evt('message_start',{message:{id:this.id,type:'message',role:'assistant',content:[],model:this.model,usage:{input_tokens:0,output_tokens:0}}});this.started=true;}
    if(c.model)this.model=c.model; if(c.usage)this.usage=c.usage;
    for(const ch of (c.choices||[])){const d=ch.delta||{}; if(d.content){if(!this.text)out+=evt('content_block_start',{index:0,content_block:{type:'text',text:''}});this.text+=d.content;out+=evt('content_block_delta',{index:0,delta:{type:'text_delta',text:d.content}});} for(const t of (d.tool_calls||[])){const i=t.index||0;const fresh=!this.calls[i];const x=this.calls[i]||(this.calls[i]={id:t.id||util.genId('call'),name:'',args:''});if(t.id)x.id=t.id;if(t.function&&t.function.name)x.name=t.function.name;if(fresh)out+=evt('content_block_start',{index:i+1,content_block:{type:'tool_use',id:x.id,name:x.name,input:{}}});if(t.function&&t.function.arguments){x.args+=t.function.arguments;out+=evt('content_block_delta',{index:i+1,delta:{type:'input_json_delta',partial_json:t.function.arguments}});} } if(ch.finish_reason)this.finish=ch.finish_reason;}
    return out;
  }
  finishEvents(){let o='';if(this.text)o+=evt('content_block_stop',{index:0});for(const [i] of Object.entries(this.calls))o+=evt('content_block_stop',{index:Number(i)+1});const sr=this.finish==='tool_calls'?'tool_use':this.finish==='length'?'max_tokens':'end_turn';o+=evt('message_delta',{delta:{stop_reason:sr,stop_sequence:null},usage:{input_tokens:this.usage?.prompt_tokens||0,output_tokens:this.usage?.completion_tokens||0}})+evt('message_stop',{});return o;}
  response(){const content=[];if(this.text)content.push({type:'text',text:this.text});for(const x of Object.values(this.calls)){let input;try{input=JSON.parse(x.args||'{}')}catch{input=x.args||''}content.push({type:'tool_use',id:x.id,name:x.name,input});}return {id:this.id,type:'message',role:'assistant',content,model:this.model,stop_reason:this.finish==='tool_calls'?'tool_use':this.finish==='length'?'max_tokens':'end_turn',stop_sequence:null,usage:{input_tokens:this.usage?.prompt_tokens||0,output_tokens:this.usage?.completion_tokens||0}};}
}

async function handleMessages(req,res){
  const key=auth.verifyClientKey(req); if(!key.ok){util.sendJson(res,key.rateLimited?429:401,{error:{message:key.message,type:'authentication_error'}});return;}
  let body; try{body=JSON.parse((await util.readBody(req)).toString()||'{}')}catch(e){util.sendJson(res,400,{error:{message:'invalid JSON'}});return;}
  const chat=toChat(body); const multiplier=models.getModelMultiplier(chat.model,store.listModels()); const acct=await auth.pickAccountForRequest(auth.extractAccountKey(req,body),key.accountId||'',models.getModelRegion(chat.model,store.listModels())); const target=`${config.regionConfig(acct.region).endpoint}/v2/chat/completions`; const headers={...auth.buildAuthHeaders(acct),'Content-Type':'application/json','Accept':'text/event-stream','Accept-Encoding':'identity'}; const conv=new Converter(chat.model); const started=Date.now();
  const record=()=>store.recordUsage({source:'/v1/messages',model:chat.model||'',stream:!!body.stream,accountId:acct.id,accountName:acct.name||'',apiKeyId:key.keyId||'',apiKeyName:key.keyName||'',promptTokens:conv.usage?.prompt_tokens,completionTokens:conv.usage?.completion_tokens,totalTokens:conv.usage?.total_tokens,durationMs:Date.now()-started,status:'ok'});
  if(!body.stream){const r=await util.requestRaw(target,{method:'POST',headers,body:JSON.stringify(chat),timeoutMs:store.getRequestTimeoutMs()});for(const l of r.body.split(/\r?\n/))conv.feed(l);record();util.sendJson(res,r.status===200?200:r.status,r.status===200?conv.response():{error:{message:r.body}});return;}
  await new Promise((resolve,reject)=>{const u=new URL(target), lib=u.protocol==='https:'?https:http;const q=lib.request(u,{method:'POST',headers},up=>{res.writeHead(up.statusCode||502,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache','Access-Control-Allow-Origin':'*'});let b='';up.on('data',c=>{b+=c.toString();let m;while((m=/^(.*?)(?:\r?\n\r?\n)/s.exec(b))){b=b.slice(m[0].length);const e=conv.feed(m[1]);if(e)res.write(e);}});up.on('end',()=>{const e=conv.finishEvents();if(e)res.write(e);res.end();record();resolve();});up.on('error',reject);});q.on('error',reject);q.write(JSON.stringify(chat));q.end();});
}
async function handleCountTokens(req,res){
  const key=auth.verifyClientKey(req); if(!key.ok){util.sendJson(res,key.rateLimited?429:401,{error:{message:key.message,type:'authentication_error'}});return;}
  try { const body=JSON.parse((await util.readBody(req)).toString()||'{}'); const chat=toChat(body); const text=JSON.stringify(chat); util.sendJson(res,200,{input_tokens:Math.max(1,Math.ceil(text.length/4))}); }
  catch(e){ util.sendJson(res,400,{error:{message:'invalid JSON'}}); }
}
module.exports={handleMessages,handleCountTokens,toChat,Converter};
