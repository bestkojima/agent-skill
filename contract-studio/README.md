# Contract Studio v0.3 — React 前端 + 多语言后端 Adapter

**一个功能图、一个真实 React 页面、同一个功能契约；后端可以换语言。** 本项目不是源码架构分析器，也不是让正常软件改成逐节点执行的低代码引擎。React Flow 用于**理解、约束和验证功能**。

## 演示：反馈工单

固定流程：**React 收集 → 字段校验 → 异步查重 → 保存 → React 页面反馈**。在顶部选择后端语言，只有“字段校验”节点通过选中语言的**真实进程**运行；其他业务节点继续使用现有 Node.js 实现。这能验证：功能图和 React 页面不变，只替换一个后端实现。

- **JS、TS、Python、Go、Java、C++、PHP**：包含完整示例，已在开发环境执行契约测试。
- **Rust、C#/.NET**：包含适配器源码与配置，需要本机安装 Cargo 或 .NET 8 SDK；当前交付环境未具备相应工具链，因此**未做运行验证**。Rust 首次安装依赖可在 `server/adapters/impl/rust` 内执行 `cargo fetch`；演示运行时只允许 `cargo build --offline`。
- 缺少工具链时 UI 会把相应语言标为不可选；缺少依赖 / 编译失败会给出错误，**不会伪造测试通过**。

## 快速开始

Node.js >= 20.19，建议 22.x。

```bash
npm install
npm run dev
# http://localhost:5173
```

启动后顶部选择 Python、C++ 或 Go，再在真实 React 表单点击“提交 → 观察节点流”，最后选择「字段校验」节点查看对应语言的输入、输出、调用耗时与源码。首次使用编译型语言会编译，后续重复调用复用生成的可执行程序。其他节点仍保持 Node.js。

```bash
npm run verify          # 全套自动测试 + JSON 契约检查
npm run test:adapters   # 多语言一致性与 HTTP API 测试
npm run build           # React + TypeScript 构建（需安装 npm 依赖）
```

## 测试模式

| 模式 | 功能 | 副作用 |
|---|---|---|
| Mock | 返回预设样例，不调用所选语言 | 无 |
| Dry-run | **真正调用语言 Adapter** 执行纯校验及安全的业务步骤 | 本演示不写入 |
| Sandbox | 真正调用 Adapter；反馈保存仅写入当前演示进程的内存 | 仅内存，重启可重置 |

**重要：** `Dry-run` 的无写入保证只对当前这个纯计算示例成立。新增第三方 Adapter 时，仅传 `mode=dry-run` **不能**强制阻止进程访问文件或网络。不得运行不受信任的可执行文件；真实的任意语言运行器需要操作系统级沙箱、权限限制、资源配额及审计。此项目的 Adapter 只允许调用 `server/adapters/index.mjs` 内固定的已登记命令，不能通过前端 JSON 配置 Shell 命令。

## 分层职责

```text
React Flow Editor (Graph / Inspector / Preview)
              │ HTTP
              ▼
Node.js 演示 API  ── Contract JSON (用户功能层)
              │
              ▼
Adapter Registry (明确的能力白名单)
              │ JSON stdin → JSON stdout
   ┌──────────┼──────────────────────────┐
 Node/TS    Python    Go  Java  C++  PHP  Rust  C#
   └──────────┴──────────────────────────┘
              │
              ▼
      同一种 FeedbackValidationResult
```

**不是所有节点都由 Adapter 运行。** UI 节点在 React，查重/保存仍在 Node.js；只替换验证节点的后端以证明跨语言能力。未来可以把独立功能绑定到其它 Adapter，节点图的业务语义无须改变。

## 一份代码协议

当前唯一演示能力 `feedback.validate`：

- 输入 JSON（stdin）：`{"title":"新增暗色主题","category":"feature","detail":"想要切换夜间模式"}`
- 成功输出 JSON（stdout）：`{"status":"valid","input":{"title":"新增暗色主题","category":"feature","detail":"想要切换夜间模式"}}`
- 失败输出 JSON（stdout）：`{"status":"invalid","code":"INVALID_TITLE","message":"标题需为 3–60 字。"}`
- 每个调用为独立进程，JSON 输入尺寸受限；stdout 必须是一份合法 JSON，stderr 用于诊断日志，退出码非 0、超时或契约不匹配都显示为**失败**。

这里的 C++ 和 Java 为不依赖额外 JSON 库的**平面字符串表单示例解析器**；要支持任意嵌套业务 JSON，应分别使用 `nlohmann/json`、Jackson 等正式 JSON 库。每个语言后端都有自己的实现，不强迫它们共享相同源码，但共享相同**输入输出契约与一致性测试**。

## 项目结构

```text
contracts/feedback.json              功能图（schema v2，验证节点带 adapter 能力引用）
src/App.tsx                         React Flow + 真实表单 + Adapter 选择 + 检查器
server/domain.mjs                   反馈业务流程：支持注入验证函数
server/api.mjs                      本地受控 API + 代码段展示
server/adapters/index.mjs           Adapter 注册表、构建、启动、超时、输出验证
server/adapters/impl/              各语言实际实现示例
tests/domain.test.mjs               原有 11 个业务行为测试
tests/adapters.test.mjs             Adapter 契约一致性与 HTTP 测试
.agents/skills/contract-studio/SKILL.md      给 Codex / 其他 Coding Agent 的约束
```

`server/adapters/_build/` 是运行时编译缓存，已从压缩包和 Git 跟踪中排除。

## 给新语言增加 Adapter 的最短流程

1. 实现一个接受 stdin JSON、返回 stdout JSON 的纯函数命令，错误写 stderr，非零退出码表示执行失败。
2. 在 `server/adapters/index.mjs` 白名单注册 `id`、工具链、源文件和固定的启动/编译命令，不接受来自网页的任意命令。
3. 将新语言加入 `npm run test:adapters` 的一致性测试；对 UI 提供同一个能力名称 `feedback.validate`。
4. 在 `contracts/feedback.json` 的相应节点保持该 `capability` 不变，由 Registry 选择执行语言，避免重复维护不同的功能图。

## 真实执行、代码证据与隐私边界

- Node Runner 返回实际输入/输出、耗时、错误；节点图据此高亮已运行路径。React 本身负责实际交互预览。
- `GET /api/code?nodeId=validate&language=cpp` 返回**允许公开的示例实现文件**，并不提供任意路径读取；正式开发可换成 LSP 符号定位。
- 编辑器节点可以新增并配置，但**未经在受信任 Registry 注册的节点无法执行**，不存在“画个节点就自动有能力”。
- 示例数据仅存在浏览器 localStorage 或进程内存；不连接云端模型、账号和数据库。默认不开启对外执行权限。
- React 浏览器构建和跨端兼容仍需在装好 npm 依赖后验证；不能把 Node 测试通过等同于前端 E2E 验证。
