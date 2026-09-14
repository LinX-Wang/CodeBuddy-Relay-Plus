'use strict';

/**
 * 模型目录与 /v1/models 响应。
 *
 * 内置目录（MODEL_CATALOG）逆向自腾讯云 CodeBuddy 插件
 * tencent-cloud.coding-copilot 的 product.json / product.external.json，
 * 并补充 webview 静态数组中腾讯 token 套餐（tencent-token-plan / -pro / -lite /
 * -hy、tencent-coding、glm-coding、kimi-cn、minimax-cn、deepseek）下的国内模型。
 * 字段映射：supportsToolCall -> tools, supportsImages -> vision,
 *           maxInputTokens / maxOutputTokens 原样保留, supportsReasoning -> reasoning。
 *
 * 国内与国际模型分开标记 region；该字段会用于选择对应区域账号。
 *
 * 用户可在管理页新增的自定义模型存储于 SQLite（见 store.js），
 * 通过 allModels() 与内置目录合并后对外暴露。
 */

/** 内置默认模型目录（逆向自插件，仅国内模型） */
const MODEL_CATALOG = [
  // —— 默认 / 腾讯 coding ——
  { id: 'default', name: 'Default（自动）', maxInputTokens: 168000, maxOutputTokens: 32000, tools: true, vision: false, reasoning: false, region: 'cn', isDefault: true },
  { id: 'tc-code-latest', name: 'Auto（腾讯 coding）', maxInputTokens: 168000, maxOutputTokens: 32000, tools: true, vision: false, reasoning: true, region: 'cn' },
  { id: 'hunyuan-2.0-instruct', name: 'Tencent HY 2.0 Instruct', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, region: 'cn' },
  { id: 'hunyuan-2.0-thinking', name: 'Tencent HY 2.0 Think', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, reasoning: true, region: 'cn' },
  { id: 'hunyuan-t1', name: 'Hunyuan-T1', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, reasoning: true, region: 'cn' },
  { id: 'hunyuan-turbos', name: 'Hunyuan-TurboS', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, region: 'cn' },
  // —— GLM ——
  { id: 'glm-5', name: 'GLM-5', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, reasoning: true, region: 'cn' },
  { id: 'glm-5.1', name: 'GLM-5.1', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, reasoning: true, region: 'cn' },
  { id: 'glm-5-turbo', name: 'GLM-5-Turbo', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, reasoning: true, region: 'cn' },
  { id: 'glm-5.2', name: 'GLM-5.2', maxInputTokens: 1000000, maxOutputTokens: 131072, tools: true, vision: false, reasoning: true, region: 'cn' },
  { id: 'glm-4.7', name: 'GLM-4.7', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, region: 'cn' },
  { id: 'glm-4.6v', name: 'GLM-4.6V', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: true, region: 'cn' },
  { id: 'glm-5v-turbo', name: 'GLM-5v-Turbo', maxInputTokens: 200000, maxOutputTokens: 64000, tools: true, vision: false, reasoning: true, onlyReasoning: true, region: 'cn' },
  { id: 'glm-5.3', name: 'GLM-5.3', maxInputTokens: 1000000, maxOutputTokens: 48000, tools: true, vision: true, reasoning: true, onlyReasoning: true, region: 'cn' },
  { id: 'glm-5.3-flash', name: 'GLM-5.3-Flash', maxInputTokens: 1000000, maxOutputTokens: 32000, tools: true, vision: true, reasoning: true, onlyReasoning: true, region: 'cn' },
  { id: 'glm-5.0-turbo', name: 'GLM-5.0-Turbo', maxInputTokens: 200000, maxOutputTokens: 48000, tools: true, vision: true, reasoning: true, onlyReasoning: true, region: 'cn' },
  // —— Kimi ——
  { id: 'kimi-k2.5', name: 'Kimi-K2.5', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: true, reasoning: true, region: 'cn' },
  { id: 'kimi-k2.6', name: 'Kimi-K2.6', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: true, reasoning: true, region: 'cn' },
  { id: 'kimi-k2.7', name: 'Kimi-K2.7-Code', maxInputTokens: 256000, maxOutputTokens: 32000, tools: true, vision: true, reasoning: true, onlyReasoning: true, region: 'cn' },
  { id: 'kimi-k2.8-preview', name: 'Kimi-K2.8-Preview', maxInputTokens: 1000000, maxOutputTokens: 32000, tools: true, vision: true, reasoning: true, onlyReasoning: true, region: 'cn' },
  { id: 'kimi-k3-1', name: 'Kimi-K3', maxInputTokens: 1000000, maxOutputTokens: 32000, tools: true, vision: true, reasoning: true, onlyReasoning: true, region: 'cn' },
  { id: 'kimi-k2-thinking', name: 'Kimi-K2-Thinking', maxInputTokens: 256000, maxOutputTokens: 32000, tools: true, vision: true, reasoning: true, onlyReasoning: true, region: 'cn' },
  { id: 'kimi-k2-0905-preview', name: 'Kimi-K2-0905-Preview', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, region: 'cn' },
  { id: 'kimi-k2-turbo-preview', name: 'Kimi-K2-Turbo-Preview', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, region: 'cn' },
  { id: 'kimi-k2-instruct-taiji', name: 'Kimi-K2', maxInputTokens: 31000, maxOutputTokens: 8192, tools: true, vision: false, region: 'cn' },
  // —— MiniMax ——
  { id: 'minimax-m2.5', name: 'MiniMax-M2.5', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, reasoning: true, region: 'cn' },
  { id: 'minimax-m2.7', name: 'MiniMax-M2.7', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, reasoning: true, region: 'cn' },
  { id: 'minimax-m3', name: 'MiniMax-M3', maxInputTokens: 1000000, maxOutputTokens: 524288, tools: true, vision: true, reasoning: true, region: 'cn' },
  { id: 'minimax-m2.5-highspeed', name: 'MiniMax-M2.5-Highspeed', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, region: 'cn' },
  { id: 'minimax-m2.1', name: 'MiniMax-M2.1', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, region: 'cn' },
  { id: 'minimax-m2.1-highspeed', name: 'MiniMax-M2.1-Highspeed', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, region: 'cn' },
  { id: 'minimax-m2', name: 'MiniMax-M2', maxInputTokens: 0, maxOutputTokens: 0, tools: true, vision: false, region: 'cn' },
  // —— DeepSeek ——
  { id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash', maxInputTokens: 1000000, maxOutputTokens: 128000, tools: true, vision: false, reasoning: true, onlyReasoning: true, region: 'cn' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro', maxInputTokens: 1000000, maxOutputTokens: 128000, tools: true, vision: false, reasoning: true, region: 'cn' },
  { id: 'deepseek-v4.1-flash', name: 'DeepSeek-V4.1-Flash', maxInputTokens: 1000000, maxOutputTokens: 128000, tools: true, vision: true, reasoning: true, onlyReasoning: true, region: 'cn' },
  { id: 'deepseek-v4-flash-202605', name: 'DeepSeek-V4-Flash 原厂直供', maxInputTokens: 1000000, maxOutputTokens: 384000, tools: true, vision: false, reasoning: true, region: 'cn' },
  { id: 'deepseek-v4-pro-202606', name: 'DeepSeek-V4-Pro 原厂直供', maxInputTokens: 1000000, maxOutputTokens: 384000, tools: true, vision: false, reasoning: true, region: 'cn' },
  // —— 混元 / 补全类 ——
  { id: 'hy3', name: 'Hy3', maxInputTokens: 192000, maxOutputTokens: 64000, tools: true, vision: false, reasoning: true, onlyReasoning: true, region: 'cn' },
  { id: 'hy3-preview', name: 'Hy3 preview', maxInputTokens: 192000, maxOutputTokens: 64000, tools: true, vision: false, reasoning: true, region: 'cn' },
  { id: 'hunyuan-turbos-vision', name: 'Hunyuan Turbo Vision', maxInputTokens: 16000, maxOutputTokens: 16000, tools: true, vision: true, region: 'cn' },
  { id: 'hunyuan-t1-vision', name: 'Hunyuan T1 Vision', maxInputTokens: 16000, maxOutputTokens: 24000, tools: true, vision: true, region: 'cn' },
  { id: 'hunyuan-3b', name: 'Hunyuan-3B', maxInputTokens: 0, maxOutputTokens: 256, tools: false, vision: false, region: 'cn' },
  { id: 'hunyuan-7b-dense', name: 'Hunyuan-7B', maxInputTokens: 0, maxOutputTokens: 256, tools: false, vision: false, region: 'cn' },
  // —— 其它补全 / 通用 ——
  { id: 'chat-1.0', name: 'Chat-1.0', maxInputTokens: 0, maxOutputTokens: 32000, tools: true, vision: false, region: 'cn' },
  { id: 'enhance-1.0', name: 'Enhance-1.0', maxInputTokens: 0, maxOutputTokens: 32000, tools: true, vision: false, region: 'cn' },
  { id: 'auto-chat', name: 'Auto Chat', maxInputTokens: 32000, maxOutputTokens: 8192, tools: true, vision: false, region: 'cn' },
  { id: 'completion-gf', name: 'Completion-GF', maxInputTokens: 200000, maxOutputTokens: 8192, tools: true, vision: false, region: 'cn' },
  { id: 'completion-1.0', name: 'Completion-1.0', maxInputTokens: 0, maxOutputTokens: 256, tools: false, vision: false, region: 'cn' },
  { id: 'completion-1.2', name: 'Completion-1.2', maxInputTokens: 0, maxOutputTokens: 256, tools: false, vision: false, region: 'cn' },
  { id: 'nes-1.0', name: 'NES-1.0', maxInputTokens: 0, maxOutputTokens: 256, tools: false, vision: false, region: 'cn' },
  { id: 'nes-1.1', name: 'NES-1.1', maxInputTokens: 0, maxOutputTokens: 8192, tools: false, vision: false, region: 'cn' },
  { id: 'nes-1.2', name: 'NES-1.2', maxInputTokens: 0, maxOutputTokens: 32000, tools: true, vision: true, region: 'cn' },
  { id: 'nes-v1-14b', name: 'NES-V1-14B', maxInputTokens: 0, maxOutputTokens: 8192, tools: false, vision: false, region: 'cn' },
  { id: 'codewise-navi-v1-2-taco', name: 'Codewise-Navi-V1-2-Taco', maxInputTokens: 0, maxOutputTokens: 256, tools: false, vision: false, region: 'cn' },
  // —— 国际版（CodeBuddy.ai）——
  { id: 'auto', name: 'Auto', multiplier: 0.79, tools: true, region: 'intl' },
  { id: 'fast', name: 'Fast', multiplier: 0.34, tools: true, region: 'intl' },
  { id: 'balanced', name: 'Balanced', multiplier: 0.59, tools: true, region: 'intl' },
  { id: 'primary', name: 'Primary', multiplier: 3.31, tools: true, reasoning: true, region: 'intl' },
  { id: 'deep', name: 'Deep', multiplier: 3.33, tools: true, reasoning: true, region: 'intl' },
  { id: 'hy4-preview', name: 'Hy4 preview', multiplier: 0, tools: true, reasoning: true, region: 'intl' },
  { id: 'gpt-5.6-sol', name: 'GPT-5.6-Sol', multiplier: 3.47, tools: true, reasoning: true, region: 'intl' },
  { id: 'gpt-5.6-terra', name: 'GPT-5.6-Terra', multiplier: 1.39, tools: true, reasoning: true, region: 'intl' },
  { id: 'gpt-5.6-luna', name: 'GPT-5.6-Luna', multiplier: 0.14, tools: true, reasoning: true, region: 'intl' },
  { id: 'gpt-5.5', name: 'GPT-5.5', multiplier: 3.31, tools: true, reasoning: true, region: 'intl' },
  { id: 'gpt-5.4', name: 'GPT-5.4', multiplier: 1.65, tools: true, reasoning: true, region: 'intl' },
  { id: 'gpt-5.3-codex', name: 'GPT-5.3-Codex', multiplier: 1.25, tools: true, reasoning: true, region: 'intl' },
  { id: 'gemini-3.5-flash', name: 'Gemini-3.5-Flash', multiplier: 0.99, tools: true, region: 'intl' },
  { id: 'glm-5.3-intl', name: 'GLM-5.3', multiplier: 0.79, tools: true, reasoning: true, region: 'intl' },
  { id: 'glm-5.2-intl', name: 'GLM-5.2', multiplier: 0.79, tools: true, reasoning: true, region: 'intl' },
  { id: 'kimi-k3-intl', name: 'Kimi-K3', multiplier: 1.62, tools: true, region: 'intl' },
  { id: 'kimi-k2.6-intl', name: 'Kimi-K2.6', multiplier: 0.52, tools: true, region: 'intl' },
  // 页面菜单对应的原始 ID 别名（用于客户端直接填写）
  { id: 'kimi-k3', name: 'Kimi-K3', multiplier: 1.62, tools: true, region: 'intl' },
  { id: 'kimi-k2.6', name: 'Kimi-K2.6', multiplier: 0.52, tools: true, region: 'intl' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', maxInputTokens: 200000, maxOutputTokens: 8192, tools: true, vision: true, region: 'intl' },
  { id: 'gpt-5-mini', name: 'GPT-5 mini', maxInputTokens: 400000, maxOutputTokens: 128000, tools: true, vision: true, reasoning: true, region: 'intl' },
  { id: 'gpt-4.1', name: 'GPT-4.1', maxInputTokens: 1048576, maxOutputTokens: 32768, tools: true, vision: true, region: 'intl' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', maxInputTokens: 1048576, maxOutputTokens: 65536, tools: true, vision: true, reasoning: true, region: 'intl' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', maxInputTokens: 1048576, maxOutputTokens: 65536, tools: true, vision: true, reasoning: true, region: 'intl' },
  { id: 'kimi-intl', name: 'Kimi (International)', maxInputTokens: 256000, maxOutputTokens: 32000, tools: true, vision: true, reasoning: true, region: 'intl' },
  { id: 'minimax-intl', name: 'MiniMax (International)', maxInputTokens: 200000, maxOutputTokens: 32000, tools: true, vision: true, reasoning: true, region: 'intl' },
];

/**
 * 把内置目录与数据库中的自定义模型合并（自定义模型覆盖同 id 内置项）。
 * hiddenIds：被隐藏的模型 id 集合（含内置与自定义）。被隐藏的模型标记 hidden:true，
 * 并按稳定顺序排到列表末尾（其余模型保持原顺序）。
 *
 * /api/* 管理接口返回全部（含 hidden 标记）；/v1/models 与 /models 通过
 * modelsResponse() 过滤掉 hidden 项后再对外返回。
 */
function allModels(customModels, hiddenIds) {
  const custom = customModels || [];
  const hidden = new Set(Array.isArray(hiddenIds) ? hiddenIds : []);
  const byId = new Map();
  for (const m of MODEL_CATALOG) byId.set(m.id, { ...m, builtin: true });
  for (const m of custom) byId.set(m.id, { ...m, builtin: false });
  const intlIds = new Set(['auto','fast','balanced','primary','deep','hy4-preview','hy3','gpt-5.6-sol','gpt-5.6-terra','gpt-5.6-luna','gpt-5.5','gpt-5.4','gpt-5.3-codex','gemini-3.5-flash','glm-5.3-intl','glm-5.2-intl','kimi-k3-intl','kimi-k2.6-intl','kimi-k3']);
  const list = Array.from(byId.values()).filter((m) => m.region !== 'intl' || intlIds.has(m.id)).map((m) => ({
    ...m,
    hidden: hidden.has(m.id),
  }));
  // 稳定排序：仅把 hidden 项移到末尾，不改变其它项的原始相对顺序
  const visible = list.filter((m) => !m.hidden);
  const hiddenList = list.filter((m) => m.hidden);
  return visible.concat(hiddenList);
}

function modelsResponse(customModels, hiddenIds, region) {
  const now = Math.floor(Date.now() / 1000);
  const data = allModels(customModels, hiddenIds)
    .filter((m) => !m.hidden && (!region || m.region === region))
    .map((m) => ({
      id: m.id, object: 'model', created: now, owned_by: 'codebuddy',
      name: m.name, is_default: !!m.isDefault, region: m.region || 'cn',
    }));
  return { object: 'list', data };
}

function getModelRegion(modelId, customModels) {
  const model = allModels(customModels || [], []).find((item) => item.id === modelId);
  // default 是上游的自动路由模型：让账号池/固定账号决定区域，避免国际账号被误拦。
  if (model && model.isDefault) return null;
  if (model && model.region) return model.region;
  // 兼容用户直接填写上游国际模型 ID（目录更新前也能正确选账号）。
  const id = String(modelId || '').toLowerCase();
  if (/^(claude|gpt-|o[1-9]|gemini|kimi-intl|minimax-intl|llama|mistral)/.test(id)) return 'intl';
  return 'cn';
}

function getModelMultiplier(modelId, customModels) {
  const m = allModels(customModels || [], []).find((item) => item.id === modelId);
  const n = m && Number(m.multiplier);
  // 国内模型目录通常不公开倍率；未知时仅使用兜底计费系数，UI 不显示为真实倍率。
  return Number.isFinite(n) && n >= 0 ? n : 0.001;
}

module.exports = { MODEL_CATALOG, allModels, modelsResponse, getModelRegion, getModelMultiplier };
