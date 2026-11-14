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
| 读取完整图与关联 | `GET /api/traceability?feature=<已登记功能>`；返回持久图、需求、代码／测试引用、`backend` 关系及索引状态 |
| 保存契约 | `POST /api/traceability/graph` 携带 `featureId`、`graph`、`expectedGraph`；需求用 `/api/traceability/requirement`，修改已有需求携带 `revision`。载荷见 `server/api.mjs`、`server/traceability.mjs` |
| 接入运行 | 在 `features/<功能>/server.mjs` 声明可信路由、能力、测试文件与前端入口，并由 `server/feature-registry.mjs` 登记；对应 `client.tsx` 提供前端操作，再设置节点 `capabilityId` |
| 更新索引 | `node scripts/build-index.mjs` 或 `POST /api/traceability/build`；从 Needs 条目、源码标记及原生测试声明自动解析关联 |
| 读取／执行测试 | `GET /api/capabilities/evidence?capabilityId=…` 读取证据；获准运行后用 `POST /api/capabilities/test` 执行登记测试 |

功能登记负责可执行入口，需求和函数的语义关系由索引解析。既有源位于 `contracts/`；新增原生 RST 条目可按 `feature_id` 进入已有功能视图，无需增加节点／函数对照表。保存逻辑见 `server/traceability.mjs`。画布上的 `capabilityId` 只能选择已登记能力，不能提供执行代码。

节点上下文由框架统一生成，侧栏、导出文件和 Agent API 共用一份结果。导出仍是快照，接手时读取当前状态。草稿预览会标明来源；行为契约发生未保存修改时，已保存版本的测试结果不能覆盖该草稿。

维护后端读取逻辑时，通过 `openTraceability(root)` 取得本次请求的追踪视图，再查询功能、能力或源码。例如：

```js
const project = await openTraceability(root);
const saved = await project.feature(featureId);
const preview = await project.feature(featureId, { graph: draftGraph });
```

这个 Module 内部处理 JSON／RST 同步、索引是否过期、字段规范化及关系投影。目录、节点上下文和证据读取复用同一对象，不再各自拼装 Needs 与 CodeLinks 记录。已有 HTTP 和 CLI 入口保持原用法；独立图读取仍接受原文件描述符，无需补建需求文件。

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
3. 契约及开发上下文已保存后，Codex 在授权范围内修改业务代码、前端入口和测试；函数标记精确的节点规格 ID，原生测试声明引用验收条目。需要实际运行时，再接入可信能力。
4. 重建需求索引，查看自动生成的节点、属性、函数及测试关联；按任务授权验证成功和失败行为，读取实际测试结果。

一个功能可以由多个函数共同完成。实现按输入处理、业务校验、纯计算、流程组织和界面呈现划分；复用辅助函数时保留各功能的约束。例如平均值允许单个数字，求和仍至少需要 3 个。

需求确认、实现接入、测试通过是独立状态。原有确认只覆盖标题和描述，新增验收条件需单独确认。仅移动节点位置不改变需求确认；相关代码或行为契约变化后，旧测试证据显示待复验。

## 从需求找到代码与测试

在“需求关联”点击实现或测试引用，下方展开源码并高亮目标行。打开方式默认 VS Code，可跳到对应行；Windows 记事本打开文件后，通过 `Ctrl+G` 输入行号。源码读取和编辑器打开仅面向项目中已解析的引用。

“试运行节点”用指定输入调用功能，“运行关联测试”运行该能力登记的测试文件。报告显示通过／失败数量、时间和输出；未运行及过期证据单独显示。Mock 返回示例，不能作为实际运算或测试通过的证据。

## 需求源与真实索引

每条需求与节点规格只维护一份正文：既有条目继续编辑 `contracts/` JSON；新增条目也可直接编写原生 Needs RST。工作台保存时写回各自的源，画布布局单独保存。节点文档和索引由这些源生成：

```text
既有 JSON → 派生 RST ─┐
原生 Needs RST ───────┼→ Sphinx-Needs + CodeLinks → 索引 → 通用规则 → 节点与属性
源码标记与测试声明 ───┘                                      ↓
                                                     工作台 / Codex
真实运行与测试 → 独立执行证据 → 节点面板
```

保存项目图或需求后，工作台写回源并执行 Sphinx 构建。既有 JSON 对应的 RST 与 `traceability/node-properties.rst` 均由 exporter 生成，后者用 `needextend` 补齐节点映射字段，保留为只读产物。界面分别显示保存和索引状态；构建失败保留已保存内容及前次索引，并标记失败或过期。源码变动后可点击“重建索引”。

在工作台外修改了需求、功能图或源码时，重新构建：

```bash
node scripts/build-index.mjs
```

该命令同步既有 JSON 对应的 RST，再构建所有已接入的 Needs 文档与源码。指定 `calculator.suite` 时，同步统一计算器及其两数、求和、混合运算来源。产物 `traceability/_build/needs/needs.json` 保存条目与关系，旁边的 `code-entities.json` 保存 CodeLinks 函数身份、签名和范围，均不纳入 Git。

从画布新增的计算器需求写入 `contracts/calculator-suite.requirements.json`。原两数、求和、混合运算需求继续归属各自的需求文件，统一视图聚合读取；反馈工单继续使用 `contracts/requirements.json`。原确认记录和修订信息随源文件保留。原生 RST 条目保持在其手写文档中，编辑节点属性、需求正文、验收条件或确认状态时写回该文档。

Sphinx-Needs 解析结构化条目和关系，CodeLinks 读取源码标记。当前 Java、PHP 引用使用明确标注的 `local-marker` 兼容扫描，其余受配置支持的引用标注 `sphinx-codelinks`。源码标记只能说明关联位置，实际行为要看运行与测试。

### Sphinx-Needs 与 CodeLinks 用法

Agent 编写规范条目和源码标记，框架自动关联。**Sphinx-Needs** 解析 `req/spec/impl/test` 及原生关系；**CodeLinks** 从标记所在源码提取文件、函数符号和范围；**节点投影** 按 `traceability/node-mapping.json` 将规格转换为节点属性。运行能力登记只决定哪些入口可以执行。

新增原生条目时，按下面三处编写；既有 JSON 条目继续从其源修改，复用节点上下文返回的 `needId`。

**1. 写需求和节点规格。** 在 `traceability/` 的手写 RST 中定义条目，并加入 `traceability/index.rst` 的 `toctree`。例如给已有计算器视图加一个“加一”节点：

```rst
.. req:: 数字加一
   :id: REQ_INCREMENT

   输入一个数字，返回它加一后的值。

   * :need_part:`(PLUS_ONE) 输入 2，预期输出 3。`

.. spec:: 加一
   :id: SPEC_INCREMENT
   :feature_id: calculator.suite
   :fulfills: REQ_INCREMENT
   :importance: normal
   :node_properties: {"input":"一个数字","output":"加一后的数字"}

   接受数字并增加一。
```

`feature_id` 选择已有功能视图；节点 ID 默认采用 spec ID，兼容旧节点时可填写 `node_id`。标题与正文映射名称和职责，`node_properties` 承载输入输出、处理规则、异常等行为属性。`fulfills` 连接需求，`parent_spec/contains` 连接父子规格，`flows_to` 连接数据流；需要端口或条件时用 `node_edges` JSON 保留完整出边。位置、大小和函数路径由各自的布局或索引维护。

原生需求的节点关联统一修改 `spec.fulfills` 后重建索引；需求保存 API 会拒绝修改其 `nodeIds`，避免同时维护两套关联。需求正文、验收条件及确认仍使用原有保存接口。

**2. 在具体函数上标记精确的 spec ID。** 例如 `server/increment.mjs`：

```js
// @need-ids: SPEC_INCREMENT
export function increment(value) { return value + 1; }
```

多个函数可以标记同一规格，一个函数也可标记多个规格。也可在函数前写原生 `@need impl:` 声明，以 `:implements: SPEC_INCREMENT` 关联并用 `@endneed` 结束。仅有 `REQ_…` 标记时保留需求级引用，无法据此判定同一需求下哪个节点直接实现该函数。

**3. 测试在源码中声明验收关系，并在运行名称里带稳定 ID。** 例如 `tests/increment.test.mjs`：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { increment } from '../server/increment.mjs';

// @need test: 加一返回预期结果
// :id: TEST_INCREMENT
// :verifies: REQ_INCREMENT.PLUS_ONE
// @endneed
test('[TEST_INCREMENT] 加一返回预期结果', () => {
  assert.equal(increment(2), 3);
});
```

验收项使用 `need_part`，`test.verifies` 指向 `REQ_ID.PART_ID`。执行报告按允许的测试文件与 `[TEST_ID]` 匹配，显示名称可调整；文件或 ID 缺失、重复或不匹配时显示缺口。需要从工作台执行时，在可信能力的 `testFiles` 中加入该文件，无需再维护 `code`、`implementation` 或 `testCases` 关联表。新节点可以先被索引，再接入运行能力。

完成后执行 `node scripts/build-index.mjs`，读取节点上下文核对映射，再按授权执行测试。源码扫描目录与关系类型配置在 `traceability/ubproject.toml`；新增 CodeLinks 项目时同步 `traceability/index.rst` 的 `src-trace`。普通验收 ID 原样成为 part ID；含点或以 `PART_` 开头的既有 ID 使用可逆编码，以接口返回的 `needId` 为准。格式依据：[Sphinx-Needs 验收子条目](https://sphinx-needs.readthedocs.io/en/latest/roles.html#need-part-np)、[CodeLinks 源码分析](https://codelinks.useblocks.com/en/sphinx-codelinks-v2.1.0/components/analyse.html)。

查询 `GET /api/node-context?feature=suite&nodeId=avg-compute` 可取得：

- `context.properties`：行为属性投影，排除身份、标题、布局和源码引用；`context.node` 保留前端使用的扁平字段。
- `context.implementation`：由精确 spec 标记或 `impl.implements` 解析的直接函数；`relatedImplementation` 为同一能力的其他节点函数。
- `context.backend`：节点、需求、函数、数据流、声明调用和验收用例的连接。函数身份采用文件＋符号，`signature/startLine/endLine` 来自 CodeLinks；`scopeState: current` 才能作为当前源码定位。
- `context.backend.testCases`：逐用例的 `passed/failed/skipped/not-run/stale` 和原生 `verifies`。测试到函数的 `requirement-binding` 表示需求关联；执行覆盖率需要另外采集。
- `context.evidence.executionState`：测试命令的实际结果；`caseCoverage` 单独统计已索引测试条目的结果完整性，未匹配或跳过的条目不会随总体通过而变绿。

内部节点契约与试运行适配器分开：`avg-compute` 接收 `{count, total, steps}`；原 `/api/average/test` 继续接收 `{values}`，由适配器准备前置步骤，输入说明在 `context.backend.trial`。平均值执行结果的 `observedCalls` 记录本次实际调用的步骤函数与结果呈现函数；它与声明调用、图上数据流分别读取。

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
| 功能图、需求与确认 | 既有 `contracts/` JSON 或手写 `traceability/*.rst` |
| 节点／需求保存与追踪视图 | `server/traceability.mjs` |
| 请求级追踪读取与规则规范化 | `server/traceability.mjs` 的 `openTraceability`；内部字段转换在 `server/needs-schema.mjs` |
| Sphinx 构建、索引读取和引用规范化 | `server/needs-index.mjs`、`scripts/build-index.mjs` |
| 规格到节点的规则与源写回 | `traceability/node-mapping.json`、`server/needs-projection.mjs` |
| 功能来源、可信路由与能力登记 | `server/feature-registry.mjs`、`features/*/server.mjs` |
| 需求、节点、函数及验收用例连接 | `server/backend-relations.mjs`、`server/indexed-tests.mjs`；从索引推导 |
| 实际测试报告与有效性 | `server/capabilities.mjs`、`scripts/test-case-reporter.mjs` |
| 平均值与共享数字逻辑 | `server/average.mjs`、`server/numeric-values.mjs` |
| 原计算能力 | `server/calculator.mjs`、`server/sum.mjs`、`server/expression.mjs` |
| 工作台与节点面板 | `src/App.tsx`、`src/NodeProperties.tsx`、`src/CapabilityPanel.tsx` |
| 业务前端操作 | `features/*/client.tsx` |
| 节点上下文、说明与开发任务生成 | `server/node-context.mjs`；直接依赖整理见 `src/node-context.mjs` |
| 本地 API 与编辑器打开 | `server/api.mjs`、`server/editor.mjs` |
| 多语言能力 | `server/adapters/` |
| Codex 工作方法 | `.agents/skills/contract-studio/SKILL.md` |

启动命令限定监听本机。默认 `dev`／`preview` 脚本监听所有网卡，演示 API 没有访问认证，请勿对不可信网络开放。画布草稿在浏览器，反馈数据在进程内存，需求和确认写入本项目；工作台没有独立的云端模型调度服务。
