from decimal import Decimal
import unittest
import tkinter as tk
from calculator import CalculationError, calculate
from app import CalculatorWindow


class CalculatorTests(unittest.TestCase):
    # @need test: 两数四则返回正确结果
    # :id: TEST_PYCALC_BASIC
    # :verifies: REQ_PYCALC_BASIC.FOUR
    # @endneed
    def test_TEST_PYCALC_BASIC(self):
        for expression, expected in [("2+3", "5"), ("2−3", "-1"), ("2×3", "6"), ("6÷2", "3")]:
            self.assertEqual(calculate(expression, "basic").value, Decimal(expected))

    # @need test: 混合表达式按括号与优先级计算
    # :id: TEST_PYCALC_PRECEDENCE
    # :verifies: REQ_PYCALC_EXPRESSION.PRECEDENCE
    # @endneed
    def test_TEST_PYCALC_PRECEDENCE(self):
        result = calculate("12 + 3 × (8 - 4) ÷ 2")
        self.assertEqual(result.value, 18)
        self.assertEqual([step.label for step in result.steps], ["8 - 4 = 4", "3 × 4 = 12", "12 ÷ 2 = 6", "12 + 6 = 18"])
        self.assertEqual(calculate("2 × -3 + 1.5").value, Decimal("-4.5"))

    # @need test: 求和返回 210 和 20 次真实累加
    # :id: TEST_PYCALC_SUM20
    # :verifies: REQ_PYCALC_SUM.TWENTY
    # @endneed
    def test_TEST_PYCALC_SUM20(self):
        result = calculate(", ".join(map(str, range(1, 21))), "sum")
        self.assertEqual((result.count, result.value), (20, 210))
        self.assertEqual([step.value for step in result.steps], [n * (n + 1) // 2 for n in range(1, 21)])
        self.assertEqual(result.steps[-1].label, "190 + 20 = 210")
        self.assertEqual(calculate("1+2+3", "sum").value, 6)

    # @need test: 求和拒绝少于三个数及非法数字
    # :id: TEST_PYCALC_SUM_ERRORS
    # :verifies: REQ_PYCALC_SUM.MINIMUM, REQ_PYCALC_ERRORS.INPUT
    # @endneed
    def test_TEST_PYCALC_SUM_ERRORS(self):
        with self.assertRaisesRegex(CalculationError, "至少输入 3"):
            calculate("1,2", "sum")
        for text in ("1,,3", "1,nan,3", "1, 2, Inf", ""):
            with self.assertRaises(CalculationError):
                calculate(text, "sum")

    # @need test: 平均值返回 10.5 和末步除法
    # :id: TEST_PYCALC_AVG20
    # :verifies: REQ_PYCALC_AVERAGE.TWENTY
    # @endneed
    def test_TEST_PYCALC_AVG20(self):
        result = calculate(", ".join(map(str, range(1, 21))), "average")
        self.assertEqual((result.count, result.total, result.value), (20, 210, Decimal("10.5")))
        self.assertEqual(len(result.steps), 21)
        self.assertEqual(result.steps[-1].label, "210 ÷ 20 = 10.5")
        self.assertEqual(calculate("7", "average").value, 7)
        self.assertEqual(calculate("-2 0 0.5, 1.5", "average").value, 0)

    # @need test: 除零和错误算式给出明确错误
    # :id: TEST_PYCALC_EXPRESSION_ERRORS
    # :verifies: REQ_PYCALC_ERRORS.INPUT, REQ_PYCALC_ERRORS.DIV_ZERO
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
    # :verifies: REQ_PYCALC_ERRORS.OVERFLOW
    # @endneed
    def test_TEST_PYCALC_OVERFLOW(self):
        with self.assertRaisesRegex(CalculationError, "超出计算范围") as error:
            calculate("1e308, 1e308", "average")
        self.assertEqual(len(error.exception.steps), 1)

    # @need test: 桌面平均值操作呈现真实结果与输入错误
    # :id: TEST_PYCALC_DESKTOP
    # :verifies: REQ_PYCALC_UI.DESKTOP
    # @endneed
    def test_TEST_PYCALC_DESKTOP(self):
        root = tk.Tk()
        root.withdraw()
        self.addCleanup(root.destroy)
        gui = CalculatorWindow(root)

        def button(label, parent=gui):
            for child in parent.winfo_children():
                if isinstance(child, tk.ttk.Button) and child.cget("text") == label:
                    return child
                if found := button(label, child):
                    return found

        gui.mode.set("平均值")
        button("载入示例").invoke()
        button("=").invoke()
        self.assertEqual(gui.result.get(), "10.5")
        self.assertEqual(gui.steps.size(), 21)
        self.assertIn("210 ÷ 20 = 10.5", gui.steps.get("end"))
        gui.entry_value.set("1,,3")
        button("=").invoke()
        self.assertEqual(gui.result.get(), "错误")
        self.assertEqual(gui.steps.size(), 0)
