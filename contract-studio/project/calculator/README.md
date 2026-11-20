# Windows 计算器

安装带 Tk 的 Python 3.11+，进入本目录即可运行。应用只使用 Python 标准库，不需要 Node、工作台或本地服务器。

```powershell
python app.py
python run_tests.py
```

若本机的 `python` 指向商店别名，可用仓库已准备好的 `..\..\.venv\Scripts\python.exe` 代替。选择「平均值」→「载入示例」→「=」，会显示 20 个数、总和 210、均值 10.5 和 21 步运算。Enter 计算，Esc 清空。「多数字求和」至少需要 3 个数；用逗号、空格或加号分隔数字。

运算模块使用 Decimal（28 位有效数字），保留原示例约 1.8×10³⁰⁸ 的有限数值上限。混合四则支持括号及一元正负，不使用 eval。

## 需求与测试

- [requirements.rst](requirements.rst) 维护 `req`、带 `need_part` 的验收条件及 `spec`。在规格里用 `fulfills` 关联需求。
- [calculator.py](calculator.py) 和 [app.py](app.py) 的 `# @need-ids:` 引用规格 ID，由 CodeLinks 定位函数。
- [测试](tests/test_calculator.py) 用 `@need test` 声明用例、`:id:` 标识用例，`:verifies:` 指向 `需求ID.验收项ID`。方法名 `test_TEST_…` 中的 ID 让报告可直接对上索引。
- 项目执行器写 `_build/test-results.json`，包含结束时间和逐用例结果。工作台只读取，不执行本项目的测试。报告未匹配或过期时不显示通过。

工作台索引构建与操作命令见[工作台说明](../../README.md)。
