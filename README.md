# Agent Skills

日常使用和逐步改进的 Agent Skill 项目目录。

## 当前分支：calcutor-example

此分支提供独立的 Python Windows 计算器，以及只读展示它的需求图、源码定位和测试报告的工作台。可复用的 Skill 和通用框架模板维护在 **[main 分支](https://github.com/bestkojima/agent-skill/tree/main/contract-studio)**。

计算器与测试从 [project/calculator](contract-studio/project/calculator/) 运行；[工作台](contract-studio/README.md#启动工作台) 单独启动，`/?example=suite` 打开计算器追踪图。

## 目录

| Skill | 用途 | 入口 |
| --- | --- | --- |
| [generate-cpp-exercises](generate-cpp-exercises/) | 围绕知识点讨论、设计 C++ 实践练习题。 | [SKILL.md](generate-cpp-exercises/SKILL.md) · [说明](generate-cpp-exercises/README.md) |
| [contract-studio](contract-studio/) | 节点驱动开发框架；通过精简 Skill 引导 Agent 使用契约、实现绑定、索引和证据。 | [SKILL.md](contract-studio/.agents/skills/contract-studio/SKILL.md) · [框架用法](contract-studio/README.md) · [节点契约](contract-studio/docs/design/skill-workbench.md) |

`contract-studio/` 包含框架、工作台与示例；Agent 的操作指引位于 `.agents/skills/contract-studio/SKILL.md`。
