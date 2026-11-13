import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { listCapabilities, capabilityEvidence, runCapabilityTests } from '../server/capabilities.mjs';

test('能力登记保持后端、前端、节点和测试一一可查',()=>{
  const caps=listCapabilities();
  assert.equal(new Set(caps.map(cap=>cap.id)).size,5);
  for(const cap of caps){assert.ok(cap.nodeIds.includes(cap.rootNodeId));assert.ok(cap.runPath&&cap.testPath&&cap.frontend.component&&cap.frontend.path);assert.ok(cap.testFiles.length);}
  caps[0].nodeIds.push('not-persisted');assert.ok(!listCapabilities()[0].nodeIds.includes('not-persisted'));
});

test('真实固定测试报告持久化；行为变化过期，纯布局变化保持有效',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-evidence-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  for(const dir of ['tests','contracts','server'])await fs.mkdir(path.join(root,dir));
  for(const file of listCapabilities().find(cap=>cap.id==='average.calculate').testFiles){
    await fs.writeFile(path.join(root,file),"import test from 'node:test';import assert from 'node:assert/strict';test('real assertion',()=>assert.equal(210/20,10.5));\n");
  }
  const graph={nodes:[{id:'average',title:'平均值',input:'数字',position:{x:1,y:1}}],edges:[]};
  const graphFile=path.join(root,'contracts','calculator-suite.json');await fs.writeFile(graphFile,JSON.stringify(graph));
  assert.equal((await capabilityEvidence('average.calculate',root)).state,'not-run');
  const report=await runCapabilityTests('average.calculate',root);
  assert.equal(report.state,'passed',report.output);assert.equal(report.passed,3);assert.equal(report.failed,0);
  assert.ok(report.completedAt);assert.ok(report.output.includes('real assertion'));
  assert.equal((await capabilityEvidence('average.calculate',root)).state,'passed');
  graph.nodes[0].position.x=9;await fs.writeFile(graphFile,JSON.stringify(graph));
  assert.equal((await capabilityEvidence('average.calculate',root)).state,'passed');
  graph.nodes[0].input='修改后的输入约束';await fs.writeFile(graphFile,JSON.stringify(graph));
  assert.equal((await capabilityEvidence('average.calculate',root)).state,'stale');
  await fs.writeFile(path.join(root,'tests/average.test.mjs'),"import test from 'node:test';test('actual failure',()=>{throw Error('failure evidence')});\n");
  const failure=await runCapabilityTests('average.calculate',root);
  assert.equal(failure.state,'failed');assert.equal(failure.failed,1);assert.notEqual(failure.exitCode,0);
  await assert.rejects(runCapabilityTests('../untrusted',root),/未知/);
});
