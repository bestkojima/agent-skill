import test from 'node:test';
import assert from 'node:assert/strict';
import { runAverage, testAverageNode, validateAverageInput } from '../server/average.mjs';
import { runSum, validateSumInput, accumulateSum } from '../server/sum.mjs';

// @need-ids: REQ_AVERAGE_ALL, REQ_AVERAGE_ACCUMULATE, REQ_AVERAGE_COMPUTE
// @need test: 平均值：1 至 20 返回总和 210、数量 20、均值 10.5 和真实 21 步
// :id: TEST_AVG_20
// :verifies: REQ_AVERAGE_ALL.AVG_20, REQ_AVERAGE_COMPUTE.AVG_DIVIDE
// @endneed
test('[TEST_AVG_20] 平均值：1 至 20 返回总和 210、数量 20、均值 10.5 和真实 21 步', async () => {
  const values = Array.from({ length: 20 }, (_, i) => i + 1);
  const run = await runAverage({ values });
  assert.equal(run.status, 'completed');
  assert.equal(run.result.value, 10.5);
  assert.equal(run.result.count, 20);
  assert.equal(run.result.total, 210);
  assert.equal(run.result.steps.length, 21);
  assert.deepEqual(run.trace.map(item => item.nodeId), ['avg-validate', 'avg-accumulate', 'avg-compute']);
  assert.ok(run.trace.every(item => item.status === 'ok' && item.elapsedMs >= 0));
  let total = 0;
  for (const [index, value] of values.entries()) {
    assert.deepEqual(run.result.steps[index], {
      index: index + 1, operator: '+', operands: [total, value], result: total + value,
    });
    total += value;
  }
  assert.deepEqual(run.result.steps.at(-1), { index: 21, operator: '/', operands: [210, 20], result: 10.5 });
  assert.deepEqual(run.trace[1].output.steps, run.result.steps.slice(0, -1));
  assert.deepEqual(run.trace[2].output, run.result);
  assert.equal(run.ui.message, '平均值：10.5');
});

// @need-ids: REQ_AVERAGE_ALL, REQ_AVERAGE_VALIDATE, REQ_AVERAGE_COMPUTE
// @need test: 平均值支持单个数字、负数、小数、零和科学计数法
// :id: TEST_AVG_VALUES
// :verifies: REQ_AVERAGE_ALL.AVG_SINGLE, REQ_AVERAGE_ALL.AVG_SIGNED, REQ_AVERAGE_ALL.AVG_DECIMAL
// @endneed
test('[TEST_AVG_VALUES] 平均值支持单个数字、负数、小数、零和科学计数法', async () => {
  for (const [values, expected] of [
    [[1, 2, 3], 2], [[7], 7], [[-2, 0, 5], 1], [[0.5, 1.5], 1],
    [[0], 0], [[' .5 ', '+1.5', '-2e0'], 0], [['1e2', '3e2'], 200],
  ]) {
    const input = { values };
    const original = structuredClone(input);
    const run = await runAverage(input);
    assert.equal(run.result.value, expected);
    assert.equal(run.result.count, values.length);
    assert.equal(run.result.total, expected * values.length);
    assert.equal(run.result.steps.length, values.length + 1);
    assert.deepEqual(input, original);
  }
  assert.deepEqual(validateAverageInput({ values: ['7'] }), { status: 'valid', input: { values: [7] } });
});

// @need-ids: REQ_AVERAGE_VALIDATE
// @need test: 平均值拒绝空输入、空项、非法值与非有限值，不丢弃任何输入项
// :id: TEST_AVG_INVALID
// :verifies: REQ_AVERAGE_VALIDATE.AVG_INVALID
// @endneed
test('[TEST_AVG_INVALID] 平均值拒绝空输入、空项、非法值与非有限值，不丢弃任何输入项', async () => {
  for (const raw of [undefined, null, {}, { values: [] }, { values: '1,2' }]) {
    const run = await runAverage(raw);
    assert.equal(run.status, 'rejected');
    assert.equal(run.result.code, 'EMPTY_INPUT');
    assert.equal('value' in run.result, false);
    assert.equal(run.ui.message, '请至少输入 1 个数字。');
    assert.deepEqual(run.trace.map(item => item.nodeId), ['avg-validate']);
  }
  for (const value of ['', ' ', 'abc', '0x10', '1+2', '1e999', Infinity, -Infinity, NaN, null, true, {}, []]) {
    const run = await runAverage({ values: [1, value, 3] });
    assert.equal(run.status, 'rejected');
    assert.equal(run.result.code, 'INVALID_NUMBER');
    assert.match(run.result.message, /第 2 项/);
    assert.equal(run.ui.tone, 'error');
    assert.equal('value' in run.result, false);
    assert.equal('steps' in run.result, false);
    assert.deepEqual(run.trace.map(item => item.nodeId), ['avg-validate']);
    assert.equal(run.trace[0].status, 'rejected');
  }
});

// @need-ids: REQ_AVERAGE_ACCUMULATE, REQ_AVERAGE_COMPUTE
// @need test: 平均值累加溢出保留已发生的步骤，跳过除法且不返回成功数值
// :id: TEST_AVG_OVERFLOW
// :verifies: REQ_AVERAGE_ACCUMULATE.AVG_OVERFLOW
// @endneed
test('[TEST_AVG_OVERFLOW] 平均值累加溢出保留已发生的步骤，跳过除法且不返回成功数值', async () => {
  const run = await runAverage({ values: [1e308, 1e308] });
  assert.equal(run.status, 'rejected');
  assert.equal(run.result.code, 'NUMERIC_OVERFLOW');
  assert.match(run.result.message, /累加第 2 项后结果超出/);
  assert.deepEqual(run.result.steps, [{ index: 1, operator: '+', operands: [0, 1e308], result: 1e308 }]);
  assert.deepEqual(run.trace.map(item => item.nodeId), ['avg-validate', 'avg-accumulate']);
  assert.equal(run.trace.at(-1).status, 'rejected');
  assert.equal('value' in run.result, false);
  assert.equal('total' in run.result, false);
});

// @need-ids: REQ_AVERAGE_ALL, REQ_AVERAGE_VALIDATE, REQ_AVERAGE_ACCUMULATE, REQ_AVERAGE_COMPUTE
test('平均值节点运行校验、累加与求值；Mock 不执行，未知节点和模式被拒绝', async () => {
  const input = { values: [1, 2, 3] };
  const valid = await testAverageNode('avg-validate', input, 'dry-run');
  assert.equal(valid.output.status, 'valid');
  assert.equal(valid.simulated, false);
  const accumulated = await testAverageNode('avg-accumulate', input, 'dry-run');
  assert.equal(accumulated.output.count, 3);
  assert.equal(accumulated.output.total, 6);
  assert.equal(accumulated.output.steps.length, 3);
  const computed = await testAverageNode('avg-compute', input, 'sandbox');
  assert.equal(computed.output.value, 2);
  assert.equal(computed.output.steps.length, 4);
  const complete = await testAverageNode('average', input, 'dry-run');
  assert.equal(complete.result.value, 2);
  const mock = await testAverageNode('avg-compute', { values: [] }, 'mock');
  assert.equal(mock.simulated, true);
  assert.equal(mock.output.status, 'mock');
  assert.equal('value' in mock.output, false);
  assert.equal((await testAverageNode('avg-compute', { values: [] }, 'dry-run')).output.status, 'invalid');
  assert.equal((await testAverageNode('avg-compute', { values: [1e308, 1e308] }, 'dry-run')).output.code, 'NUMERIC_OVERFLOW');
  await assert.rejects(() => testAverageNode('unregistered', input, 'mock'), /not bound/);
  await assert.rejects(() => testAverageNode('avg-compute', input, 'unknown'), /Unknown mode/);
  await assert.rejects(() => runAverage(input, 'mock'), /Unknown mode/);
});

// @need-ids: REQ_AVERAGE_VALIDATE, REQ_SUM_VALIDATE, REQ_SUM_ACCUMULATE
test('共享数值逻辑保留求和至少 3 项的约束、旧输出和逐项累加格式', async () => {
  assert.equal(validateAverageInput({ values: [7] }).status, 'valid');
  assert.deepEqual(validateSumInput({ values: [7] }), { status: 'invalid', message: '请至少输入 3 个数字。' });
  assert.deepEqual(validateSumInput({ values: [1, 2] }), { status: 'invalid', message: '请至少输入 3 个数字。' });
  assert.deepEqual(accumulateSum({ values: [1, 2, 3] }), {
    status: 'success', value: 6, message: '求和结果：6', steps: [
      { index: 1, value: 1, previous: 0, total: 1 },
      { index: 2, value: 2, previous: 1, total: 3 },
      { index: 3, value: 3, previous: 3, total: 6 },
    ],
  });
  const sum = await runSum({ values: [1, 2, 3] });
  assert.deepEqual(sum.trace.map(item => item.nodeId), ['sum-input', 'sum-validate', 'sum-accumulate', 'sum-result']);
  assert.equal(sum.result.value, 6);
  assert.deepEqual(validateSumInput({ values: ['1', '', '3'] }), { status: 'invalid', message: '第 2 项为空或不是有效数字。' });
});
