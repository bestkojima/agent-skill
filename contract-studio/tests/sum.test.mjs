import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { runSum, testSumNode } from '../server/sum.mjs';
import { traceability, exportNeeds, updateGraph, updateRequirement } from '../server/traceability.mjs';
import { api } from '../server/api.mjs';

// Check each running total as well as the final result.
// @need-ids: REQ_SUM_ALL, REQ_SUM_ACCUMULATE, REQ_SUM_RESULT
test('1 至 20 实际逐项相加为 210，并返回每一步的运算', async () => {
  const values = Array.from({ length: 20 }, (_, index) => index + 1);
  const run = await runSum({ values });
  assert.equal(run.status, 'completed');
  assert.equal(run.result.value, 210);
  assert.equal(run.result.steps.length, 20);
  assert.deepEqual(run.result.steps[0], { index: 1, value: 1, previous: 0, total: 1 });
  assert.deepEqual(run.result.steps.at(-1), { index: 20, value: 20, previous: 190, total: 210 });
  for (const [index, item] of run.result.steps.entries()) {
    assert.equal(item.index, index + 1);
    assert.equal(item.value, values[index]);
    assert.equal(item.previous + item.value, item.total);
    if (index > 0) assert.equal(item.previous, run.result.steps[index - 1].total);
  }
  assert.deepEqual(run.trace.map(item => item.nodeId), ['sum-input', 'sum-validate', 'sum-accumulate', 'sum-result']);
  assert.deepEqual(run.trace[2].output.steps, run.result.steps);
});

// @need-ids: REQ_SUM_INPUT, REQ_SUM_VALIDATE
test('输入数量至少 3 项，超过 20 项仍按顺序计算', async () => {
  const three = await runSum({ values: ['-2', '2.5', '.25'] });
  assert.equal(three.result.value, 0.75);
  const values = Array.from({ length: 37 }, (_, index) => index + 1);
  const many = await runSum({ values });
  assert.equal(many.result.value, 703);
  assert.equal(many.result.steps.length, 37);
  assert.equal((await runSum({ values: [1, 2] })).ui.message, '请至少输入 3 个数字。');
});

// @need-ids: REQ_SUM_VALIDATE, REQ_SUM_RESULT
test('空项、非法数字和数值越界准确指出位置', async () => {
  for (const [values, message] of [
    [['1', '', '3'], /第 2 项为空/],
    [['1', 'abc', '3'], /第 2 项不是有效数字/],
    [['1', '1e999', '3'], /第 2 项超出/],
    [[1, null, 3], /第 2 项为空或不是有效数字/],
  ]) {
    const run = await runSum({ values });
    assert.equal(run.status, 'rejected');
    assert.equal(run.ui.tone, 'error');
    assert.match(run.ui.message, message);
    assert.equal(run.trace.some(item => item.nodeId === 'sum-accumulate'), false);
    assert.equal(run.trace.at(-1).nodeId, 'sum-result');
  }
});

test('累加溢出诚实报告失败，Mock 不执行运算', async () => {
  const overflow = await runSum({ values: [1e308, 1e308, 1] });
  assert.equal(overflow.status, 'rejected');
  assert.match(overflow.ui.message, /累加第 2 项后结果超出/);
  assert.equal(overflow.result.steps.length, 1);
  assert.equal(overflow.trace.find(item => item.nodeId === 'sum-accumulate').status, 'rejected');
  const mock = await testSumNode('sum-accumulate', { values: [1, 2, 3] }, 'mock');
  assert.equal(mock.simulated, true);
  assert.equal(mock.output.status, 'mock');
  const actual = await testSumNode('sum-accumulate', { values: [1, 2, 3] }, 'dry-run');
  assert.equal(actual.simulated, false);
  assert.equal(actual.output.value, 6);
});

test('API 独立读取三个示例，求和请求返回真实步骤', async () => {
  async function request(method, url, body) {
    const req = Readable.from(body ? [JSON.stringify(body)] : []);
    Object.assign(req, { method, url, socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:5173', 'content-type': 'application/json' } });
    const res = { setHeader() {}, end(content) { this.body = JSON.parse(content); } };
    await api(req, res, () => assert.fail('unexpected next'));
    return res;
  }
  assert.equal((await request('GET', '/api/traceability')).body.featureId, 'feedback.submit');
  assert.equal((await request('GET', '/api/traceability?feature=calculator')).body.featureId, 'calculator.calculate');
  const sum = await request('GET', '/api/traceability?feature=sum');
  assert.equal(sum.body.featureId, 'sum.calculate');
  assert.equal(sum.body.projectGraph.nodes.length, 5);
  const run = await request('POST', '/api/sum', { values: [1, 2, 3] });
  assert.equal(run.body.result.value, 6);
  assert.equal(run.body.result.steps.length, 3);
  const mock = await request('POST', '/api/sum/test', { nodeId: 'sum-accumulate', input: { values: [1, 2, 3] }, mode: 'mock' });
  assert.equal(mock.body.simulated, true);
  const source = await request('GET', '/api/code?nodeId=sum-accumulate');
  assert.equal(source.body.symbol, 'accumulateSum');
});

test('修改求和图和确认需求不会改动计算器或反馈工单数据', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sum-trace-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const dir of ['contracts', 'src', 'server', 'tests']) await fs.mkdir(path.join(root, dir));
  for (const name of ['feedback.json', 'requirements.json', 'calculator.json', 'calculator.requirements.json', 'sum.json', 'sum.requirements.json']) {
    await fs.copyFile(new URL(`../contracts/${name}`, import.meta.url), path.join(root, 'contracts', name));
  }
  const preserved = {};
  for (const name of ['feedback.json', 'requirements.json', 'calculator.json', 'calculator.requirements.json']) {
    preserved[name] = await fs.readFile(path.join(root, 'contracts', name), 'utf8');
  }
  await exportNeeds(root, 'sum.calculate');
  const before = await traceability(root, 'sum.calculate');
  const graph = structuredClone(before.projectGraph);
  graph.feature.title = '求和图测试草稿';
  const updated = await updateGraph({ featureId: 'sum.calculate', expectedGraph: before.projectGraph, graph }, root);
  assert.equal(updated.projectGraph.feature.title, '求和图测试草稿');
  const requirement = updated.requirements[0];
  const confirmed = await updateRequirement({ featureId: 'sum.calculate', action: 'confirm', id: requirement.id,
    revision: requirement.revision, title: requirement.title, description: requirement.description }, root);
  assert.equal(confirmed.requirements[0].status, 'confirmed');
  assert.equal(confirmed.sphinx.state, 'current');
  for (const [name, content] of Object.entries(preserved)) {
    assert.equal(await fs.readFile(path.join(root, 'contracts', name), 'utf8'), content, name);
  }
  const rst = await fs.readFile(path.join(root, 'traceability/sum.rst'), 'utf8');
  assert.match(rst, /REQ_SUM_ALL/);
  assert.doesNotMatch(rst, /REQ_CALC_ALL/);
});
