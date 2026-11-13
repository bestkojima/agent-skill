import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Readable } from 'node:stream';
import { api } from '../server/api.mjs';

async function request(method,url,body,headers={}) {
  const req=Readable.from(body===undefined?[]:[JSON.stringify(body)]);
  Object.assign(req,{method,url,socket:{remoteAddress:'127.0.0.1'},headers:{host:'localhost:5173','content-type':'application/json',...headers}});
  const res={setHeader(){},end(text){this.body=JSON.parse(text);}};
  await api(req,res,()=>assert.fail('Unexpected middleware fallback'));
  return res;
}

// @need-ids: REQ_AVERAGE_ALL, REQ_AVERAGE_ACCUMULATE, REQ_AVERAGE_COMPUTE
test('平均值 API 返回 20 项真实计算、能力绑定及全部图节点',async()=>{
  const run=await request('POST','/api/average',{values:Array.from({length:20},(_,i)=>i+1)});
  assert.equal(run.statusCode,200);
  assert.equal(run.body.result.value,10.5);
  assert.equal(run.body.result.total,210);
  assert.equal(run.body.result.count,20);
  assert.equal(run.body.result.steps.length,21);
  assert.deepEqual(run.body.result.steps.at(-1).operands,[210,20]);
  const capabilities=(await request('GET','/api/capabilities')).body.capabilities;
  const cap=capabilities.find(cap=>cap.id==='average.calculate');
  assert.equal(cap.runPath,'/api/average');assert.equal(cap.frontend.mode,'average');
  const graph=JSON.parse(await fs.readFile(new URL('../contracts/calculator-suite.json',import.meta.url),'utf8'));
  for(const id of cap.nodeIds) assert.ok(graph.nodes.some(node=>node.id===id),id);
  for(const step of run.body.trace) assert.ok(cap.nodeIds.includes(step.nodeId));
  assert.equal(graph.nodes.find(node=>node.id==='average').parentId,'suite-compute');
});

// @need-ids: REQ_AVERAGE_ALL, REQ_AVERAGE_VALIDATE
test('平均值 API 错误、节点真实试运行和 Mock 明确区分',async()=>{
  for(const values of [[],[1,'',3],[1,'oops'],[1,'1e999']]) {
    const response=await request('POST','/api/average',{values});
    assert.equal(response.body.status,'rejected');
    assert.equal(response.body.ui.tone,'error');
    assert.equal(response.body.result.value,undefined);
  }
  const actual=await request('POST','/api/average/test',{nodeId:'avg-compute',input:{values:[1,2,3]},mode:'dry-run'});
  assert.equal(actual.body.output.value,2);assert.equal(actual.body.simulated,false);
  const mock=await request('POST','/api/average/test',{nodeId:'avg-compute',input:{values:[1,2,3]},mode:'mock'});
  assert.equal(mock.body.simulated,true);assert.equal(mock.body.output.value,undefined);
  assert.equal((await request('POST','/api/average/test',{nodeId:'invented',input:{values:[1]},mode:'dry-run'})).statusCode,400);
});

test('能力登记不可执行任意测试或命令，源码入口仍可定位',async()=>{
  assert.equal((await request('POST','/api/capabilities/test',{capabilityId:'../../arbitrary'})).statusCode,400);
  assert.equal((await request('POST','/api/capabilities/test',{capabilityId:'average.calculate'},{origin:'https://example.org'})).statusCode,403);
  const code=await request('GET','/api/code?nodeId=avg-compute');
  assert.equal(code.body.file,'server/average.mjs');assert.equal(code.body.symbol,'computeAverage');
  assert.match(code.body.excerpt,/total \/ count/);
  assert.equal((await request('POST','/api/sum',{values:[1,2]})).body.status,'rejected');
});

test('反馈根节点试运行采用所选适配器并保持 Mock 行为',async()=>{
  const invalid=await request('POST','/api/test',{nodeId:'submit',input:{title:'x'},mode:'dry-run',language:'unknown-adapter'});
  assert.equal(invalid.statusCode,400);
  const actual=await request('POST','/api/test',{nodeId:'submit',input:{title:'新增平均值界面',category:'feature',detail:''},mode:'dry-run',language:'javascript'});
  assert.equal(actual.statusCode,200);
  assert.equal(actual.body.trace.find(step=>step.nodeId==='validate').adapter,'javascript');
  const mock=await request('POST','/api/test',{nodeId:'submit',input:{},mode:'mock',language:'unknown-adapter'});
  assert.equal(mock.body.simulated,true);
});
