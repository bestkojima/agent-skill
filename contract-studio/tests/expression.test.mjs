import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { runExpression, testExpressionNode } from '../server/expression.mjs';
import { traceability, exportNeeds, updateGraph, updateRequirement } from '../server/traceability.mjs';
import { api } from '../server/api.mjs';

// @need-ids: REQ_EXPR_ALL, REQ_EXPR_COMPUTE, REQ_EXPR_EVALUATE, REQ_EXPR_RESULT
test('mixed expression returns real evaluation order and parent summary', async () => {
  const run = await runExpression({expression:'12 + 3 × (8 - 4) ÷ 2'});
  assert.equal(run.status, 'completed');
  assert.equal(run.result.value, 18);
  assert.deepEqual(run.result.steps, [
    {index:1,operator:'-',operands:[8,4],result:4},
    {index:2,operator:'*',operands:[3,4],result:12},
    {index:3,operator:'/',operands:[12,2],result:6},
    {index:4,operator:'+',operands:[12,6],result:18},
  ]);
  assert.deepEqual(run.trace.map(t=>t.nodeId), ['expr-input','expr-tokenize','expr-parse','expr-evaluate','expr-compute','expr-result']);
  assert.deepEqual(run.trace.find(t=>t.nodeId==='expr-compute').output, run.result);
});

// @need-ids: REQ_EXPR_PARSE, REQ_EXPR_EVALUATE
test('precedence, parentheses, left associativity and unary signs', async () => {
  for (const [expression, value, operations] of [
    ['2+3*4', 14, ['*','+']],
    ['(2+3)*4', 20, ['+','*']],
    ['8/4/2', 1, ['/','/']],
    ['9-3-2', 4, ['-','-']],
    ['1--2', 3, ['u-','-']],
    ['--3', 3, ['u-','u-']],
    ['2*-3', -6, ['u-','*']],
    ['-(2+3)', -5, ['+','u-']],
    ['-.5 + +2.0e1', 19.5, ['u-','u+','+']],
  ]) {
    const run = await runExpression({expression});
    assert.equal(run.result.value, value, expression);
    assert.deepEqual(run.result.steps.map(s=>s.operator), operations, expression);
  }
});

test('Unicode minus supports binary and unary forms and preserves error positions', async () => {
  const binary = await runExpression({expression:'12 − 3 × (8 − 4) ÷ 2'});
  assert.equal(binary.result.value, 6);
  assert.deepEqual(binary.result.steps.map(step => step.operator), ['-', '*', '/', '-']);
  const unary = await runExpression({expression:'−(2+3)'});
  assert.equal(unary.result.value, -5);
  assert.deepEqual(unary.result.steps.map(step => step.operator), ['+', 'u-']);
  const invalid = await runExpression({expression:'1−a'});
  assert.equal(invalid.status, 'rejected');
  assert.equal(invalid.result.position, 3);
});

// @need-ids: REQ_EXPR_EVALUATE
test('decimal arithmetic uses JavaScript Number semantics without silent rounding', async () => {
  const run = await runExpression({expression:'0.1 + 0.2'});
  assert.equal(run.result.value, 0.30000000000000004);
  assert.equal(run.result.steps[0].result, 0.30000000000000004);
});

// @need-ids: REQ_EXPR_TOKENIZE, REQ_EXPR_PARSE
test('invalid syntax and unsupported characters are reported at positions', async () => {
  for (const [expression, position] of [
    ['', 1], ['2 + a', 5], ['(1+2', 1], ['1+2)', 4], ['2(3)', 2],
    ['2**3', 3], ['()', 2], ['1e309', 1], ['1 + globalThis', 5],
  ]) {
    const run = await runExpression({expression});
    assert.equal(run.status, 'rejected', expression);
    assert.equal(run.result.position, position, expression);
    assert.ok(run.ui.message, expression);
    assert.equal(run.trace.find(t=>t.nodeId==='expr-compute').status, 'rejected', expression);
    assert.equal(run.trace.at(-1).nodeId, 'expr-result', expression);
  }
});

// @need-ids: REQ_EXPR_EVALUATE
test('division by zero and overflow stop evaluation at the operator', async () => {
  for (const [expression, position] of [['1 / (2-2)', 3], ['1e308 * 1e308', 7]]) {
    const run = await runExpression({expression});
    assert.equal(run.status, 'rejected');
    assert.equal(run.result.position, position);
    assert.equal(run.trace.find(t=>t.nodeId==='expr-evaluate').status, 'rejected');
    assert.equal(run.trace.find(t=>t.nodeId==='expr-compute').status, 'rejected');
  }
  const division = await runExpression({expression:'1 / (2-2)'});
  assert.deepEqual(division.result.steps, [{index:1,operator:'-',operands:[2,2],result:0}]);
});

test('single-node execution and mock are separate', async () => {
  const mock = await testExpressionNode('expr-compute',{expression:'1/0'},'mock');
  assert.equal(mock.simulated, true);
  assert.equal(mock.output.status, 'mock');
  const real = await testExpressionNode('expr-compute',{expression:'2+3*4'},'dry-run');
  assert.equal(real.simulated, false);
  assert.equal(real.output.value, 14);
  assert.deepEqual(real.trace.map(t=>t.nodeId), ['expr-tokenize','expr-parse','expr-evaluate','expr-compute']);
});

// @need-ids: REQ_EXPR_INPUT, REQ_EXPR_RESULT
test('HTTP API exposes the nested graph and real calculation', async () => {
  async function request(method, url, body) {
    const req = Readable.from(body ? [JSON.stringify(body)] : []);
    Object.assign(req, {method,url,socket:{remoteAddress:'127.0.0.1'},headers:{host:'localhost:5173','content-type':'application/json'}});
    const res = {setHeader(){},end(content){this.body=JSON.parse(content)}};
    await api(req,res,()=>assert.fail('unexpected next'));
    return res;
  }
  const graph = (await request('GET','/api/traceability?feature=expression')).body;
  assert.equal(graph.featureId,'expression.calculate');
  const compute = graph.projectGraph.nodes.find(n=>n.id==='expr-compute');
  assert.equal(compute.parentId,'expression');
  assert.equal(compute.kind,'group');
  assert.deepEqual(graph.projectGraph.nodes.filter(n=>n.parentId==='expr-compute').map(n=>n.id),['expr-tokenize','expr-parse','expr-evaluate']);
  assert.ok(graph.projectGraph.edges.some(e=>e.source==='expr-input'&&e.target==='expr-compute'));
  assert.ok(graph.projectGraph.edges.some(e=>e.source==='expr-compute'&&e.target==='expr-result'&&e.sourceHandle==='fail'));
  assert.ok(graph.projectGraph.edges.some(e=>e.source==='expr-tokenize'&&e.target==='expr-parse'));
  const run = await request('POST','/api/expression',{expression:'12 + 3 × (8 - 4) ÷ 2'});
  assert.equal(run.body.result.value,18);
  const code = await request('GET','/api/code?nodeId=expr-evaluate');
  assert.equal(code.body.symbol,'evaluateExpression');
  for (const [query,id] of [['','feedback.submit'],['?feature=calculator','calculator.calculate'],['?feature=sum','sum.calculate']]) {
    assert.equal((await request('GET','/api/traceability'+query)).body.featureId,id);
  }
});

test('expression changes do not touch existing feature data', async t => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'expression-trace-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  for(const dir of ['contracts','src','server','tests']) await fs.mkdir(path.join(root,dir));
  const names=['feedback.json','requirements.json','calculator.json','calculator.requirements.json','sum.json','sum.requirements.json','expression.json','expression.requirements.json'];
  for(const name of names) await fs.copyFile(new URL('../contracts/'+name,import.meta.url),path.join(root,'contracts',name));
  const preserved={};
  for(const name of names.slice(0,6)) preserved[name]=await fs.readFile(path.join(root,'contracts',name),'utf8');
  await exportNeeds(root,'expression.calculate');
  const before=await traceability(root,'expression.calculate');
  const graph=structuredClone(before.projectGraph);
  graph.feature.title='Expression fixture';
  const updated=await updateGraph({featureId:'expression.calculate',expectedGraph:before.projectGraph,graph},root);
  const requirement=updated.requirements[0];
  const confirmed=await updateRequirement({featureId:'expression.calculate',action:'confirm',id:requirement.id,revision:requirement.revision,title:requirement.title,description:requirement.description},root);
  assert.equal(confirmed.requirements[0].status,'confirmed');
  assert.equal(confirmed.sphinx.state,'current');
  for(const [name,content] of Object.entries(preserved)) assert.equal(await fs.readFile(path.join(root,'contracts',name),'utf8'),content,name);
  const rst=await fs.readFile(path.join(root,'traceability/expression.rst'),'utf8');
  const functionId=id=>'FUNC_'+Buffer.from(id).toString('hex').toUpperCase();
  assert.ok(rst.includes(':contains: '+functionId('expr-tokenize')+', '+functionId('expr-parse')+', '+functionId('expr-evaluate')));
  assert.ok(rst.includes(':flows_to: '+functionId('expr-compute')));
  assert.ok(rst.includes(':fulfills: REQ_EXPR_COMPUTE'));
});
