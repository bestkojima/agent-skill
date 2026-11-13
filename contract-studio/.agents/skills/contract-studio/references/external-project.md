# 外部项目起步：先映射现有来源

本页的 Node 构建与索引消费片段适用于已有 Node.js 工具链的项目。非 Node 项目沿用自己的构建入口调用 Sphinx 并消费索引，无需为使用本指南额外引入 Node.js。

在已有仓库使用本 Skill 时，保留它的语言、API、前端和测试命令。先找清下面五项的现有位置，只补缺少的部分：

- **需求源**：稳定 ID、正文、验收条件、实际确认范围。
- **节点契约**：节点 ID、职责、输入输出、规则、异常、父子与依赖关系、需求 ID。
- **实现对应**：实际后端入口／函数、前端操作、测试位置。
- **接手上下文**：选中节点、直接依赖、上述引用和本次授权。
- **执行证据**：实际命令、结果、报告位置与未验证项，独立于契约保存。

将项目已有字段映射到这些含义，例如 `requirements[].text` 可作为需求正文，`nodes[].requirementIds` 可承载关联。已有 JSON、RST 或其他需求源继续作为唯一编辑位置，派生视图不另行维护。先保存选定契约及接手上下文，再开始业务代码修改。

## 无既有源时的最小落点

可直接用下面的 `docs/sphinx/index.rst` 保存需求和功能规格；若项目已有生成器，就让它生成等价 RST。两条路径选一条。节点布局只在存在画布时另存坐标，不为使用 Skill 新建工作台。

```text
docs/sphinx/        conf.py、ubproject.toml、index.rst
docs/handoff.md     本次节点及依赖、函数／前端／测试引用、验收条件
scripts/           build-docs.mjs、normalize-needs.mjs
evidence/          实际测试与交互报告
```

最小 `index.rst`；用项目真实内容替换示例文字，确认状态按实际授权记录：

```rst
功能契约
========

.. req:: 用户功能
   :id: REQ_FEATURE
   :status: draft

   用户可观察的行为。验收条件写明输入、预期结果和错误反馈。

.. spec:: 处理步骤
   :id: NODE_FEATURE
   :links: REQ_FEATURE

   * 职责：本步骤完成什么。
   * 结构：父节点与直接依赖；没有时明确写无。
   * 输入与输出：类型、约束、示例。
   * 规则与异常：处理顺序和错误条件。
   * 对应：实际函数、前端操作、测试位置。

源码关联
--------

.. src-trace::
   :project: app
```

已有原生 RST 需求可直接引用；其他权威源的生成器应保留原 ID 和确认范围，生成 `req`／`spec` 与关系。给实际实现及测试加 `// @need-ids: REQ_FEATURE`，换成该项目真实需求 ID。

## 接入实际 Sphinx 与 CodeLinks

以下组合在独立 Node.js 项目中验证过：Python 3.12、Sphinx 9.1.1、Sphinx-Needs 9.2.0、Sphinx-CodeLinks 2.1.0。已有 Python 环境按项目的锁定方式添加依赖；首次建立环境可在 PowerShell 运行：

```powershell
uv venv --python 3.12 .venv
uv pip install --python .venv/Scripts/python.exe sphinx==9.1.1 sphinx-needs==9.2.0 sphinx-codelinks==2.1.0
uv pip freeze --python .venv/Scripts/python.exe > docs/requirements.lock.txt
```

`docs/sphinx/conf.py`：

```python
project = 'Feature contracts'
version = release = '1'
extensions = ['sphinx_needs', 'sphinx_codelinks']
needs_id_regex = r'^[A-Z][A-Z0-9_]{3,}$'
needs_build_json = True
html_theme = 'alabaster'
```

`docs/sphinx/ubproject.toml`；`src_dir` 相对该文件，`include` 相对发现根目录。此配置已验证 JavaScript `.mjs`，其他语言按项目支持范围分别配置：

```toml
[codelinks]
set_local_url = true
set_remote_url = false
outdir = "output"

[codelinks.projects.app]
ref_url_field = "code_url"

[codelinks.projects.app.source_discover]
src_dir = "../.."
include = ["server/*.mjs", "tests/*.mjs"]
comment_type = "ts"
gitignore = false

[codelinks.projects.app.analyse]
get_need_id_refs = true
get_oneline_needs = false
get_multiline_needs = false

[codelinks.projects.app.analyse.need_id_refs]
markers = ["@need-ids:"]
```

`scripts/build-docs.mjs` 用绝对解释器路径跨过 Windows 命令解析差异。已有 RST 生成器时，在 Sphinx 调用前运行项目自己的生成命令：

```js
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const python = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
for (const [command, args] of [
  [python, ['-m', 'sphinx', '-E', '-a', '-W', '-b', 'html', 'docs/sphinx', 'docs/_build']],
  [process.execPath, ['scripts/normalize-needs.mjs']],
]) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
```

在项目根运行 `node scripts/build-docs.mjs`。Windows 的 `python` 可能是商店别名，优先使用已建立环境的实际解释器。已有 `uv.lock` 的项目沿用 `uv sync --locked`，无需另建环境。

保留 `-W`，按实际原因处理构建警告。若实际输出出现 `codelinks.git_remote`，先检查 `git remote -v` 和项目用途。仅对确实无远程、专用于本地且只生成本地链接的仓库，在记录理由后将 `suppress_warnings = ['codelinks.git_remote']` 加入其 `conf.py`，其余警告仍由 `-W` 判失败。已有远程的项目应修复实际配置，不套用此例外，也不添加虚假 remote。

## 消费 needs.json，并报告覆盖缺口

`scripts/normalize-needs.mjs` 读取真实构建结果，验证源码定位后产出供当前项目使用的视图。该片段对应上面的单个、仓库根目录发现配置；若已有多项目配置，按各发现根目录建立别名映射。

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const raw = JSON.parse(await fs.readFile(path.join(root, 'docs/_build/needs.json'), 'utf8'));
const needs = raw.versions?.[raw.current_version]?.needs;
if (!needs) throw Error('Sphinx 未生成有效 needs.json');
const prefix = path.basename(root) + '/';
const items = [];
for (const need of Object.values(needs)) {
  const references = [];
  for (const url of need.code_url ?? []) {
    const match = url.match(/^([^#]+)#L([1-9]\d*)$/);
    if (!match || !match[1].startsWith(prefix)) throw Error(`未映射的 CodeLinks URL: ${url}`);
    const relative = match[1].slice(prefix.length);
    if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw Error(`越界引用: ${url}`);
    const line = Number(match[2]);
    const lines = (await fs.readFile(path.join(root, relative), 'utf8')).split(/\r?\n/);
    const ids = lines[line - 1]?.match(/@need-ids:\s*(.*)$/)?.[1].split(',').map(id => id.trim()) ?? [];
    if (!ids.includes(need.id)) throw Error(`源码定位已变化: ${url}`);
    references.push({ path: relative, line, source: 'sphinx-codelinks' });
  }
  items.push({ id: need.id, type: need.type, title: need.title, status: need.status,
    links: need.links ?? [], references });
}
const index = { source: 'sphinx-needs+codelinks', needs: items,
  unindexed: [{ path: 'public/index.html', reason: '当前 ts 发现配置不覆盖 HTML 内嵌脚本；前端位置保留在节点契约中' }] };
await fs.writeFile(path.join(root, 'docs/normalized-index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`已消费 ${items.length} 条 needs、${items.reduce((n, item) => n + item.references.length, 0)} 处源码引用`);
```

将 `unindexed` 改为当前项目真实未覆盖文件／语言；全部覆盖时用空数组。不要因未索引而丢掉显式前端或测试引用，也不要将手写引用说成 CodeLinks 输出。规划中的需求可以暂缺实现引用，已实现功能按其验收条件检查遗漏。

让当前项目的文档、接口或 AI 交接读取这个规范化结果，记录构建与消费两步的实际输出。测试和浏览器操作结果单独保存：至少含命令或操作、通过／失败、报告位置和未验证项。源文件变化后重建索引；相关行为或代码变化后重跑受影响测试，旧结果保留但标为待复验。ubCode 未接入时明确记录，避免与已运行的 Sphinx 索引混淆。
