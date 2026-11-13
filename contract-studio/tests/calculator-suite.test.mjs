import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { traceability, updateRequirement, updateGraph, exportNeeds } from '../server/traceability.mjs';
import { runCalculation } from '../server/calculator.mjs';
import { runSum } from '../server/sum.mjs';
import { runExpression } from '../server/expression.mjs';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function fixture(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'suite-trace-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  for(const dir of ['contracts','src','server','tests','traceability']) await fs.mkdir(path.join(root,dir));
  for(const name of ['calculator.json','sum.json','expression.json','calculator-suite.json','calculator.requirements.json','sum.requirements.json','expression.requirements.json','calculator-suite.requirements.json'])
    await fs.copyFile(path.join(project,'contracts',name),path.join(root,'contracts',name));
  const calcFile=path.join(root,'contracts','calculator.requirements.json');
  const calc=JSON.parse(await fs.readFile(calcFile,'utf8'));
  const item=calc.requirements.find(r=>r.id==='REQ_CALC_ALL');
  Object.assign(item,{status:'confirmed',revision:2,confirmedAt:'2026-01-01T00:00:00.000Z',confirmedText:{title:item.title,description:item.description}});
  await fs.writeFile(calcFile,JSON.stringify(calc));
  await fs.writeFile(path.join(root,'server','marker.mjs'),'// @need-ids: REQ_CALC_ALL, REQ_SUM_ALL, REQ_EXPR_ALL\n');
  await fs.writeFile(path.join(root,'tests','marker.mjs'),'// @need-ids: REQ_CALC_ALL, REQ_SUM_ALL, REQ_EXPR_ALL\n');
  return root;
}
test('统一视图读取原需求及真实三个引擎节点，不改变原始文件',async t=>{
 const root=await fixture(t);const files=['calculator.requirements.json','sum.requirements.json','expression.requirements.json'];
 const before=await Promise.all(files.map(f=>fs.readFile(path.join(root,'contracts',f),'utf8')));
 await exportNeeds(root,'calculator.suite');const suite=await traceability(root,'calculator.suite');
 assert.equal(suite.sphinx.state,'current');assert.equal(suite.projectGraph.nodes.length,25);
 const parents=Object.fromEntries(suite.projectGraph.nodes.map(n=>[n.id,n.parentId]));
 assert.deepEqual(['suite-input','suite-compute','suite-result'].map(id=>parents[id]),['suite','suite','suite']);
 assert.deepEqual(['calculator','sum','expression'].map(id=>parents[id]),['suite-compute','suite-compute','suite-compute']);
 assert.ok(suite.projectGraph.edges.some(e=>e.source==='suite-input'&&e.target==='suite-compute'));
 assert.ok(suite.projectGraph.edges.some(e=>e.source==='suite-compute'&&e.target==='suite-result'&&e.sourceHandle==='ok'));
 assert.ok(suite.projectGraph.edges.some(e=>e.source==='suite-compute'&&e.target==='suite-result'&&e.sourceHandle==='fail'));
 const calc=suite.requirements.find(r=>r.id==='REQ_CALC_ALL');assert.equal(calc.status,'confirmed');assert.equal(calc.sourceFeatureId,'calculator.calculate');assert.equal(calc.code[0].path,'server/marker.mjs');assert.equal(calc.tests[0].path,'tests/marker.mjs');
 const runs=[await runCalculation({left:'6',right:'2',operator:'/'}),await runSum({values:Array.from({length:20},(_,i)=>i+1)}),await runExpression({expression:'12+3*(8-4)/2'})];
 assert.deepEqual(runs.map(r=>r.result.value),[3,210,18]);
 for(const run of runs) for(const step of run.trace) assert.ok(suite.projectGraph.nodes.some(n=>n.id===step.nodeId),step.nodeId);
 assert.deepEqual(await Promise.all(files.map(f=>fs.readFile(path.join(root,'contracts',f),'utf8'))),before);
});
test('统一图可保存节点说明，新需求独立保存，原需求按原来源编辑',async t=>{
 const root=await fixture(t);await exportNeeds(root,'calculator.suite');let suite=await traceability(root,'calculator.suite');
 const graph=structuredClone(suite.projectGraph);graph.nodes.push({id:'new-step',parentId:'suite',title:'新增',description:'职责',input:'输入',processing:'处理',output:'输出',acceptance:'验收',errors:['异常'],position:{x:10,y:10}});
 suite=await updateGraph({featureId:'calculator.suite',expectedGraph:suite.projectGraph,graph},root);
 assert.equal(suite.projectGraph.nodes.at(-1).acceptance,'验收');assert.equal(suite.projectGraph.nodes.at(-1).processing,'处理');
 suite=await updateRequirement({featureId:'calculator.suite',action:'create',id:'REQ_SUITE_NEW',nodeId:'new-step',title:'新增需求',description:'需求内容'},root);
 assert.equal(suite.requirements.find(r=>r.id==='REQ_SUITE_NEW').status,'draft');
 await assert.rejects(updateRequirement({featureId:'calculator.suite',action:'create',id:'REQ_CALC_ALL',nodeId:'different',title:'重复',description:'重复'},root),e=>e.status===409);
 const original=suite.requirements.find(r=>r.id==='REQ_CALC_ALL');
 suite=await updateRequirement({featureId:'calculator.suite',action:'save',id:original.id,revision:original.revision,title:original.title,description:original.description+' 修改'},root);
 assert.equal(suite.requirements.find(r=>r.id==='REQ_CALC_ALL').status,'draft');
 const disk=JSON.parse(await fs.readFile(path.join(root,'contracts','calculator.requirements.json'),'utf8'));
 assert.match(disk.requirements.find(r=>r.id==='REQ_CALC_ALL').description,/修改/);
 assert.equal(suite.sphinx.state,'current');
});
