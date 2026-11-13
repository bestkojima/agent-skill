import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { api } from '../server/api.mjs';
import { prepareCalculatorRequest, normalizeCalculatorResult } from '../src/calculator-input.mjs';

test('统一算式框将符号、负数和科学计数法转为对应接口输入', () => {
  assert.deepEqual(prepareCalculatorRequest('calculator', ' −1.5 × 2e+2 '), {
    path: '/api/calculator', body: { left: '-1.5', operator: '*', right: '2e+2' }
  });
  assert.deepEqual(prepareCalculatorRequest('calculator', '1e-2÷−.5'), {
    path: '/api/calculator', body: { left: '1e-2', operator: '/', right: '-.5' }
  });
  assert.deepEqual(prepareCalculatorRequest('sum', '.5+−2+1e+2'), {
    path: '/api/sum', body: { values: ['.5', '-2', '+1e+2'] }
  });
  assert.deepEqual(prepareCalculatorRequest('expression', '12+3×(8-4)÷2'), {
    path: '/api/expression', body: { expression: '12+3×(8-4)÷2' }
  });
});

test('模式输入不合法时明确报错，不把混合式当成加法或两数运算', () => {
  for (const value of ['', '1+', '1+2×3', '1,2,3', '(1+2)+3']) {
    assert.throws(() => prepareCalculatorRequest('sum', value), /多数字求和/);
  }
  for (const value of ['', '1+2+3', '1÷', '1/2/3']) {
    assert.throws(() => prepareCalculatorRequest('calculator', value), /两数运算/);
  }
  assert.throws(() => prepareCalculatorRequest('other', '1+2'), /未知的计算方式/);
});

test('平均值输入保留空项和非法值，由后端给出实际校验错误', () => {
  for (const text of ['1, -2, .5', '1，-2，.5', '1;-2;.5', '1\n-2\n.5', '1 -2 .5']) {
    assert.deepEqual(prepareCalculatorRequest('average', text), { path: '/api/average', body: { values: ['1', '-2', '.5'] } });
  }
  assert.deepEqual(prepareCalculatorRequest('average', '1+2+3').body.values, ['1', '+2', '+3']);
  assert.deepEqual(prepareCalculatorRequest('average', '1e+2 + −.5').body.values, ['1e+2', '-.5']);
  assert.deepEqual(prepareCalculatorRequest('average', '').body.values, []);
  assert.deepEqual(prepareCalculatorRequest('average', '1,,2').body.values, ['1', '', '2']);
  assert.deepEqual(prepareCalculatorRequest('average', '1,abc,2').body.values, ['1', 'abc', '2']);
  assert.deepEqual(prepareCalculatorRequest('average', '1+2×3').body.values, ['1+2×3']);
});

test('同一输入路由调用真实计算 API 并保留实际追踪与逐步结果', async t => {
  const server = createServer((req, res) => { void api(req, res, () => { res.statusCode = 404; res.end(); }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function run(mode, expression) {
    const request = prepareCalculatorRequest(mode, expression);
    const response = await fetch(base + request.path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request.body)
    });
    assert.equal(response.ok, true);
    return normalizeCalculatorResult(mode, await response.json());
  }
  const two = await run('calculator', '1+2');
  assert.equal(two.result.value, 3);
  assert.ok(two.trace.some(step => step.nodeId === 'calc-compute'));
  const signed = await run('calculator', '-1.5×2e+2');
  assert.equal(signed.result.value, -300);
  const sum = await run('sum', '1+2+3');
  assert.equal(sum.result.value, 6);
  assert.deepEqual(sum.result.steps.map(step => step.result), [1, 3, 6]);
  assert.ok(sum.trace.some(step => step.nodeId === 'sum-accumulate'));
  const twenty = await run('sum', Array.from({ length: 20 }, (_, i) => i + 1).join('+'));
  assert.equal(twenty.result.value, 210);
  assert.equal(twenty.result.steps.length, 20);
  assert.deepEqual(twenty.result.steps.at(-1), { index: 20, operator: '+', operands: [190, 20], result: 210 });
  const mixed = await run('expression', '12+3×(8-4)÷2');
  assert.equal(mixed.result.value, 18);
  assert.deepEqual(mixed.result.steps.map(step => step.result), [4, 12, 6, 18]);
  assert.ok(mixed.trace.some(step => step.nodeId === 'expr-evaluate'));
  const short = await run('sum', '1+2');
  assert.equal(short.result.status, 'invalid');
  assert.match(short.result.message, /至少输入 3 个数字/);
  const zero = await run('calculator', '1÷0');
  assert.equal(zero.result.status, 'invalid');
  assert.match(zero.result.message, /除数不能为零/);
  const average = await run('average', Array.from({ length: 20 }, (_, i) => i + 1).join(', '));
  assert.equal(average.result.value, 10.5);
  assert.equal(average.result.count, 20);
  assert.equal(average.result.total, 210);
  assert.equal(average.result.steps.length, 21);
  assert.deepEqual(average.result.steps.at(-1), { index: 21, operator: '/', operands: [210, 20], result: 10.5 });
  assert.deepEqual(average.trace.map(step => step.nodeId), ['avg-validate', 'avg-accumulate', 'avg-compute']);
  assert.equal((await run('average', '7')).result.value, 7);
  for (const text of ['', '1,,2', '1,abc,2', '1,Infinity']) assert.equal((await run('average', text)).result.status, 'invalid');
});
