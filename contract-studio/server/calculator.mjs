// @need-ids: REQ_CALC_INPUT, FUNC_SUITE_63616C632D696E707574, FUNC_63616C632D696E707574
export function captureCalculatorInput(raw) {
  return { status: 'received', draft: raw && typeof raw === 'object' ? raw : {} };
}

// @need-ids: REQ_CALC_VALIDATE, FUNC_SUITE_63616C632D76616C6964617465, FUNC_63616C632D76616C6964617465
export function validateCalculatorInput(raw) {
  const parse = value => {
    if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const left = parse(raw?.left);
  const right = parse(raw?.right);
  if (left === null || right === null) return { status: 'invalid', message: '请输入两个有效数字。' };
  const operator = raw?.operator;
  if (!['+', '-', '*', '/'].includes(operator)) return { status: 'invalid', message: '请选择有效的运算符。' };
  if (operator === '/' && right === 0) return { status: 'invalid', message: '除数不能为零。' };
  return { status: 'valid', input: { left, right, operator } };
}

// @need-ids: REQ_CALC_COMPUTE, FUNC_SUITE_63616C632D636F6D70757465, FUNC_63616C632D636F6D70757465
export function computeCalculator(input) {
  const { left, right, operator } = input;
  let value;
  switch (operator) {
    case '+': value = left + right; break;
    case '-': value = left - right; break;
    case '*': value = left * right; break;
    case '/': value = left / right; break;
    default: return { status: 'invalid', message: '请选择有效的运算符。' };
  }
  return Number.isFinite(value)
    ? { status: 'success', value, message: `计算结果：${value}` }
    : { status: 'invalid', message: '结果超出可表示的数值范围。' };
}

// @need-ids: REQ_CALC_RESULT, FUNC_SUITE_63616C632D726573756C74, FUNC_63616C632D726573756C74
export function calculatorUi(result) {
  return { tone: result.status === 'success' ? 'success' : 'error', message: result.message };
}

// @need-ids: REQ_CALC_ALL, FUNC_SUITE_63616C63756C61746F72, FUNC_63616C63756C61746F72
export async function runCalculation(raw, mode = 'dry-run') {
  if (!['dry-run', 'sandbox'].includes(mode)) throw Error('Unknown mode');
  const trace = [];
  async function step(nodeId, input, fn) {
    const start = performance.now();
    const output = await fn();
    trace.push({ nodeId, input, output, status: output.status === 'invalid' ? 'rejected' : 'ok',
      elapsedMs: Math.round(performance.now() - start) });
    return output;
  }
  const collected = await step('calc-input', raw, () => captureCalculatorInput(raw));
  const valid = await step('calc-validate', collected.draft, () => validateCalculatorInput(collected.draft));
  const result = valid.status === 'valid'
    ? await step('calc-compute', valid.input, () => computeCalculator(valid.input))
    : valid;
  const ui = await step('calc-result', result, () => calculatorUi(result));
  return { mode, status: result.status === 'success' ? 'completed' : 'rejected', result, ui, trace };
}

export async function testCalculatorNode(nodeId, input, mode = 'mock') {
  if (!['calculator', 'calc-input', 'calc-validate', 'calc-compute', 'calc-result'].includes(nodeId)) throw Error('Node not bound to an executable function');
  if (!['mock', 'dry-run', 'sandbox'].includes(mode)) throw Error('Unknown mode');
  if (mode === 'mock') return { nodeId, mode, simulated: true, input, output: { status: 'mock', fixture: input }, elapsedMs: 0 };
  if (nodeId === 'calculator') return runCalculation(input, mode);
  const start = performance.now();
  let output;
  if (nodeId === 'calc-input') output = captureCalculatorInput(input);
  if (nodeId === 'calc-validate') output = validateCalculatorInput(input);
  if (nodeId === 'calc-compute') {
    const validated = validateCalculatorInput(input);
    output = validated.status === 'valid' ? computeCalculator(validated.input) : validated;
  }
  if (nodeId === 'calc-result') output = calculatorUi(input ?? {});
  return { nodeId, mode, simulated: false, input, output, elapsedMs: Math.round(performance.now() - start) };
}
