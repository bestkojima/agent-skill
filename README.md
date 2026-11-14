# Agent Skills

日常使用和逐步改进的 Agent Skill 项目目录。

## 当前分支：calcutor-example

此分支保留完整计算器工作台、业务源码与演示测试。可复用的 Skill 和不含业务示例的通用框架模板维护在 **[main 分支](https://gitee.com/ddddr_wew/agent-skill/tree/main/contract-studio/)**；安装技能请使用 main 的整个 `contract-studio/` 文件夹。

运行计算器：进入 `contract-studio/`，按[工作台说明](contract-studio/README.md#启动工作台)安装依赖并启动，再打开 `/?example=suite`。本分支目录与原启动入口保持不变。

## 目录

| Skill | 用途 | 入口 |
| --- | --- | --- |
| [generate-cpp-exercises](generate-cpp-exercises/) | 围绕知识点讨论、设计 C++ 实践练习题。 | [SKILL.md](generate-cpp-exercises/SKILL.md) · [说明](generate-cpp-exercises/README.md) |
| [contract-studio](contract-studio/) | 节点驱动开发框架；通过精简 Skill 引导 Agent 使用契约、实现绑定、索引和证据。 | [SKILL.md](contract-studio/.agents/skills/contract-studio/SKILL.md) · [框架用法](contract-studio/README.md) · [节点契约](contract-studio/docs/design/skill-workbench.md) |

`contract-studio/` 包含框架、工作台与示例；Agent 的操作指引位于 `.agents/skills/contract-studio/SKILL.md`。
