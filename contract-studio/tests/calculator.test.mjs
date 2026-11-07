import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { runCalculation, testCalculatorNode } from '../server/calculator.mjs';
import { traceability, exportNeeds, updateGraph, updateRequirement } from '../server/traceability.mjs';
import { api } from '../server/api.mjs';

// @need-ids: REQ_CALC_ALL, REQ_CALC_COMPUTE, REQ_CALC_RESULT
test('四则运算执行真实计算并返回实际节点轨迹', async () => {
  for (const [operator, expected] of [['+', 15], ['-', 9], ['*', 36], ['/', 4]]) {
    const run = await runCalculation({left:'12', right:'3', operator});
    assert.equal(run.status, 'completed');
    assert.equal(run.result.value, expected);
    assert.deepEqual(run.trace.map(s => s.nodeId), ['calc-input','calc-validate','calc-compute','calc-result']);
  }
});

// @need-ids: REQ_CALC_INPUT, REQ_CALC_VALIDATE, REQ_CALC_RESULT
test('除零、空输入和非有限数明确拒绝并展示错误', async () => {
  for (const input of [
    {left:'12', right:'0', operator:'/'},
    {left:'', right:'3', operator:'+'},
    {left:'1e999', right:'3', operator:'+'},
  ]) {
    const run = await runCalculation(input);
    assert.equal(run.status, 'rejected');
    assert.equal(run.ui.tone, 'error');
    assert.equal(run.trace.some(s => s.nodeId === 'calc-compute'), false);
    assert.equal(run.trace.at(-1).nodeId, 'calc-result');
  }
  const zero = await runCalculation({left:'12', right:'0', operator:'/'});
  assert.match(zero.ui.message, /除数不能为零/);
});

test('结果超出数值范围显示错误，节点 Mock 不代表真实执行', async () => {
  const overflow = await runCalculation({left:'1e308', right:'1e308', operator:'*'});
  assert.equal(overflow.status, 'rejected');
  assert.match(overflow.ui.message, /范围/);
  assert.equal(overflow.trace.find(s=>s.nodeId==='calc-compute').status, 'rejected');
  const mock = await testCalculatorNode('calc-compute', {left:'1',right:'0',operator:'/'}, 'mock');
  assert.equal(mock.simulated, true);
  assert.equal(mock.output.status, 'mock');
  const actual = await testCalculatorNode('calc-compute', {left:'1',right:'0',operator:'/'}, 'dry-run');
  assert.equal(actual.simulated, false);
  assert.equal(actual.output.status, 'invalid');
});

test('工作台 API 分别返回计算器与反馈图，并执行真实计算', async () => {
  async function request(method, url, body) {
    const req = Readable.from(body ? [JSON.stringify(body)] : []);
    Object.assign(req, {method, url, socket:{remoteAddress:'127.0.0.1'}, headers:{host:'localhost:5173','content-type':'application/json'}});
    const res = {setHeader() {}, end(content) {this.body = JSON.parse(content)}};
    await api(req, res, () => assert.fail('unexpected next'));
    return res;
  }
  assert.equal((await request('GET', '/api/traceability')).body.featureId, 'feedback.submit');
  const calculator = await request('GET', '/api/traceability?feature=calculator');
  assert.equal(calculator.body.featureId, 'calculator.calculate');
  assert.equal(calculator.body.projectGraph.nodes.length, 5);
  const run = await request('POST', '/api/calculator', {left:'8',right:'2',operator:'/'});
  assert.equal(run.body.result.value, 4);
  const mock = await request('POST', '/api/calculator/test', {nodeId:'calc-compute',input:{left:'8',right:'2',operator:'/'},mode:'mock'});
  assert.equal(mock.body.simulated, true);
  const unknown = await request('GET', '/api/traceability?feature=unknown');
  assert.equal(unknown.statusCode, 404);
});

test('计算器和反馈工单的需求与功能图分别保存', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'calculator-trace-'));
  t.after(() => fs.rm(root, {recursive:true, force:true}));
  for (const dir of ['contracts','src','server','tests']) await fs.mkdir(path.join(root, dir));
  for (const name of ['feedback.json','requirements.json','calculator.json','calculator.requirements.json']) {
    await fs.copyFile(new URL(`../contracts/${name}`, import.meta.url), path.join(root, 'contracts', name));
  }
  await exportNeeds(root);
  await exportNeeds(root, 'calculator.calculate');
  const feedbackBefore = await fs.readFile(path.join(root, 'contracts/feedback.json'), 'utf8');
  const requirementsBefore = await fs.readFile(path.join(root, 'contracts/requirements.json'), 'utf8');
  const before = await traceability(root, 'calculator.calculate');
  const graph = structuredClone(before.projectGraph);
  graph.feature.title = '新计算器标题';
  const updated = await updateGraph({featureId:'calculator.calculate', expectedGraph:before.projectGraph, graph}, root);
  assert.equal(updated.projectGraph.feature.title, '新计算器标题');
  const requirement = updated.requirements[0];
  const confirmed = await updateRequirement({featureId:'calculator.calculate',action:'confirm',id:requirement.id,
    revision:requirement.revision,title:requirement.title,description:requirement.description}, root);
  assert.equal(confirmed.requirements[0].status, 'confirmed');
  assert.equal(await fs.readFile(path.join(root, 'contracts/feedback.json'), 'utf8'), feedbackBefore);
  assert.equal(await fs.readFile(path.join(root, 'contracts/requirements.json'), 'utf8'), requirementsBefore);
  assert.equal(confirmed.sphinx.state, 'current');
  const calculatorRst = await fs.readFile(path.join(root, 'traceability/calculator.rst'), 'utf8');
  assert.match(calculatorRst, /REQ_CALC_ALL/);
  assert.doesNotMatch(calculatorRst, /REQ_FEEDBACK_SUBMIT/);
});
