'use strict';

const HARNESS_MARKERS = [
  '# AGENTS.md instructions', '<environment_context>', '<permissions instructions>',
  '<collaboration_mode>', '<skills_instructions>', '<system-reminder>',
  'You are a coding agent running in the Codex CLI', '### Available skills',
];
const AGENT_TOOLS = new Set([
  'exec_command', 'write_stdin', 'apply_patch', 'view_image',
  'request_user_input', 'create_goal', 'update_goal', 'get_goal',
  'tool_search_tool',
]);
const BASE_SYSTEM = 'You are a coding assistant serving an OpenAI-compatible CLI. Be precise, concise, safe, and action-oriented. Use available tools when needed, follow repository instructions and continue from the preserved recent context.';
const MAX_TAIL_MESSAGES = 8;
const MAX_TAIL_CHARS = 7000;

function textOf(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => textOf(item && (item.text ?? item.output ?? item))).join('');
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
function truncate(value, limit) {
  const text = textOf(value).trim();
  return text.length <= limit ? text : text.slice(0, Math.max(0, limit - 28)).trimEnd() + ' ... [truncated]';
}
function toolName(tool) {
  const fn = tool && (tool.function || tool);
  return String((fn && fn.name) || '');
}
function projectSchema(schema, depth = 0) {
  if (depth >= 6) return { type: 'object' };
  if (Array.isArray(schema)) return schema.slice(0, 6).map((item) => projectSchema(item, depth + 1));
  if (!schema || typeof schema !== 'object') return schema;
  const keep = new Set(['type','properties','required','items','enum','oneOf','anyOf','allOf','additionalProperties','format','minimum','maximum','minItems','maxItems','minLength','maxLength','nullable']);
  const out = {};
  for (const [key, value] of Object.entries(schema)) {
    if (!keep.has(key)) continue;
    if (key === 'properties' && value && typeof value === 'object') out.properties = Object.fromEntries(Object.entries(value).map(([name, item]) => [name, projectSchema(item, depth + 1)]));
    else if (key === 'items' || key === 'additionalProperties') out[key] = projectSchema(value, depth + 1);
    else if (['oneOf','anyOf','allOf'].includes(key) && Array.isArray(value)) out[key] = value.slice(0, 6).map((item) => projectSchema(item, depth + 1));
    else out[key] = value;
  }
  return Object.keys(out).length ? out : { type: 'object' };
}
function projectTools(tools) {
  return (tools || []).map((tool) => {
    if (!tool || tool.type !== 'function') return null;
    const fn = tool.function || tool;
    if (!fn.name) return null;
    const result = { type: 'function', function: { name: fn.name } };
    if (fn.parameters) result.function.parameters = projectSchema(fn.parameters);
    if (fn.strict !== undefined) result.function.strict = fn.strict;
    return result;
  }).filter(Boolean);
}
function projectMessage(message) {
  if (!message || typeof message !== 'object') return null;
  const result = { ...message };
  if (message.role === 'system') result.content = truncate(message.content, 1200);
  else if (message.role === 'user') result.content = truncate(message.content, 3200);
  else if (message.role === 'assistant') result.content = truncate(message.content, 1800);
  else if (message.role === 'tool') result.content = truncate(message.content, 1600);
  else return null;
  return result;
}
function projectBody(body) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const tools = Array.isArray(body.tools) ? body.tools : [];
  const projected = { ...body, tools: projectTools(tools) };
  const agentic = tools.some((tool) => AGENT_TOOLS.has(toolName(tool))) || messages.some((message) => HARNESS_MARKERS.some((marker) => textOf(message && message.content).includes(marker)));
  if (!agentic) {
    projected.messages = messages.map(projectMessage).filter(Boolean);
    return [projected, { mode: 'conservative', originalMessages: messages.length, projectedMessages: projected.messages.length }];
  }
  const guidance = [];
  const conversation = [];
  let dropped = 0;
  for (const message of messages) {
    const text = textOf(message.content);
    if (message.role === 'system') {
      if (HARNESS_MARKERS.some((marker) => text.includes(marker))) { dropped++; continue; }
      if (text) guidance.push(truncate(text, 1200));
      continue;
    }
    if (message.role === 'user' && HARNESS_MARKERS.some((marker) => text.includes(marker))) { dropped++; continue; }
    const item = projectMessage(message);
    if (item) conversation.push(item);
  }
  let start = Math.max(0, conversation.length - 1);
  let chars = 0;
  let kept = 0;
  for (let index = conversation.length - 1; index >= 0; index--) {
    const cost = JSON.stringify(conversation[index]).length;
    if (kept && (kept >= MAX_TAIL_MESSAGES || chars + cost > MAX_TAIL_CHARS)) break;
    start = index; chars += cost; kept++;
  }
  const needed = new Set(conversation.slice(start).filter((message) => message.role === 'tool' && message.tool_call_id).map((message) => message.tool_call_id));
  for (let index = start - 1; index >= 0 && needed.size; index--) {
    const message = conversation[index];
    if (message.role !== 'assistant') continue;
    const ids = new Set((message.tool_calls || []).map((call) => call.id));
    if ([...needed].some((id) => ids.has(id))) {
      start = index;
      for (const id of ids) needed.delete(id);
    }
  }
  const latestUser = conversation.map((message, index) => message.role === 'user' ? index : -1).reduce((a, b) => Math.max(a, b), -1);
  const anchor = latestUser >= 0 && latestUser < start ? conversation[latestUser] : null;
  const finalMessages = [{ role: 'system', content: BASE_SYSTEM }];
  if (guidance.length) finalMessages.push({ role: 'system', content: guidance.slice(0, 2).join('\n\n') });
  if (start > 0) finalMessages.push({ role: 'system', content: 'Earlier conversation summary: ' + conversation.slice(0, start).map((message) => message.role + ': ' + truncate(message.content, 180)).filter(Boolean).slice(-10).join(' | ') });
  if (anchor) finalMessages.push(anchor);
  finalMessages.push(...conversation.slice(start));
  projected.messages = finalMessages;
  return [projected, { mode: 'aggressive', aggressive: true, droppedHarnessMessages: dropped, originalMessages: messages.length, projectedMessages: finalMessages.length, originalTools: tools.length, projectedTools: projected.tools.length }];
}
module.exports = { projectBody };