// @need-ids: REQ_SUM_INPUT
export function captureSumInput(raw) {
  return { status: 'received', draft: raw && typeof raw === 'object' ? raw : {} };
}

// @need-ids: REQ_SUM_VALIDATE
export function validateSumInput(raw) {
  if (!Array.isArray(raw?.values) || raw.values.length < 3) {
    return { status: 'invalid', message: '请至少输入 3 个数字。' };
  }
  const values = [];
  for (let i = 0; i < raw.values.length; i++) {
    const value = raw.values[i];
    if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
      return { status: 'invalid', message: `第 ${i + 1} 项为空或不是有效数字。` };
    }
    const text = String(value).trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
      return { status: 'invalid', message: `第 ${i + 1} 项不是有效数字。` };
    }
    const number = Number(text);
    if (!Number.isFinite(number)) return { status: 'invalid', message: `第 ${i + 1} 项超出可表示的数值范围。` };
    values.push(number);
  }
  return { status: 'valid', input: { values } };
}

// @need-ids: REQ_SUM_ACCUMULATE
export function accumulateSum(input) {
  let total = 0;
  const steps = [];
  for (const [i, value] of input.values.entries()) {
    const previous = total;
    const next = previous + value;
    if (!Number.isFinite(next)) {
      return { status: 'invalid', message: `累加第 ${i + 1} 项后结果超出可表示的数值范围。`, steps };
    }
    total = next;
    steps.push({ index: i + 1, value, previous, total });
  }
  return { status: 'success', value: total, message: `求和结果：${total}`, steps };
}

// @need-ids: REQ_SUM_RESULT
export function sumUi(result) {
  return { tone: result.status === 'success' ? 'success' : 'error', message: result.message };
}

// @need-ids: REQ_SUM_ALL
export async function runSum(raw, mode = 'dry-run') {
  if (!['dry-run', 'sandbox'].includes(mode)) throw Error('Unknown mode');
  const trace = [];
  async function step(nodeId, input, fn) {
    const start = performance.now();
    const output = await fn();
    trace.push({ nodeId, input, output, status: output.status === 'invalid' ? 'rejected' : 'ok',
      elapsedMs: Math.round(performance.now() - start) });
    return output;
  }
  const collected = await step('sum-input', raw, () => captureSumInput(raw));
  const valid = await step('sum-validate', collected.draft, () => validateSumInput(collected.draft));
  const result = valid.status === 'valid'
    ? await step('sum-accumulate', valid.input, () => accumulateSum(valid.input))
    : valid;
  const ui = await step('sum-result', result, () => sumUi(result));
  return { mode, status: result.status === 'success' ? 'completed' : 'rejected', result, ui, trace };
}

export async function testSumNode(nodeId, input, mode = 'mock') {
  if (!['sum', 'sum-input', 'sum-validate', 'sum-accumulate', 'sum-result'].includes(nodeId)) throw Error('Node not bound to an executable function');
  if (!['mock', 'dry-run', 'sandbox'].includes(mode)) throw Error('Unknown mode');
  if (mode === 'mock') return { nodeId, mode, simulated: true, input, output: { status: 'mock', fixture: input }, elapsedMs: 0 };
  if (nodeId === 'sum') return runSum(input, mode);
  const start = performance.now();
  let output;
  if (nodeId === 'sum-input') output = captureSumInput(input);
  if (nodeId === 'sum-validate') output = validateSumInput(input);
  if (nodeId === 'sum-accumulate') {
    const validated = validateSumInput(input);
    output = validated.status === 'valid' ? accumulateSum(validated.input) : validated;
  }
  if (nodeId === 'sum-result') output = sumUi(input ?? {});
  return { nodeId, mode, simulated: false, input, output, elapsedMs: Math.round(performance.now() - start) };
}
