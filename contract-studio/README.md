# Contract Studio — 节点驱动开发框架

框架提供功能图、节点属性、需求索引、实现绑定和测试证据；精简 Skill 指导 Agent 在这些能力中完成开发。计算器与反馈工单用于演示框架。

使用时，在功能图中添加节点、写清输入输出和验收条件，把开发任务交给当前 Codex；实现完成后，回到同一工作台操作功能、查看源码和真实测试报告。

[Skill 入口](.agents/skills/contract-studio/SKILL.md) · [Skill 验收](docs/skill-evaluation.md) · [节点契约与验收规格](docs/design/skill-workbench.md) · [领域术语](GLOSSARY.md) · [架构决定](docs/adr/0001-feature-graph-and-codex-workflow.md)

## Agent 的框架入口

以当前节点任务为入口，按需读取对应接口和源文件。字段定义、工具配置和运行状态由框架维护，Skill 只保留操作流程。

| 操作 | 现有入口 |
| --- | --- |
| 发现功能 | `GET /api/features`；返回已登记功能、图、前端入口及运行能力 |
| 读取节点上下文 | `GET /api/node-context?feature=<别名或功能ID>&nodeId=<节点ID>`；返回结构化 `context`、节点说明 `markdown` 和开发任务 `taskMarkdown` |
| 预览画布草稿 | `POST /api/node-context/preview` 携带 `featureId`、`graph`、`nodeId`；使用当前画布和已保存需求，只读生成与侧栏相同的上下文 |
| 读取完整图与关联 | `GET /api/traceability?feature=<已登记功能>`；返回持久图、需求、代码／测试引用与索引状态 |
| 保存契约 | `POST /api/traceability/graph` 携带 `featureId`、`graph`、`expectedGraph`；需求用 `/api/traceability/requirement`，修改已有需求携带 `revision`。载荷见 `server/api.mjs`、`server/traceability.mjs` |
| 接入实现 | 在 `features/<功能>/server.mjs` 声明来源、可信路由、能力与代码绑定，并由 `server/feature-registry.mjs` 登记；对应 `client.tsx` 提供前端操作，再设置节点 `capabilityId` |
| 更新索引 | `node scripts/build-index.mjs` 或 `POST /api/traceability/build`；源码与测试使用 `@need-ids:` 标记 |
| 读取／执行测试 | `GET /api/capabilities/evidence?capabilityId=…` 读取证据；获准运行后用 `POST /api/capabilities/test` 执行登记测试 |

功能登记由服务端维护，工作台自动发现对应的前端模块；新增业务无需在 API 分发、追踪核心和工作台各加一份功能名单。需求源与节点源位于 `contracts/`，保存逻辑见 `server/traceability.mjs`。画布上的 `capabilityId` 只能选择已登记能力，不能提供执行代码。

节点上下文由框架统一生成，侧栏、导出文件和 Agent API 共用一份结果。导出仍是快照，接手时读取当前状态。草稿预览会标明来源；行为契约发生未保存修改时，已保存版本的测试结果不能覆盖该草稿。

## 启动工作台

需要 Node.js 20.19 或更新版本（推荐 22.x），完整需求索引还需要 [uv](https://docs.astral.sh/uv/)。在项目目录运行：

```bash
npm install
uv sync --locked --python 3.12
node scripts/build-index.mjs calculator.suite
npm run dev -- --host 127.0.0.1
```

打开终端显示的本机地址。`pyproject.toml` 和 `uv.lock` 固定 Sphinx 构建环境；首次同步需要下载依赖。索引构建失败时查看输出或工作台中的错误，已保存的需求仍保留。

| 示例 | 入口 | 用途 |
| --- | --- | --- |
| 计算器 | `/?example=suite` | 两数四则、求和、混合运算和平均值共用一个工作台 |
| 反馈工单 | `/?example=feedback` | 表单校验、查重、内存保存及多语言 Adapter |

旧的 `/?example=calculator`、`/?example=sum`、`/?example=expression` 入口和各自的浏览器草稿仍保留。计算器统一图使用独立草稿；若项目已更新而浏览器还显示旧图，先导出要保留的草稿，再选择“读取项目图”。

## 先试试平均值

在图下方选择平均值模式，载入 20 个数的示例并计算：数量为 **20**，总和为 **210**，平均值为 **10.5**。过程区显示 20 次真实累加和最后一次除法；图中高亮相应处理步骤。

平均值接受一个或多个有限数字，支持负数、小数和零。数字可用逗号、空格或加号分隔，例如 `-2, 0, 5` 得到 `1`；空项和非法数字会显示错误，不会被自动跳过。计算沿用 JavaScript 浮点数语义，部分小数存在舍入误差。

同一输入与键盘还支持：

- **两数四则**：例如 `12÷3`；除零显示错误。
- **多数字求和**：至少 3 个数字，输入 `1+2+3`；20 数示例总和为 210，数量不限于 20 项。
- **混合四则**：支持括号和优先级，例如 `12 + 3 × (8 - 4) ÷ 2 = 18`。

直接输入后按 Enter 或 `=` 计算，按 Esc 清空。前端组织输入和展示过程，业务计算由后端执行。

## 在图中组织功能

```text
输入 → 计算 → 结果
       ├─ 两数四则运算
       ├─ 多数字求和
       ├─ 混合四则运算
       │  └─ 识别数字与符号 → 处理优先级 → 逐步求值
       └─ 平均值
          └─ 校验数字 → 累加与计数 → 计算平均值
```

展开表示父子包含关系，连线表示业务或数据依赖。图描述规格，程序的实际执行由业务代码承担。

在功能组内点“＋ 添加”，或双击计算器画布空白处创建节点。点击节点打开右侧面板：

- **节点属性**：名称、类型、重要性、所属功能组、职责、输入输出、处理规则、异常和节点验收说明；可展开结构化输入输出，并选择已接入的运行能力。
- **需求关联**：关联已有需求或创建草稿；一个节点可关联多条需求。每条需求维护带 ID 的验收条件。
- **实现映射／运行与测试**：查看后端入口、实现函数、前端入口和关联测试，区分试运行结果与实际测试报告。
- **文档与任务**：查看当前节点说明，导出说明或 Codex 开发任务。

节点类型改为功能组后，可以继续添加子节点。新节点没有实际能力时显示“待实现”，先完成开发和登记再运行。

在侧栏修改“逻辑重要性”，画布同步显示颜色与等级文字：**核心逻辑（紫色）**、**关键逻辑（琥珀色）**、**普通组成逻辑（蓝灰色）**。保存到项目后保留选择，节点说明和开发任务也携带等级。新节点及未设置等级的旧节点默认为普通组成逻辑；等级与运行成功／失败分别显示。

打开“重点视图”后，核心与关键逻辑突出显示，普通节点淡化并保留连线。选中节点后使用“聚焦节点”查看它及直接关联，返回总览恢复全图阅读。这些操作只改变视图，不改节点契约或测试证据。

画布编辑保存在浏览器草稿中，“保存到项目”才写入功能图。需求编辑直接保存到需求文件；新节点应先保存到项目，再关联需求。保存发现项目图已被其他操作修改时会提示冲突。JSON 导入、导出可用于交换和保留草稿。

## 把节点交给 Codex 实现

1. 在图中建立功能节点，填写契约并关联需求，保存选定契约。需求文字与验收条件分别确认，已有授权继续有效。
2. 在“文档与任务”导出 `<节点ID>.codex-task.md`，交给当前 Codex 聊天。任务包含节点契约、需求、直接上下游及边条件、功能组的直接子节点、实现定位、前端缺口、关联测试和索引状态；未保存的画布内容会在面板提示。
3. 契约及开发上下文已保存后，Codex 修改实际业务代码、前端入口和测试，使用需求 ID 标记相关位置，并在可信能力登记中接入运行入口。
4. 保存并重建需求索引，查看实现与测试引用；在前端操作成功和失败样例，再运行关联测试。

一个功能可以由多个函数共同完成。实现按输入处理、业务校验、纯计算、流程组织和界面呈现划分；复用辅助函数时保留各功能的约束。例如平均值允许单个数字，求和仍至少需要 3 个。

需求确认、实现接入、测试通过是独立状态。原有确认只覆盖标题和描述，新增验收条件需单独确认。仅移动节点位置不改变需求确认；相关代码或行为契约变化后，旧测试证据显示待复验。

## 从需求找到代码与测试

在“需求关联”点击实现或测试引用，下方展开源码并高亮目标行。打开方式默认 VS Code，可跳到对应行；Windows 记事本打开文件后，通过 `Ctrl+G` 输入行号。源码读取和编辑器打开仅面向项目中已解析的引用。

“试运行节点”用指定输入调用功能，“运行关联测试”运行该能力登记的测试文件。报告显示通过／失败数量、时间和输出；未运行及过期证据单独显示。Mock 返回示例，不能作为实际运算或测试通过的证据。

## 需求源与真实索引

本项目的可编辑源是 `contracts/` 下的 JSON。需求正文只维护一份，节点文档和 RST 均为派生视图：

```text
需求与功能图 JSON → 派生 RST → Sphinx-Needs + CodeLinks → needs.json
                                                            ↓
                                                     工作台 / Codex
真实运行与测试 → 独立执行证据 → 节点面板
```

保存项目图或需求后，工作台同步相应 RST 并执行 Sphinx 构建。界面分别显示文档同步和索引状态；构建失败保留已保存内容及前次索引，标记失败或过期，不会冒充当前结果。源码变动后可点击“重建索引”。

在工作台外修改了需求、功能图或源码时，重新构建：

```bash
node scripts/build-index.mjs
```

该命令同步已登记的需求／功能图对应的 RST，再实际构建。指定 `calculator.suite` 时，同步统一计算器及其两数、求和、混合运算来源。产物位于 `traceability/_build/needs/needs.json`，不纳入 Git。导出中 `req` 表示需求，`spec` 表示功能规格；`fulfills` 连接需求，`contains` 表示包含，`flows_to` 表示后继。边端口和分支标签仍保留在节点内容中。

统一计算器新增需求（包括平均值）写入 `contracts/calculator-suite.requirements.json`。原两数、求和、混合运算需求继续归属各自的需求文件，统一视图聚合读取；反馈工单继续使用 `contracts/requirements.json`。原确认记录和修订信息随源文件保留。

Sphinx-Needs 解析结构化条目和关系，CodeLinks 读取源码标记。当前 Java、PHP 引用使用明确标注的 `local-marker` 兼容扫描，其余受配置支持的引用标注 `sphinx-codelinks`。源码标记只能说明关联位置，实际行为要看运行与测试。

### ubCode 的位置

`traceability/ubproject.toml` 保留 ubCode 兼容配置。工作台当前显示 **“未接入（可选）”**；本轮的实际索引由 Sphinx-Needs 和 CodeLinks 构建。接入 ubCode 时需核对工具与适用项目许可，再消费其索引或 CLI/MCP 输出。参见 [ubCode 与 Sphinx 集成](https://ubcode.useblocks.com/paths/sphinx.html)和 [MCP 说明](https://ubcode.useblocks.com/features/mcp/index.html)。

## 反馈工单与多语言 Adapter

反馈流程为 **React 收集 → 字段校验 → 异步查重 → 保存 → 页面反馈**。顶部的语言选择只替换“字段校验”的后端进程；其他步骤继续使用 Node.js。选择可用语言后提交表单，再选中节点查看实际输入输出、耗时与源码。

项目带有 JS、TS、Python、Go、Java、C++、PHP、Rust 和 C# 示例。各语言需要相应工具链；C# 使用 .NET 8 SDK。缺少工具链会在界面标记，缺依赖或编译失败会返回错误。编译型语言首次运行会编译。Rust 演示构建使用 `cargo build --offline`，需提前在 `server/adapters/impl/rust` 中准备依赖。

| 试运行模式 | 行为 | 写入范围 |
| --- | --- | --- |
| Mock | 返回预设样例，不调用所选语言 | 无 |
| Dry-run | 实际调用校验 Adapter 和安全业务步骤 | 本示例不写入 |
| Sandbox | 实际执行，反馈保存在当前进程 | 仅内存，重启可重置 |

`dry-run` 的无写入保证来自具体实现，无法限制任意第三方进程。运行器仅允许 `server/adapters/index.mjs` 中已登记的固定命令，不接受来自画布或网页的 Shell 命令。

### 给新语言增加 Adapter

多语言演示能力为 `feedback.validate`，输入一份 stdin JSON，返回一份 stdout JSON：

```json
{"title":"新增暗色主题","category":"feature","detail":"想要切换夜间模式"}
```

成功返回 `status: "valid"` 和规范化的 `input`；失败返回 `{"status":"invalid","code":"INVALID_TITLE","message":"标题需为 3–60 字。"}`。错误诊断写 stderr；非零退出码、超时或契约不匹配均为失败。

1. 实现接受／返回上述契约的纯校验命令。
2. 在 `server/adapters/index.mjs` 登记工具链和固定启动／编译命令。
3. 加入 `tests/adapters.test.mjs` 的一致性测试。
4. 保持图中 `feedback.validate` 的业务含义，由登记表选择实际语言。

C++、Java 演示解析器只面向平面字符串表单；扩展为嵌套业务 JSON 时需改用对应语言的正式 JSON 库。

## 检查与维护入口

下面的命令检查框架与示例实现。Skill 的验收关注 Agent 能否沿用框架入口完成节点任务，见 [Skill 验收](docs/skill-evaluation.md)。

```bash
npm run build          # React + TypeScript 构建
npm run verify         # 全套自动测试 + JSON 契约检查
npm run test:adapters  # 多语言一致性与 HTTP 测试
```

多语言测试需要本机工具链；业务测试、索引构建和浏览器交互分别验收。功能面板运行的关联测试报告保存在 `traceability/_build/test-results/`，不写入功能图。

| 维护内容 | 入口 |
| --- | --- |
| 功能图、需求与确认 | `contracts/` |
| 节点／需求保存与追踪视图 | `server/traceability.mjs` |
| Sphinx 构建、索引读取和引用规范化 | `server/needs-index.mjs`、`scripts/build-index.mjs` |
| 功能来源、可信路由与能力登记 | `server/feature-registry.mjs`、`features/*/server.mjs` |
| 实际测试报告与有效性 | `server/capabilities.mjs` |
| 平均值与共享数字逻辑 | `server/average.mjs`、`server/numeric-values.mjs` |
| 原计算能力 | `server/calculator.mjs`、`server/sum.mjs`、`server/expression.mjs` |
| 工作台与节点面板 | `src/App.tsx`、`src/NodeProperties.tsx`、`src/CapabilityPanel.tsx` |
| 业务前端操作 | `features/*/client.tsx` |
| 节点上下文、说明与开发任务生成 | `server/node-context.mjs`；直接依赖整理见 `src/node-context.mjs` |
| 本地 API 与编辑器打开 | `server/api.mjs`、`server/editor.mjs` |
| 多语言能力 | `server/adapters/` |
| Codex 工作方法 | `.agents/skills/contract-studio/SKILL.md` |

启动命令限定监听本机。默认 `dev`／`preview` 脚本监听所有网卡，演示 API 没有访问认证，请勿对不可信网络开放。画布草稿在浏览器，反馈数据在进程内存，需求和确认写入本项目；工作台没有独立的云端模型调度服务。
