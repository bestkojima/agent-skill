import { parseFiniteValues, accumulateValues } from './numeric-values.mjs';

// @need-ids: REQ_SUM_INPUT
export function captureSumInput(raw) {
  return { status: 'received', draft: raw && typeof raw === 'object' ? raw : {} };
}

// @need-ids: REQ_SUM_VALIDATE
export function validateSumInput(raw) {
  if (!Array.isArray(raw?.values) || raw.values.length < 3) {
    return { status: 'invalid', message: '请至少输入 3 个数字。' };
  }
  return parseFiniteValues(raw.values);
}

// @need-ids: REQ_SUM_ACCUMULATE
export function accumulateSum(input) {
  const result = accumulateValues(input.values);
  if (result.status === 'invalid') return result;
  const { total, steps } = result;
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
