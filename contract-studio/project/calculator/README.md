# Windows 计算器

安装带 Tk 的 Python 3.11+，进入本目录即可运行。应用只使用 Python 标准库，不需要 Node、工作台或本地服务器。

```powershell
python app.py
python run_tests.py
```

若本机的 `python` 指向商店别名，可用仓库已准备好的 `..\..\.venv\Scripts\python.exe` 代替。

- **算式**：输入 `6 ÷ 2` 或带括号的混合算式，点「=」或按 Enter。
- **数字列表**：用空格键输入 `1 2 3`，也可以点屏幕上的「空格」。直接点「求和」（至少 3 个数）或「平均值」（至少 1 个数）。输逗号会提示改用空格；原有的加号分隔写法仍可用。
- **载入示例**：填入用空格隔开的 1 至 20。同一份输入点「求和」得 210（20 步），点「平均值」得 10.5（共 21 步，最后一步为 `210 ÷ 20 = 10.5`）。

按 Esc 清空输入、结果和步骤。

运算模块使用 Decimal（28 位有效数字），保留原示例约 1.8×10³⁰⁸ 的有限数值上限。混合四则支持括号及一元正负，不使用 eval。

## 需求与测试

- [requirements.rst](requirements.rst) 维护 `req`、带 `need_part` 的验收条件及 `spec`。在规格里用 `fulfills` 关联需求。
- [calculator.py](calculator.py) 和 [app.py](app.py) 的 `# @need-ids:` 引用规格 ID，由 CodeLinks 定位函数。
- [测试](tests/test_calculator.py) 用 `@need test` 声明用例。用 `:verifies:` 指向 `需求ID.验收项ID` 和直接验证的规格 ID。方法名 `test_TEST_…` 中的 ID 让报告直接对上索引。
- 不带参数运行测试会写全量报告 `_build/test-results.json`。在工作台点「运行本节点测试」，项目执行器通过 `--test-id` 只跑索引选出的用例；本次结果返回工作台，原报告保留不变。

工作台索引构建与操作命令见[工作台说明](../../README.md)。
