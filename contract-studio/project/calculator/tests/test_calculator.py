from decimal import Decimal
import unittest
import tkinter as tk
from calculator import CalculationError, calculate
from app import CalculatorWindow


class CalculatorTests(unittest.TestCase):
    def window(self):
        root = tk.Tk()
        root.withdraw()
        self.addCleanup(root.destroy)
        return CalculatorWindow(root)

    def click(self, window, label):
        def find(parent):
            for child in parent.winfo_children():
                if isinstance(child, tk.ttk.Button) and child.cget("text") == label:
                    return child
                if found := find(child):
                    return found
            return None

        button = find(window)
        self.assertIsNotNone(button, f"缺少按键：{label}")
        button.invoke()

    # @need test: 两数四则返回正确结果
    # :id: TEST_PYCALC_BASIC
    # :verifies: REQ_PYCALC_BASIC.FOUR, SPEC_PYCALC_RUN, SPEC_PYCALC_PARSE, SPEC_PYCALC_OPERATE
    # @endneed
    def test_TEST_PYCALC_BASIC(self):
        for expression, expected in [("2+3", "5"), ("2−3", "-1"), ("2×3", "6"), ("6÷2", "3")]:
            self.assertEqual(calculate(expression, "basic").value, Decimal(expected))

    # @need test: 混合表达式按括号与优先级计算
    # :id: TEST_PYCALC_PRECEDENCE
    # :verifies: REQ_PYCALC_EXPRESSION.PRECEDENCE, SPEC_PYCALC_RUN, SPEC_PYCALC_PARSE, SPEC_PYCALC_FORMAT
    # @endneed
    def test_TEST_PYCALC_PRECEDENCE(self):
        result = calculate("12 + 3 × (8 - 4) ÷ 2")
        self.assertEqual(result.value, 18)
        self.assertEqual([step.label for step in result.steps], ["8 - 4 = 4", "3 × 4 = 12", "12 ÷ 2 = 6", "12 + 6 = 18"])
        self.assertEqual(calculate("2 × -3 + 1.5").value, Decimal("-4.5"))

    # @need test: 求和返回 210 和 20 次真实累加
    # :id: TEST_PYCALC_SUM20
    # :verifies: REQ_PYCALC_SUM.TWENTY, SPEC_PYCALC_RUN, SPEC_PYCALC_SUM, SPEC_PYCALC_FORMAT
    # @endneed
    def test_TEST_PYCALC_SUM20(self):
        result = calculate(" ".join(map(str, range(1, 21))), "sum")
        self.assertEqual((result.count, result.value), (20, 210))
        self.assertEqual([step.value for step in result.steps], [n * (n + 1) // 2 for n in range(1, 21)])
        self.assertEqual(result.steps[-1].label, "190 + 20 = 210")
        self.assertEqual(calculate("1+2+3", "sum").value, 6)

    # @need test: 求和校验数量与数字格式；列表遇逗号提示改用空格
    # :id: TEST_PYCALC_SUM_ERRORS
    # :verifies: REQ_PYCALC_SUM.MINIMUM, REQ_PYCALC_ERRORS.INPUT, SPEC_PYCALC_LIST
    # @endneed
    def test_TEST_PYCALC_SUM_ERRORS(self):
        with self.assertRaisesRegex(CalculationError, "至少输入 3"):
            calculate("1 2", "sum")
        for text in ("1 nan 3", "1 2 Inf", ""):
            with self.assertRaises(CalculationError):
                calculate(text, "sum")
        for operation in ("sum", "average"):
            for text in ("1,2,3", "1，2，3"):
                with self.subTest(operation=operation, text=text):
                    with self.assertRaisesRegex(CalculationError, "请用空格分隔数字"):
                        calculate(text, operation)

    # @need test: 平均值返回 10.5 和末步除法
    # :id: TEST_PYCALC_AVG20
    # :verifies: REQ_PYCALC_AVERAGE.TWENTY, SPEC_PYCALC_RUN, SPEC_PYCALC_AVERAGE
    # @endneed
    def test_TEST_PYCALC_AVG20(self):
        result = calculate(" ".join(map(str, range(1, 21))), "average")
        self.assertEqual((result.count, result.total, result.value), (20, 210, Decimal("10.5")))
        self.assertEqual(len(result.steps), 21)
        self.assertEqual(result.steps[-1].label, "210 ÷ 20 = 10.5")
        self.assertEqual(calculate("7", "average").value, 7)
        self.assertEqual(calculate("-2 0 0.5 1.5", "average").value, 0)

    # @need test: 除零和错误算式给出明确错误
    # :id: TEST_PYCALC_EXPRESSION_ERRORS
    # :verifies: REQ_PYCALC_ERRORS.INPUT, REQ_PYCALC_ERRORS.DIV_ZERO, SPEC_PYCALC_PARSE, SPEC_PYCALC_OPERATE
    # @endneed
    def test_TEST_PYCALC_EXPRESSION_ERRORS(self):
        for text in ("6/(3-3)", "0/0"):
            with self.assertRaisesRegex(CalculationError, "除数不能为零"):
                calculate(text)
        for text in ("1+", "()", "2e", "(2+3", "3 ** 2"):
            with self.assertRaises(CalculationError):
                calculate(text)

    # @need test: 累加越界保留已完成步骤
    # :id: TEST_PYCALC_OVERFLOW
    # :verifies: REQ_PYCALC_ERRORS.OVERFLOW, SPEC_PYCALC_SUM
    # @endneed
    def test_TEST_PYCALC_OVERFLOW(self):
        with self.assertRaisesRegex(CalculationError, "超出计算范围") as error:
            calculate("1e308 1e308", "average")
        self.assertEqual(len(error.exception.steps), 1)

    # @need test: 桌面等号、求和和平均值直接操作同一输入框
    # :id: TEST_PYCALC_DESKTOP
    # :verifies: REQ_PYCALC_UI.DESKTOP, SPEC_PYCALC_UI
    # @endneed
    def test_TEST_PYCALC_DESKTOP(self):
        gui = self.window()
        for expression, answer, steps in [("6 ÷ 2", "3", 1), ("12 + 3 × (8 - 4) ÷ 2", "18", 4)]:
            with self.subTest(expression=expression):
                gui.entry_value.set(expression)
                self.click(gui, "=")
                self.assertEqual(gui.result.get(), answer)
                self.assertEqual(gui.steps.size(), steps)

        self.click(gui, "载入示例")
        values = " ".join(map(str, range(1, 21)))
        self.assertEqual(gui.entry_value.get(), values)
        self.click(gui, "求和")
        self.assertEqual(gui.result.get(), "210")
        self.assertEqual(gui.steps.size(), 20)
        self.assertIn("190 + 20 = 210", gui.steps.get("end"))
        self.click(gui, "平均值")
        self.assertEqual(gui.entry_value.get(), values)
        self.assertEqual(gui.result.get(), "10.5")
        self.assertEqual(gui.info.get(), "20 个数  ·  总和 210")
        self.assertEqual(gui.steps.size(), 21)
        self.assertIn("210 ÷ 20 = 10.5", gui.steps.get("end"))

        gui.entry_value.set("1 2")
        self.click(gui, "求和")
        self.assertEqual(gui.result.get(), "错误")
        self.assertIn("至少输入 3", gui.info.get())
        self.assertEqual(gui.steps.size(), 0)
        gui.entry_value.set("7")
        self.click(gui, "平均值")
        self.assertEqual(gui.result.get(), "7")
        gui.entry_value.set("1,2,3")
        self.click(gui, "平均值")
        self.assertEqual(gui.result.get(), "错误")
        self.assertIn("请用空格分隔数字", gui.info.get())
        self.assertEqual(gui.steps.size(), 0)
        gui.entry_value.set("6 ÷ 0")
        self.click(gui, "=")
        self.assertEqual(gui.result.get(), "错误")
        self.assertEqual(gui.info.get(), "除数不能为零")
        self.assertEqual(gui.steps.size(), 0)

    # @need test: 屏幕空格和减号能录入带负数的列表
    # :id: TEST_PYCALC_NEGATIVE_LIST_KEY
    # :verifies: REQ_PYCALC_SUM.NEGATIVE, SPEC_PYCALC_LIST, SPEC_PYCALC_UI
    # @endneed
    def test_TEST_PYCALC_NEGATIVE_LIST_KEY(self):
        gui = self.window()
        for key in ("1", "空格", "−", "2", "空格", "4"):
            self.click(gui, key)
        self.assertEqual(gui.entry_value.get(), "1 −2 4")
        self.click(gui, "求和")
        self.assertEqual(gui.result.get(), "3")
        self.click(gui, "平均值")
        self.assertEqual(gui.result.get(), "1")
