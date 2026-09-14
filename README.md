# CodeBuddy Relay Plus

一个面向 CodeBuddy 的本地代理服务：保留上游原生透传链路，同时提供 OpenAI 兼容接口、Responses API 和可视化管理页。项目默认只监听本机 `127.0.0.1`，适合个人开发工具接入。

> 本项目是基于 [MrWhatHuang/CodeBuddy-API-Proxy](https://github.com/MrWhatHuang/CodeBuddy-API-Proxy) 修改的衍生项目，并参考了 [ShouZhuo0413/codebuddy2api](https://github.com/ShouZhuo0413/codebuddy2api) 的透传与兼容思路。完整致谢见 [NOTICE.md](NOTICE.md)。

## 功能

- 国内版 `copilot.tencent.com` 与国际版 `www.codebuddy.ai` 双区域。
- 管理页内置 OAuth 登录、账号池、账号刷新、签到和积分查询。
- 支持多账号轮询、指定账号及 API 密钥绑定账号。
- 支持原生上游流式链路、`/v1/responses`、`/v1/chat/completions`、`/v1/completions`、`/v1/embeddings`。
- 支持 Anthropic Messages 原生协议 `/v1/messages`，兼容 Claude Code、CC Switch 等客户端。
- 支持文本、图片、音频、文件、多轮工具调用和函数参数增量事件。
- 支持 Codex CLI、Cursor、Continue、OpenAI SDK、Claude Code/CC Switch 等客户端的协议接入。
- 管理页提供总览、Token 趋势、账号、模型、API 密钥、用量、日志和系统设置。
- 支持强制简体中文输出、模型自动选择、请求背压、断开清理和不完整流检测。

## 相对主体项目的修改

1. 增加国内/国际区域模型、账号、OAuth、刷新、签到和积分的完整隔离。
2. 增加模型目录扩展、上游模型探测和按区域自动选择账号。
3. 增加多账号池、API 密钥绑定、账号维度与密钥维度用量统计。
4. 增加原生 Responses 请求处理与长上下文压缩投影，减少请求过大和中途停止。
5. 增强多模态输入、developer/system 消息、assistant tool call 和更多参数透传。
6. 增强 SSE 解析、换行兼容、`[DONE]` 识别、错误事件、输出索引和函数参数增量。
7. 客户端断开时主动销毁上游请求，并过滤 hop-by-hop 头、增加流式背压处理。
8. 增加管理页 Token 趋势、用量明细、CSV 导出、API 密钥和自动签到配置。
9. 增加简体中文强制开关，可由管理页或 `CODEBUDDY_FORCE_CHINESE` 设置。
10. 重做 Windows 启动、停止、重启脚本，Node 进程后台运行，双击后不保留命令行窗口。

## 环境要求

- Windows、macOS 或 Linux。
- Node.js `>=22.5.0`，因为服务端使用 Node 内置 `node:sqlite`。
- 一个可正常登录的 CodeBuddy 账号。

## 安装与启动

```bash
npm install
npm run build
npm start
```

启动后访问：`http://127.0.0.1:3800/home`

Windows 用户也可以双击桌面目录 `D:\DeskTop\CodeBuddy-Relay-Plus\start-proxy.cmd`。停止使用 `stop-proxy.cmd`，重启使用 `restart-proxy.cmd`。这些脚本会调用 `D:\program\CodeBuddy-Relay-Plus`，并将 Node 进程隐藏运行。

## 管理页使用

1. 打开 `/home` 查看服务状态、Token 趋势和接口地址。
2. 打开「账号管理」→「添加账号」，在浏览器完成 OAuth 登录。
3. 可重复添加多个账号，在账号池设置中选择轮询或指定账号。
4. 打开「模型」页查看国内/国际模型和上游探测结果。
5. 打开「API 密钥」页新建密钥；启用校验后，客户端必须携带 `Authorization: Bearer 你的密钥`。
6. 在「系统设置」中调整默认模型、强制模型、超时、日志、自动打开管理页和强制中文。

右上角可以切换中文/英文及浅色/深色主题；语言和主题只保存在浏览器本地。外置微软 Edge 的访问地址与其他浏览器相同。

## 客户端配置

将客户端 Base URL 设置为 `http://127.0.0.1:3800/v1`。

- Chat Completions：调用 `POST /v1/chat/completions`。
- Responses / Codex CLI：调用 `POST /v1/responses`，保留原生 Responses 流式事件、工具调用和多轮上下文适配。
- Anthropic / Claude Code：调用 `POST /v1/messages`，服务端转换为上游 Chat 请求并返回 Anthropic Message/SSE 事件。
- 其他兼容接口：`/v1/completions`、`/v1/embeddings`、`/v1/models`。

使用 API 密钥时添加：`Authorization: Bearer 你的密钥`。

Claude Code / Anthropic 客户端可直接使用原生 Messages 协议：Base URL 填 `http://127.0.0.1:3800`（不要附加 `/v1`），客户端会请求 `/v1/messages`；API Key 使用管理页创建的密钥。`/v1/messages/count_tokens` 也已提供本地估算接口。

## 中文输出

默认开启强制简体中文，会约束可见回答、分析说明和工具说明使用中文。可在管理页设置，或设置环境变量：

```text
CODEBUDDY_FORCE_CHINESE=true
```

设置为 `false` 可关闭，修改后需要重启服务。该设置不能保证上游模型在所有场景下绝对不输出英文，但会对系统指令和可见输出进行统一约束。

## 配置项

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` / `CODEBUDDY_PROXY_PORT` | `3800` | 监听端口 |
| `HOST` / `CODEBUDDY_PROXY_HOST` | `127.0.0.1` | 监听地址 |
| `CODEBUDDY_ENDPOINT` | `https://copilot.tencent.com` | 默认上游区域 |
| `CODEBUDDY_DATA_DIR` | `~/.codebuddy-proxy` | 数据目录 |
| `CODEBUDDY_SESSION_FILE` | `~/.codebuddy-proxy/session.json` | 会话文件 |
| `CODEBUDDY_DB_FILE` | `~/.codebuddy-proxy/proxy.db` | SQLite 数据库 |
| `CODEBUDDY_DEFAULT_MODEL` | `default` | 缺省模型 |
| `CODEBUDDY_FORCE_MODEL` | 空 | 强制替换请求模型 |
| `CODEBUDDY_FORCE_CHINESE` | `true` | 是否强制简体中文 |
| `CODEBUDDY_API_KEY` | 空 | 兼容旧版的单个 API 密钥 |
| `CODEBUDDY_NO_OPEN` | 空 | 设置后禁止自动打开管理页 |
| `CODEBUDDY_ADMIN_USERNAME` | `admin` | 管理页用户名 |
| `CODEBUDDY_ADMIN_PASSWORD` | 空 | 管理页初始密码 |

国际版可以设置 `CODEBUDDY_ENDPOINT=https://www.codebuddy.ai`，账号区域仍建议在管理页分别维护。

## 数据与发布安全

运行数据默认保存在用户目录 `~/.codebuddy-proxy/`，包括 `session.json`、`proxy.db` 和日志。它们可能包含 access token、refresh token、账号标识、请求摘要和用量数据，**不要上传 GitHub**。

本仓库源码版通过 `.gitignore` 排除环境文件、数据库、会话文件、日志、`node_modules` 和 `dist`。发布版不包含任何当前账号、Token、数据库或运行日志；首次使用时请在本机重新登录。

## 许可证与免责声明

本项目采用 MIT License。原始主体来源的版权声明保留在 `LICENSE`；参考来源及作者致谢见 `NOTICE.md`。本项目不是腾讯、CodeBuddy、OpenAI、Anthropic 或上述 GitHub 项目的官方产品。请自行确认服务条款、账号授权、模型使用权限和当地法律要求。
