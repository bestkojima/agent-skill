# Contract Studio · 独立计算器示例

Windows 计算器自己运行、自己测试。工作台只展示它的功能节点、需求、代码位置和已有测试报告。

```text
contract-studio/
├─ project/calculator/     独立的 Python / Tkinter 计算器
│  ├─ app.py               桌面窗口
│  ├─ calculator.py        运算规则和步骤
│  ├─ requirements.rst     需求、规格和验收条件
│  ├─ graph.json           节点布局；requirements.json 是空的兼容输入
│  ├─ tests/               计算器的验收测试
│  └─ run_tests.py         运行测试并发布报告
├─ src/                    工作台的 React / React Flow 界面
├─ server/                 只读项目视图、追踪查询和报告读取
├─ traceability/           Sphinx-Needs / CodeLinks 配置与生成索引
├─ scripts/                索引与功能图检查
└─ tests/                  工作台自身的 Node.js 测试
```

## 运行计算器

在本目录运行。Python 需要带 Tkinter，应用只用标准库。计算器和测试各自启动：

```powershell
uv run --no-project --python 3.12 python project/calculator/app.py
uv run --no-project --python 3.12 python project/calculator/run_tests.py
```

在计算器里选「平均值」→「载入示例」→「=」，结果为 **10.5**，总和 **210**，过程 **21 步**。测试报告写到 `project/calculator/_build/test-results.json`。更多操作见[计算器说明](project/calculator/README.md)。

## 启动工作台

需要 Node.js 20.19+ 和 uv。

```powershell
npm install
uv sync --locked --python 3.12
node scripts/build-index.mjs
npm run dev -- --host 127.0.0.1
```

打开终端显示的本地地址，或加 `/?example=suite`。点「计算平均值」→「需求关联」可展开函数和测试源码，也能跳转 VS Code；切到「测试报告」可以读项目上次发布的结果。没有报告会显示未运行；未匹配或过期的结果不会显示通过。工作台没有计算器页面，也不会替它运行测试。

## Agent 的框架入口

- `GET /api/features`：读取可用视图。此分支只提供独立计算器的图。
- `GET /api/node-context?feature=suite&nodeId=SPEC_PYCALC_AVERAGE`：读取节点属性、需求、函数和用例状态。
- `node scripts/build-index.mjs`：源码或需求发生变化后，重新生成索引。
- 计算器节点规格在 `project/calculator/requirements.rst`；画布布局在 `project/calculator/graph.json`。这个视图在工作台中只读。

[本仓库 Skill](.agents/skills/contract-studio/SKILL.md) · [通用节点契约](docs/design/skill-workbench.md) · [历史验证记录](docs/skill-evaluation.md)

## Sphinx-Needs 与 CodeLinks 用法

用 `req` 声明需求、`need_part` 给验收项编号。用 `spec.fulfills` 把规格连到需求；在函数前加 `@need-ids: 规格ID`，CodeLinks 会定位具体函数。测试用 `@need test` 声明 ID，再以 `verifies: 需求ID.验收项ID` 精确关联。项目报告中的同一个测试 ID 用来回填运行结果。

例：`REQ_PYCALC_AVERAGE.TWENTY` 对应 `TEST_PYCALC_AVG20`。规格 `SPEC_PYCALC_AVERAGE` 的实现是 `_average`。无需另写关系表。Sphinx 生成的 `traceability/_build/needs/` 及项目测试报告都不提交；ubCode 编辑器可独立使用，工作台未直接接入它。

## 验证

先构建索引，再运行 `npm run verify` 检查工作台，`npm run build` 检查前端生产构建。计算器验收独立运行上面的 `run_tests.py`。
