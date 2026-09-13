'use strict';

const CHINESE_INSTRUCTION = '请始终使用简体中文回答。所有面向用户的说明、分析、进度说明以及工具调用前后的可见解释都必须使用中文。除代码、命令、文件路径、API 名称和必要的技术术语外，不要输出完整英文句子。';

function applyChineseInstruction(payload, enabled) {
  if (!enabled || !payload || !Array.isArray(payload.messages)) return payload;
  const messages = payload.messages;
  const existing = messages.find((message) => message && message.role === 'system');
  if (existing) {
    if (typeof existing.content === 'string') {
      if (!existing.content.includes(CHINESE_INSTRUCTION)) {
        existing.content = `${CHINESE_INSTRUCTION}\n${existing.content}`.trim();
      }
    } else if (Array.isArray(existing.content)) {
      const hasInstruction = existing.content.some((part) => part && part.type === 'text' && part.text === CHINESE_INSTRUCTION);
      if (!hasInstruction) existing.content.unshift({ type: 'text', text: CHINESE_INSTRUCTION });
    } else if (existing.content == null) {
      existing.content = CHINESE_INSTRUCTION;
    }
  } else {
    messages.unshift({ role: 'system', content: CHINESE_INSTRUCTION });
  }
  return payload;
}

module.exports = { CHINESE_INSTRUCTION, applyChineseInstruction };
