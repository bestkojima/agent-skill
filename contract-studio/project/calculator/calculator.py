"""Independent calculator logic for the Windows desktop application."""
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, Overflow, localcontext
import re


class CalculationError(ValueError):
    def __init__(self, message, steps=()):
        super().__init__(message)
        self.steps = steps


@dataclass(frozen=True)
class Step:
    label: str
    value: Decimal


@dataclass(frozen=True)
class Result:
    value: Decimal
    steps: tuple[Step, ...]
    count: int | None = None
    total: Decimal | None = None


_NUMBER = r"(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?"
_TOKEN = re.compile(rf"\s*({_NUMBER}|[+*/()-])")
_OPERATORS = {
    "+": Decimal.__add__, "-": Decimal.__sub__,
    "*": Decimal.__mul__, "/": Decimal.__truediv__,
}
_PRECEDENCE = {"+": 1, "-": 1, "*": 2, "/": 2}
_MAX_FINITE = Decimal("1.7976931348623157e308")


def display(value: Decimal) -> str:
    if not value:
        return "0"
    if value.adjusted() > 15 or value.adjusted() < -7:
        return str(value.normalize()).replace("E", "e")
    text = format(value, "f")
    return text.rstrip("0").rstrip(".") if "." in text else text


# @need-ids: SPEC_PYCALC_FORMAT
def format_step(left: Decimal, symbol: str, right: Decimal, result: Decimal) -> Step:
    return Step(f"{display(left)} {symbol} {display(right)} = {display(result)}", result)


def _bounded(value: Decimal) -> Decimal:
    if not value.is_finite() or value.copy_abs() > _MAX_FINITE:
        raise CalculationError("结果超出计算范围")
    return value


# @need-ids: SPEC_PYCALC_OPERATE
def _apply(left: Decimal, op: str, right: Decimal) -> Decimal:
    if op == "/" and not right:
        raise CalculationError("除数不能为零")
    return _bounded(_OPERATORS[op](left, right))


# @need-ids: SPEC_PYCALC_PARSE
def _expression(text: str, *, basic: bool = False) -> Result:
    text = text.translate(str.maketrans({"×": "*", "÷": "/", "−": "-"})).strip()
    if not text or len(text) > 512:
        raise CalculationError("请输入 1–512 个字符的算式")
    tokens: list[str] = []
    pos = 0
    while pos < len(text):
        match = _TOKEN.match(text, pos)
        if not match:
            raise CalculationError(f"无法识别第 {pos + 1} 个字符")
        tokens.append(match[1])
        pos = match.end()
    cursor = 0
    steps: list[Step] = []
    binary = 0

    def expression(minimum: int = 0) -> Decimal:
        nonlocal cursor, binary
        if cursor == len(tokens):
            raise CalculationError("缺少数字")
        token = tokens[cursor]
        cursor += 1
        if token in {"+", "-"}:
            value = expression(3)
            left = value.copy_negate() if token == "-" else value
        elif token == "(" and not basic:
            left = expression()
            if cursor == len(tokens) or tokens[cursor] != ")":
                raise CalculationError("缺少右括号")
            cursor += 1
        elif re.fullmatch(_NUMBER, token):
            left = _bounded(Decimal(token))
        else:
            raise CalculationError("数字或括号位置有误")
        while cursor < len(tokens):
            operator = tokens[cursor]
            precedence = _PRECEDENCE.get(operator, -1)
            if precedence < minimum:
                break
            cursor += 1
            right = expression(precedence + 1)
            result = _apply(left, operator, right)
            binary += 1
            steps.append(format_step(left, {"*": "×", "/": "÷"}.get(operator, operator), right, result))
            left = result
        return left

    value = expression()
    if cursor != len(tokens):
        raise CalculationError("运算符位置或括号有误")
    if basic and binary != 1:
        raise CalculationError("两数四则模式需要两个数字和一个运算符")
    return Result(value, tuple(steps))


# @need-ids: SPEC_PYCALC_LIST
def _parse_list(text: str, minimum: int) -> list[Decimal]:
    text = text.strip()
    if not text:
        raise CalculationError("请输入数字")
    text = re.sub(r"(?<=[0-9.])\s*\+(?=\s*[+-]?(?:[0-9]|\.[0-9]))", ",", text)
    chunks = re.split(r"[,，]", text)
    if any(not chunk.strip() for chunk in chunks):
        raise CalculationError("数字列表中有空项")
    words = [word for chunk in chunks for word in chunk.split()]
    values = []
    for index, word in enumerate(words, 1):
        if not re.fullmatch(rf"[+-]?{_NUMBER}", word):
            raise CalculationError(f"第 {index} 项不是有效数字")
        values.append(_bounded(Decimal(word)))
    if len(values) < minimum:
        raise CalculationError(f"至少输入 {minimum} 个数")
    return values


# @need-ids: SPEC_PYCALC_SUM
def _accumulate(values: list[Decimal]) -> tuple[Decimal, tuple[Step, ...]]:
    total = Decimal(0)
    steps = []
    for value in values:
        try:
            next_total = _apply(total, "+", value)
        except CalculationError as error:
            raise CalculationError(str(error), tuple(steps)) from error
        steps.append(format_step(total, "+", value, next_total))
        total = next_total
    return total, tuple(steps)


# @need-ids: SPEC_PYCALC_AVERAGE
def _average(total: Decimal, count: int, steps: tuple[Step, ...]) -> Result:
    size = Decimal(count)
    value = _apply(total, "/", size)
    return Result(value, (*steps, format_step(total, "÷", size, value)), count, total)


# @need-ids: SPEC_PYCALC_RUN
def calculate(text: str, mode: str = "expression") -> Result:
    """Calculate once and return the actual arithmetic steps, or a user-facing error."""
    try:
        with localcontext() as context:
            context.prec = 28
            if mode in ("basic", "expression"):
                return _expression(text, basic=mode == "basic")
            if mode in ("sum", "average"):
                values = _parse_list(text, 3 if mode == "sum" else 1)
                total, steps = _accumulate(values)
                if mode == "average":
                    return _average(total, len(values), steps)
                return Result(total, steps, len(values), total)
            raise CalculationError("未知计算模式")
    except (InvalidOperation, Overflow) as error:
        raise CalculationError("输入无效或结果超出计算范围") from error
