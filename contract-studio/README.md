# Contract Studio — 功能图与需求追踪

用 React Flow 把用户需求、功能节点、源码和测试放到同一张工作台里。每条需求有稳定 ID、草稿或确认状态；代码和测试使用相同 ID 建立可追踪的引用。项目保留多语言 Adapter 演示。

## 从需求找到代码

1. 在项目目录运行 `npm install`、`npm run dev`，打开本机页面。
2. 选择一个功能节点，在右侧查看、修改需求描述；用户确认后点击确认。需求内容变更会退回草稿，需重新确认。
3. 同一面板列出带 `@need-ids` 标记的代码和测试；点击引用可以查看项目内相应位置的源码片段。一个需求可以关联多个位置。
4. 对新增功能节点，创建需求并使用其 ID 在真实代码和测试中添加标记。点击“保存到项目”将画布同步到项目；新画出的节点需要另行实现和绑定，画图本身不会修改业务执行流程。

`contracts/requirements.json` 是需求和确认状态的唯一权威来源；`contracts/feedback.json` 保存项目功能图。画布编辑先保存在浏览器本地，点击“保存到项目”后写入项目图；JSON 导入、导出仍可用于交换草稿。保存时如果项目图已被其他操作修改，工作台会提示冲突，避免直接覆盖。当前演示每个节点关联一条需求。

`traceability/requirements.rst` 由需求和已保存的项目图生成，工作台保存时自动同步；若在工作台外修改源文件，可运行 `node scripts/export-needs.mjs` 重建。需求确认针对当前标题和描述；确认本身不代表功能图、代码或测试已验证，修改图也不会自动撤销需求确认。

工作台的代码列表由本项目的本地扫描器读取标记生成；这表示找到了引用位置，并不代表测试通过。现阶段默认展示的六条需求都是草稿，等待真实用户确认。

### Sphinx-Needs、CodeLinks 和 ubCode

`traceability/` 带有 Sphinx-Needs 和 Sphinx-CodeLinks 的配置。安装 [uv](https://docs.astral.sh/uv/) 后，在本项目目录可运行：

```bash
uv run --python 3.12 --with sphinx --with sphinx-needs --with sphinx-codelinks sphinx-build -W -b needs traceability traceability/_build/needs
```

该命令实际使用 Sphinx-Needs 和 Sphinx-CodeLinks 生成 `traceability/_build/needs/needs.json`；构建输出不纳入 Git。导出中，需求为 `req`，功能节点为 `spec`；`fulfills` 连接需求，`contains` 表示包含，`flows_to` 表示业务后继。原始边的端口和分支标签保留在节点内容中，`flows_to` 本身只表达后继关系，不自动形成带分支标签的执行图。

示例中的 Java、PHP 标记可由工作台本地扫描器读取，但不包含在目前配置的 Sphinx-CodeLinks 构建结果中。`traceability/ubproject.toml` 提供兼容配置，可供自备 ubCode 的用户使用。ubCode 为闭源工具，私有或商业项目需确认适用许可；本工作台不依赖它运行，也不会把本地扫描结果说成 ubCode 的结果。参见 [ubCode 许可说明](https://ubcode.useblocks.com/usage/ublicense.html)。

## 演示：反馈工单

固定流程：**React 收集 → 字段校验 → 异步查重 → 保存 → React 页面反馈**。在顶部选择后端语言，只有“字段校验”节点通过选中语言的**真实进程**运行；其他业务节点继续使用现有 Node.js 实现。这能验证：功能图和 React 页面不变，只替换一个后端实现。

- **JS、TS、Python、Go、Java、C++、PHP**：包含完整示例；原始文件包记录了在其开发环境执行契约测试的结果。
- **Rust、C#/.NET**：包含适配器源码与配置，需要本机安装 Cargo 或 .NET 8 SDK；原始交付记录未验证这两种语言，本次改动也未专门运行它们。Rust 首次安装依赖可在 `server/adapters/impl/rust` 内执行 `cargo fetch`；演示运行时只允许 `cargo build --offline`。
- 缺少工具链时 UI 会把相应语言标为不可选；缺少依赖 / 编译失败会给出错误，**不会伪造测试通过**。

## 快速开始

Node.js >= 20.19，建议 22.x。

```bash
npm install
npm run dev
# http://localhost:5173
```

开发和预览命令会监听所有网卡。只供本机使用时可执行 `npm run dev -- --host 127.0.0.1`；原有演示 API 没有访问认证，不要在不可信网络中开放。新增需求修改接口只接受本机同源请求。

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
contracts/requirements.json          需求、确认状态与功能节点的关联
traceability/                        派生的 Sphinx-Needs 文档和工具配置
server/traceability.mjs             需求保存、标记扫描与受限源码读取
src/App.tsx                         React Flow + 真实表单 + Adapter 选择 + 检查器
server/domain.mjs                   反馈业务流程：支持注入验证函数
server/api.mjs                      本地受控 API + 代码段展示
server/adapters/index.mjs           Adapter 注册表、构建、启动、超时、输出验证
server/adapters/impl/              各语言实际实现示例
tests/domain.test.mjs               原有 11 个业务行为测试
tests/adapters.test.mjs             Adapter 契约一致性与 HTTP 测试
tests/traceability.test.mjs         需求、项目图保存和追踪边界测试
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
- 画布编辑保存在浏览器 localStorage，反馈数据保存在进程内存；需求及确认状态写入本项目的 `contracts/requirements.json`。项目不连接云端模型、账号和数据库。
- Node 测试通过不等于前端浏览器或跨端兼容验证通过。
