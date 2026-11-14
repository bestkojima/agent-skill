import { parseFiniteValues, accumulateValues } from './numeric-values.mjs';

// @need-ids: REQ_AVERAGE_VALIDATE, FUNC_SUITE_6176672D76616C6964617465
export function validateAverageInput(raw) {
  if (!Array.isArray(raw?.values) || raw.values.length === 0) {
    return { status: 'invalid', code: 'EMPTY_INPUT', message: '请至少输入 1 个数字。' };
  }
  const parsed = parseFiniteValues(raw.values);
  return parsed.status === 'valid' ? parsed : { ...parsed, code: 'INVALID_NUMBER' };
}

function calculationSteps(steps) {
  return steps.map(({ index, previous, value, total }) => ({
    index, operator: '+', operands: [previous, value], result: total,
  }));
}

// @need-ids: REQ_AVERAGE_ACCUMULATE, FUNC_SUITE_6176672D616363756D756C617465
export function accumulateAverage(input) {
  const accumulated = accumulateValues(input.values);
  const steps = calculationSteps(accumulated.steps);
  if (accumulated.status === 'invalid') {
    return { status: 'invalid', code: 'NUMERIC_OVERFLOW', message: accumulated.message, steps };
  }
  return { status: 'success', count: input.values.length, total: accumulated.total, steps,
    message: `已累加 ${input.values.length} 个数字，总和：${accumulated.total}` };
}

// @need-ids: REQ_AVERAGE_COMPUTE, FUNC_SUITE_6176672D636F6D70757465
export function computeAverage(accumulated) {
  const { count, total, steps } = accumulated;
  const value = total / count;
  if (!Number.isFinite(value)) {
    return { status: 'invalid', code: 'NUMERIC_OVERFLOW', message: '平均值超出可表示的数值范围。', steps };
  }
  return { status: 'success', value, count, total, message: `平均值：${value}`,
    steps: [...steps, { index: steps.length + 1, operator: '/', operands: [total, count], result: value }] };
}

// @need-ids: REQ_AVERAGE_ALL
export function averageUi(result) {
  return { tone: result.status === 'success' ? 'success' : 'error', message: result.message };
}

// @need-ids: REQ_AVERAGE_ALL, FUNC_SUITE_61766572616765
export async function runAverage(raw, mode = 'dry-run') {
  if (!['dry-run', 'sandbox'].includes(mode)) throw Error('Unknown mode');
  const trace = [];
  async function step(nodeId, input, fn) {
    const start = performance.now();
    const output = await fn(input);
    trace.push({ nodeId, input, output, status: output.status === 'invalid' ? 'rejected' : 'ok',
      function:{path:'server/average.mjs',symbol:fn.name},
      elapsedMs: Math.round(performance.now() - start) });
    return output;
  }
  const validated = await step('avg-validate', raw, validateAverageInput);
  let result = validated;
  if (validated.status === 'valid') {
    const accumulated = await step('avg-accumulate', validated.input, accumulateAverage);
    result = accumulated.status === 'success'
      ? await step('avg-compute', accumulated, computeAverage)
      : accumulated;
  }
  const ui=averageUi(result);
  const observedCalls=[...trace.map(entry=>({nodeId:entry.nodeId,callee:entry.function})),
    {nodeId:'average',callee:{path:'server/average.mjs',symbol:'averageUi'}}]
    .map(call=>({...call,caller:{path:'server/average.mjs',symbol:'runAverage'},source:'runtime'}));
  return { mode, status: result.status === 'success' ? 'completed' : 'rejected', result,ui,trace,observedCalls };
}

// @need-ids: REQ_AVERAGE_ALL
export async function testAverageNode(nodeId, input, mode = 'mock') {
  if (!['average', 'avg-validate', 'avg-accumulate', 'avg-compute'].includes(nodeId)) {
    throw Error('Node not bound to an executable function');
  }
  if (!['mock', 'dry-run', 'sandbox'].includes(mode)) throw Error('Unknown mode');
  if (mode === 'mock') return { nodeId, mode, simulated: true, input,
    output: { status: 'mock', fixture: input }, elapsedMs: 0 };
  if (nodeId === 'average') return runAverage(input, mode);
  const start = performance.now();
  let output = validateAverageInput(input);
  if (nodeId !== 'avg-validate' && output.status === 'valid') {
    output = accumulateAverage(output.input);
    if (nodeId === 'avg-compute' && output.status === 'success') output = computeAverage(output);
  }
  return { nodeId, mode, simulated: false, input, output,
    elapsedMs: Math.round(performance.now() - start) };
}
