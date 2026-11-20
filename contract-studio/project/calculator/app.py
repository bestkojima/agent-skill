"""Windows-style calculator. Launch with python app.py."""
import tkinter as tk
from tkinter import ttk
from calculator import CalculationError, calculate, display


LIST_EXAMPLE = " ".join(map(str, range(1, 21)))
INPUT_HINT = "数字列表用空格分隔（如 1 2 3）；算式按 Enter"


class CalculatorWindow(ttk.Frame):
    def __init__(self, root):
        super().__init__(root, style="Shell.TFrame", padding=20)
        root.title("计算器")
        root.geometry("470x670")
        root.minsize(405, 630)
        style = ttk.Style(root)
        style.theme_use("clam")
        style.configure("Shell.TFrame", background="#f3f5f8")
        style.configure("Shell.TLabel", background="#f3f5f8", foreground="#182437", font=("Microsoft YaHei UI", 10))
        style.configure("Title.Shell.TLabel", font=("Microsoft YaHei UI", 19, "bold"))
        style.configure("Result.Shell.TLabel", font=("Segoe UI", 32, "bold"))
        style.configure("Error.Shell.TLabel", foreground="#b42318")
        style.configure("Calc.TButton", background="#ffffff", foreground="#17263a", bordercolor="#dce3ec", font=("Segoe UI", 14), padding=6)
        style.configure("Accent.Calc.TButton", background="#1762a2", foreground="#ffffff")
        style.configure("List.Calc.TButton", font=("Microsoft YaHei UI", 10))
        style.map("Accent.Calc.TButton", background=[("active", "#124d81")])
        self.pack(fill="both", expand=True)
        self.entry_value = tk.StringVar()
        self.result = tk.StringVar(value="0")
        self.info = tk.StringVar(value=INPUT_HINT)
        header = ttk.Frame(self, style="Shell.TFrame")
        header.pack(fill="x")
        ttk.Label(header, text="计算器", style="Title.Shell.TLabel").pack(side="left")
        list_actions = ttk.Frame(header, style="Shell.TFrame")
        list_actions.pack(side="right")
        ttk.Button(list_actions, text="求和", width=7, style="List.Calc.TButton", command=lambda: self.evaluate("sum")).pack(side="left", padx=(0, 6))
        ttk.Button(list_actions, text="平均值", width=7, style="List.Calc.TButton", command=lambda: self.evaluate("average")).pack(side="left")
        self.entry = ttk.Entry(self, textvariable=self.entry_value, font=("Segoe UI", 15), justify="right")
        self.entry.pack(fill="x", pady=(14, 2), ipady=5)
        ttk.Label(self, textvariable=self.result, style="Result.Shell.TLabel", anchor="e").pack(fill="x")
        self.feedback = ttk.Label(self, textvariable=self.info, style="Shell.TLabel", anchor="e")
        self.feedback.pack(fill="x", pady=(0, 10))
        keys = ttk.Frame(self, style="Shell.TFrame")
        keys.pack(fill="x")
        for col in range(4):
            keys.columnconfigure(col, weight=1, uniform="keys")
        for row, labels in enumerate([("(", ")", "C", "⌫"), ("7", "8", "9", "÷"), ("4", "5", "6", "×"), ("1", "2", "3", "−"), ("0", ".", "空格", "+")]):
            for col, text in enumerate(labels):
                ttk.Button(keys, text=text, style="Calc.TButton", command=lambda value=text: self.press(value)).grid(row=row, column=col, sticky="ew", padx=2, pady=2)
        ttk.Button(keys, text="载入示例", style="Calc.TButton", command=self.load_example).grid(row=5, column=0, columnspan=2, sticky="ew", padx=2, pady=2)
        ttk.Button(keys, text="=", style="Accent.Calc.TButton", command=self.evaluate).grid(row=5, column=2, columnspan=2, sticky="ew", padx=2, pady=2)
        ttk.Label(self, text="计算过程", style="Shell.TLabel").pack(anchor="w", pady=(12, 4))
        frame = ttk.Frame(self)
        frame.pack(fill="both", expand=True)
        scroll = ttk.Scrollbar(frame)
        self.steps = tk.Listbox(frame, bg="#ffffff", fg="#20364e", font=("Segoe UI", 11), borderwidth=0, highlightthickness=1, highlightbackground="#dce3ec", yscrollcommand=scroll.set)
        scroll.config(command=self.steps.yview)
        scroll.pack(side="right", fill="y")
        self.steps.pack(side="left", fill="both", expand=True)
        root.bind("<Return>", lambda _: self.evaluate())
        root.bind("<Escape>", lambda _: self.press("C"))
        self.entry.focus_set()

    def load_example(self):
        self.entry_value.set(LIST_EXAMPLE)
        self.entry.icursor("end")
        self.entry.focus_set()

    def press(self, key):
        if key == "C":
            self.entry_value.set("")
            self.result.set("0")
            self.info.set(INPUT_HINT)
            self.feedback.config(style="Shell.TLabel")
            self.steps.delete(0, "end")
        elif key == "⌫":
            if self.entry.selection_present():
                self.entry.delete("sel.first", "sel.last")
            elif self.entry.index("insert"):
                self.entry.delete(self.entry.index("insert") - 1)
        else:
            if self.entry.selection_present():
                self.entry.delete("sel.first", "sel.last")
            self.entry.insert("insert", " " if key == "空格" else key)
        self.entry.focus_set()

    # @need-ids: SPEC_PYCALC_UI
    def evaluate(self, operation: str = "expression"):
        self.entry.focus_set()
        self.steps.delete(0, "end")
        try:
            outcome = calculate(self.entry_value.get(), operation)
        except CalculationError as error:
            self.result.set("错误")
            self.info.set(str(error))
            self.feedback.config(style="Error.Shell.TLabel")
            for number, step in enumerate(error.steps, 1):
                self.steps.insert("end", f"{number:02d}   {step.label}")
            return
        self.result.set(display(outcome.value))
        self.feedback.config(style="Shell.TLabel")
        self.info.set(f"{outcome.count} 个数  ·  总和 {display(outcome.total)}" if outcome.count is not None else f"{len(outcome.steps)} 步")
        for number, step in enumerate(outcome.steps, 1):
            self.steps.insert("end", f"{number:02d}   {step.label}")


def main():
    root = tk.Tk()
    CalculatorWindow(root)
    root.mainloop()


if __name__ == "__main__":
    main()
