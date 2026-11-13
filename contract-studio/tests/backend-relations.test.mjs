import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { backendRelations, nodeBackend, backendNeedsText, functionNeedId, acceptanceNeedId } from '../server/backend-relations.mjs';
import { featureRegistry, createFeatureRegistry } from '../server/feature-registry.mjs';
import { nodeContext } from '../server/node-context.mjs';
import { runAverage, testAverageNode } from '../server/average.mjs';

async function averageModel(entities=[]) {
  const graph=JSON.parse(await fs.readFile(new URL('../contracts/calculator-suite.json',import.meta.url),'utf8'));
  const {requirements}=JSON.parse(await fs.readFile(new URL('../contracts/calculator-suite.requirements.json',import.meta.url),'utf8'));
  return {graph,requirements,model:backendRelations(graph,requirements,{feature:featureRegistry.resolveFeature('suite'),entities})};
}

test('node binds its exact function; indexed scope, capability siblings and acceptance cases remain distinct',async()=>{
  const entity={path:'server/average.mjs',symbol:'computeAverage',signature:'function computeAverage(accumulated) {',startLine:30,endLine:38,kind:'function',language:'typescript',markerLines:[29],source:'sphinx-codelinks',indexState:'current'};
  const {model}=await averageModel([entity]);
  const node=nodeBackend(model,'avg-compute',{cases:[{id:'TEST_AVG_20',state:'passed',durationMs:1}]});
  assert.deepEqual(node.functions.map(fn=>fn.symbol),['computeAverage']);
  assert.equal(node.functions[0].scopeState,'current');assert.equal(node.functions[0].startLine,30);
  assert.deepEqual(node.relatedFunctions.map(fn=>fn.symbol),['runAverage','validateAverageInput','accumulateAverage']);
  assert.equal(node.testCases[0].state,'passed');
  assert.ok(node.testCases[0].verifies.some(link=>link.needId==='REQ_AVERAGE_COMPUTE.AVG_DIVIDE'));
  assert.equal(node.testCases[0].relationSource,'requirement-binding');
  assert.equal(node.calls[0].caller,functionNeedId({path:'server/average.mjs',symbol:'runAverage'}));
  assert.ok(node.calls.every(call=>call.source==='declared'));
  assert.ok(node.flows.some(flow=>flow.source==='avg-accumulate'&&flow.sourceKind==='contract-data-flow'));
  assert.equal(model.calls.some(call=>call.caller===functionNeedId({path:'server/average.mjs',symbol:'accumulateAverage'})&&call.callee===node.functions[0].id),false);
  const stale=nodeBackend((await averageModel([{...entity,indexState:'stale'}])).model,'avg-compute');
  assert.equal(stale.functions[0].scopeState,'stale');
  const unresolved=nodeBackend((await averageModel()).model,'avg-compute');
  assert.equal(unresolved.functions[0].scopeState,'unresolved');assert.equal(unresolved.functions[0].startLine,null);
});

test('new features can bind multiple direct functions; explicit capability overrides do not inherit unrelated nodes',()=>{
  const feature={id:'text.length',alias:'length'};
  const cap={id:'text.length',rootNodeId:'length',nodeIds:['length'],runPath:'/length',testPath:'/length/test'};
  const refs=[{path:'server/text.mjs',symbol:'readText'},{path:'server/text.mjs',symbol:'measureText'}];
  const registry=createFeatureRegistry([{features:[feature],capabilities:[cap],routes:[{method:'POST',path:'/length'},{method:'POST',path:'/length/test'}],
    code:[{nodeId:'length',file:refs[0].path,symbol:refs[0].symbol,functions:refs}]}]);
  const graph={nodes:[{id:'length'},{id:'new-node',capabilityId:'text.length'},{id:'unknown',capabilityId:'missing'}],edges:[]};
  const model=backendRelations(graph,[],{registry});
  assert.deepEqual(nodeBackend(model,'length').functions.map(fn=>fn.symbol),['readText','measureText']);
  assert.deepEqual(model.nodes[0].functionIds,model.nodes[1].functionIds);
  assert.deepEqual(model.nodes[2].functionIds,[]);
});

test('derived impl/test entries connect to spec and acceptance parts; unknown criteria stay explicit',async()=>{
  const {graph,requirements,model}=await averageModel();
  const rst=backendNeedsText([model]);
  assert.match(rst,/\.\. impl:: computeAverage/);
  assert.match(rst,/:implements: FUNC_SUITE_/);
  assert.match(rst,/:calls: IMPL_/);
  assert.match(rst,/:id: TEST_AVG_20/);
  assert.match(rst,/:verifies: REQ_AVERAGE_ALL.AVG_20, REQ_AVERAGE_COMPUTE.AVG_DIVIDE/);
  const withoutCriteria=backendRelations(graph,requirements.map(req=>({...req,acceptance:[]})));
  assert.ok(withoutCriteria.testCases.every(item=>item.verifies.every(link=>link.state==='missing-acceptance')));
  assert.doesNotMatch(backendNeedsText([withoutCriteria]),/:verifies:/);
  assert.equal(acceptanceNeedId('REQ_X','AC.ONE'),'REQ_X.PART_41432E4F4E45');
  assert.notEqual(acceptanceNeedId('REQ_X','AC.ONE'),acceptanceNeedId('REQ_X','PART_41432E4F4E45'));
});

test('average contracts describe actual internal inputs and preserve raw-input node trials',async()=>{
  const {graph,model}=await averageModel();
  const raw={values:Array.from({length:20},(_,i)=>i+1)};
  const run=await runAverage(raw);
  for(const step of run.trace) {
    const node=graph.nodes.find(node=>node.id===step.nodeId);
    for(const key of node.inputSchema.required)assert.ok(Object.hasOwn(step.input,key),`${step.nodeId} input.${key}`);
    const output=node.outputSchema.oneOf.find(schema=>schema.properties.status.const===step.output.status);
    for(const key of output.required)assert.ok(Object.hasOwn(step.output,key),`${step.nodeId} output.${key}`);
  }
  assert.deepEqual(run.trace.at(-1).input,{...run.trace[1].output});
  const node=nodeBackend(model,'avg-compute');
  assert.deepEqual(node.inputSchema.required,['count','total','steps']);
  assert.deepEqual(node.trial.inputSchema.required,['values']);
  assert.equal((await testAverageNode('avg-compute',raw,'dry-run')).output.value,10.5);
  assert.deepEqual(run.observedCalls.map(call=>call.callee.symbol),['validateAverageInput','accumulateAverage','computeAverage','averageUi']);
  assert.ok(run.observedCalls.every(call=>call.source==='runtime'&&call.caller.symbol==='runAverage'));
  assert.deepEqual((await runAverage({values:[]})).observedCalls.map(call=>call.callee.symbol),['validateAverageInput','averageUi']);
  assert.deepEqual((await runAverage({values:[1e308,1e308]})).observedCalls.map(call=>call.callee.symbol),['validateAverageInput','accumulateAverage','averageUi']);
});

test('Agent node context uses the same exact backend slice for saved and draft graphs',async()=>{
  const {graph}=await averageModel();
  const saved=await nodeContext({featureId:'calculator.suite',nodeId:'avg-compute'});
  assert.deepEqual(saved.context.implementation.map(fn=>fn.symbol),['computeAverage']);
  assert.equal(saved.context.backend.testCases[0].id,'TEST_AVG_20');
  assert.match(saved.markdown,/REQ_AVERAGE_COMPUTE.AVG_DIVIDE/);
  graph.nodes.find(node=>node.id==='avg-compute').processing+=' draft';
  const draft=await nodeContext({featureId:'calculator.suite',nodeId:'avg-compute',graph});
  assert.deepEqual(draft.context.implementation.map(fn=>fn.symbol),['computeAverage']);
  assert.ok(draft.context.backend.testCases.every(item=>['not-run','stale'].includes(item.state)));
  assert.equal(draft.context.evidence.coversCurrentGraph,false);
});
