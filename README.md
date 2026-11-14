# Agent Skills

日常使用和逐步改进的 Agent Skill 项目目录。

## 目录

| Skill | 用途 | 入口 |
| --- | --- | --- |
| [generate-cpp-exercises](generate-cpp-exercises/) | 围绕知识点讨论、设计 C++ 实践练习题。 | [SKILL.md](generate-cpp-exercises/SKILL.md) · [说明](generate-cpp-exercises/README.md) |
| [contract-studio](contract-studio/) | 功能节点驱动开发：引导 Agent 使用通用工作台、节点属性、需求／函数自动关联及真实证据。 | [SKILL.md](contract-studio/SKILL.md) · [工作台用法](contract-studio/references/workbench.md) · [Needs / CodeLinks](contract-studio/references/needs-codelinks.md) · [节点与函数划分](contract-studio/references/node-contract.md) |

## 分支

- **[main](https://gitee.com/ddddr_wew/agent-skill/tree/main/)**：Skill + 通用工作台模板，不含业务示例。
- **[calcutor-example](https://gitee.com/ddddr_wew/agent-skill/tree/calcutor-example/)**：保留完整计算器工作台、业务代码与演示测试。分支名沿用约定拼写，空格以连字符替代。

## 安装 Contract Studio

将整个 `contract-studio/` 文件夹复制到目标项目的 `.agents/skills/contract-studio/`，保留 `references/`、`scripts/` 和 `assets/`。在 Codex 中调用 `$contract-studio`。

首次创建工作台，在目标项目根目录运行：

```powershell
node .agents/skills/contract-studio/scripts/init-workbench.mjs ./workbench
```

初始化器提供后续安装和启动命令。已有工作台直接使用现有入口，不重复生成。

```text
contract-studio/
├─ SKILL.md                  Agent 的核心工作流程
├─ references/               按需读取：操作、格式、节点契约
├─ scripts/                  可迁移的工作台初始化器
└─ assets/workbench/         无业务功能的 React Flow + 追踪后端模板
```

模板保留图内新增节点、属性侧栏、三级重要性色彩、节点文档、Sphinx-Needs / CodeLinks 自动关联、代码与测试预览、可信执行登记和证据状态。初始只有项目根节点；具体业务由 Agent 按 Skill 引导实现。ubCode 保留兼容配置，尚未连接。
