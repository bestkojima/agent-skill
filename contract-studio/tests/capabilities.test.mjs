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

test('真实固定测试报告持久化；行为变化过期，布局与重要性变化保持有效',async t=>{
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
  assert.ok(report.cases.length>0);
  assert.ok(report.cases.every(item=>item.state==='not-run'),'unrelated passing tests do not verify registered cases');
  assert.ok(report.completedAt);assert.ok(report.output.includes('real assertion'));
  assert.equal((await capabilityEvidence('average.calculate',root)).state,'passed');
  graph.nodes[0].position.x=9;await fs.writeFile(graphFile,JSON.stringify(graph));
  assert.equal((await capabilityEvidence('average.calculate',root)).state,'passed');
  for(const importance of ['core','key','normal',undefined]) {
    graph.nodes[0].importance=importance;await fs.writeFile(graphFile,JSON.stringify(graph));
    assert.equal((await capabilityEvidence('average.calculate',root)).state,'passed',`importance=${importance}`);
  }
  graph.nodes[0].input='修改后的输入约束';await fs.writeFile(graphFile,JSON.stringify(graph));
  assert.equal((await capabilityEvidence('average.calculate',root)).state,'stale');
  await fs.writeFile(path.join(root,'tests/average.test.mjs'),"import test from 'node:test';test('actual failure',()=>{throw Error('failure evidence')});\n");
  const failure=await runCapabilityTests('average.calculate',root);
  assert.equal(failure.state,'failed');assert.equal(failure.failed,1);assert.notEqual(failure.exitCode,0);
  await fs.mkdir(path.join(root,'features/demo'),{recursive:true});
  await fs.writeFile(path.join(root,'features/demo/client.tsx'),'export function Feature(){return null;}\n');
  assert.equal((await capabilityEvidence('average.calculate',root)).state,'stale','feature modules are part of the inspected candidate');
  await assert.rejects(runCapabilityTests('../untrusted',root),/未知/);
});

test('逐用例证据精确匹配文件和名称，保留失败、跳过、未运行和过期结果',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-cases-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await fs.mkdir(path.join(root,'tests'));
  const cap=listCapabilities().find(item=>item.id==='average.calculate');
  const [passed,failed,skipped,missing]=cap.testCases;
  const testLine=(item,body='()=>{}',options='')=>`test(${JSON.stringify(item.name)},${options}${body});\n`;
  const header="import test from 'node:test';\n";
  const caseFile=path.join(root,passed.file);
  await fs.writeFile(caseFile,header+testLine(passed)+testLine(failed,"()=>{throw Error('specific assertion failed')}")+
    testLine(skipped,'()=>{}',"{skip:'pending fixture'},"));
  await fs.writeFile(path.join(root,'tests/average-api.test.mjs'),header+testLine(missing));
  await fs.writeFile(path.join(root,'tests/calculator-input.test.mjs'),header);

  const [report,sameJob]=await Promise.all([runCapabilityTests(cap.id,root),runCapabilityTests(cap.id,root)]);
  assert.deepEqual(report,sameJob,'concurrent requests share the same execution');
  assert.equal(report.state,'failed');
  assert.deepEqual(report.cases.map(item=>item.state),['passed','failed','skipped','not-run']);
  assert.deepEqual(report.cases[1].verifies,failed.verifies);
  assert.match(report.cases[1].message,/specific assertion failed/);
  assert.equal(report.cases[0].line,2);
  assert.equal(typeof report.cases[0].durationMs,'number');
  assert.equal(report.cases[2].message,'pending fixture');
  assert.match(report.output,/TAP version 13/);
  assert.deepEqual((await capabilityEvidence(cap.id,root)).cases,report.cases);

  await fs.appendFile(caseFile,'// modified candidate\n');
  const stale=await capabilityEvidence(cap.id,root);
  assert.equal(stale.state,'stale');
  assert.deepEqual(stale.cases.map(item=>item.state),['stale','stale','stale','not-run']);
  assert.deepEqual(stale.cases.map(item=>item.observedState),['passed','failed','skipped',undefined]);

  await fs.writeFile(caseFile,header+testLine(passed)+testLine(passed)+
    testLine(failed,"()=>{throw Error('todo is not passed')}",'{todo:true},')+testLine(skipped)+testLine(missing));
  const next=await runCapabilityTests(cap.id,root);
  assert.equal(next.state,'passed',next.output);
  assert.deepEqual(next.cases.map(item=>item.state),['not-run','skipped','passed','passed']);
  assert.match(next.cases[0].message,/无法唯一关联/);
  assert.ok(next.cases.every(item=>!('observedState' in item)),'fresh run replaces stale outcomes');

  await fs.writeFile(caseFile,header+"import fs from 'node:fs/promises';\n"+
    testLine(passed,"async()=>{await fs.appendFile(import.meta.filename,'\\n// changed during execution\\n')}"));
  const changed=await runCapabilityTests(cap.id,root);
  assert.equal(changed.state,'stale');
  assert.equal(changed.cases[0].state,'stale');
  assert.equal(changed.cases[0].observedState,'passed');
  assert.equal(changed.cases[1].state,'not-run');
});
