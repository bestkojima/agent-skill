import { featureRegistry } from './feature-registry.mjs';

const hex=value=>Buffer.from(value,'utf8').toString('hex').toUpperCase();
export const functionNeedId=ref=>`IMPL_${hex(`${ref.path}#${ref.symbol}`)}`;
export const nodeNeedId=(nodeId,feature={})=>`FUNC_${feature.specPrefix??''}${hex(nodeId)}`;
// Existing acceptance IDs may contain dots; encode only IDs that cannot be need parts.
export const acceptancePartId=id=>id.includes('.')||id.startsWith('PART_')?`PART_${hex(id)}`:id;
export const acceptanceNeedId=(requirementId,id)=>`${requirementId}.${acceptancePartId(id)}`;
const requirementNodes=r=>r.nodeIds??[r.nodeId].filter(Boolean);
const unique=values=>[...new Set(values)];

// Join declared bindings to indexed source entities. No source parsing or execution here.
export function backendRelations(graph,requirements,{feature={},entities=[],registry=featureRegistry}={}) {
  const functions=new Map();
  const addFunction=ref=>{
    const id=functionNeedId(ref);
    if(!functions.has(id)) {
      const matches=entities.filter(entity=>entity.path===ref.path&&entity.symbol===ref.symbol);
      const entity=matches.length===1?matches[0]:null;
      functions.set(id,{id,path:ref.path,symbol:ref.symbol,
        signature:entity?.signature??null,startLine:entity?.startLine??null,endLine:entity?.endLine??null,
        kind:entity?.kind??null,language:entity?.language??null,
        scopeState:entity?.indexState??(matches.length>1?'ambiguous':'unresolved'),
        source:entity?.source??'registry',markerLines:entity?.markerLines??[],
        nodeIds:[],specIds:[],requirementIds:[]});
    }
    return functions.get(id);
  };
  const nodes=graph.nodes.map(node=>{
    const capability=(node.capabilityId?registry.capabilities.find(cap=>cap.id===node.capabilityId):registry.capabilities.find(cap=>cap.nodeIds.includes(node.id)))??null;
    const linked=requirements.filter(r=>requirementNodes(r).includes(node.id)).map(r=>r.id);
    const direct=registry.implementationFor(node,capability).map(ref=>{
      const fn=addFunction(ref);
      fn.nodeIds.push(node.id);fn.specIds.push(nodeNeedId(node.id,feature));fn.requirementIds.push(...linked);
      return fn.id;
    });
    return {nodeId:node.id,specId:nodeNeedId(node.id,feature),capabilityId:capability?.id??null,
      requirementIds:linked,functionIds:direct,input:node.input,output:node.output,
      inputSchema:node.inputSchema??null,outputSchema:node.outputSchema??null,
      trial:registry.trials.find(item=>item.capabilityId===capability?.id)??null};
  });
  const directIds=new Set(functions.keys());
  const calls=registry.calls.filter(call=>directIds.has(functionNeedId(call.caller))).map(call=>({
    caller:addFunction(call.caller).id,callee:addFunction(call.callee).id,source:'declared'
  }));
  for(const fn of functions.values())for(const key of ['nodeIds','specIds','requirementIds'])fn[key]=unique(fn[key]);
  const usedCaps=new Set(nodes.map(node=>node.capabilityId));
  const testCases=registry.capabilities.filter(cap=>usedCaps.has(cap.id)).flatMap(cap=>(cap.testCases??[]).map(test=>({
    ...test,capabilityId:cap.id,
    verifies:test.verifies.map(link=>({...link,needId:acceptanceNeedId(link.requirementId,link.acceptanceId),
      state:requirements.some(r=>r.id===link.requirementId&&r.acceptance?.some(ac=>ac.id===link.acceptanceId))?'linked':'missing-acceptance'})),
    relatedFunctionIds:[...functions.values()].filter(fn=>test.verifies.some(link=>fn.requirementIds.includes(link.requirementId))).map(fn=>fn.id),
    relationSource:'requirement-binding'
  })));
  return {nodes,functions:[...functions.values()],calls,
    flows:graph.edges.map(edge=>({...edge,sourceKind:'contract-data-flow'})),testCases,
    requirements:requirements.map(r=>({id:r.id,nodeIds:requirementNodes(r),
      functionIds:[...functions.values()].filter(fn=>fn.requirementIds.includes(r.id)).map(fn=>fn.id),
      acceptance:(r.acceptance??[]).map(ac=>({...ac,needId:acceptanceNeedId(r.id,ac.id),
        testCaseIds:testCases.filter(test=>test.verifies.some(link=>link.requirementId===r.id&&link.acceptanceId===ac.id)).map(test=>test.id)}))}))};
}

export function nodeBackend(relations,nodeId,evidence) {
  const node=relations.nodes.find(item=>item.nodeId===nodeId);
  const ids=new Set(node?.functionIds??[]);
  const requirements=new Set(node?.requirementIds??[]);
  const capabilityNodes=relations.nodes.filter(item=>node?.capabilityId&&item.capabilityId===node.capabilityId);
  const relatedIds=new Set(capabilityNodes.flatMap(item=>item.functionIds));
  return {...node,
    functions:relations.functions.filter(fn=>ids.has(fn.id)),
    relatedFunctions:relations.functions.filter(fn=>relatedIds.has(fn.id)&&!ids.has(fn.id)),
    calls:relations.calls.filter(call=>ids.has(call.caller)||ids.has(call.callee)).map(call=>{
      const ref=id=>{const fn=relations.functions.find(item=>item.id===id);return {path:fn.path,symbol:fn.symbol};};
      return {...call,callerRef:ref(call.caller),calleeRef:ref(call.callee)};
    }),
    flows:relations.flows.filter(flow=>flow.source===nodeId||flow.target===nodeId),
    testCases:relations.testCases.filter(test=>test.verifies.some(link=>requirements.has(link.requirementId))).map(test=>({
      ...test,state:'not-run',...(evidence?.cases??[]).find(result=>result.id===test.id),
      verifies:test.verifies,relatedFunctionIds:test.relatedFunctionIds,relationSource:test.relationSource
    }))};
}

const rstEscape=value=>String(value).replaceAll('\\','\\\\').replaceAll('*','\\*').replaceAll('`','\\`').replaceAll('|','\\|').replaceAll('_','\\_').replaceAll('\n',' ');
export function backendNeedsText(models) {
  const functions=new Map(),testCases=new Map(),calls=new Map();
  for(const model of models) {
    for(const fn of model.functions) {
      const previous=functions.get(fn.id);
      functions.set(fn.id,{...fn,specIds:unique([...(previous?.specIds??[]),...fn.specIds])});
    }
    for(const test of model.testCases)testCases.set(test.id,test);
    for(const call of model.calls)calls.set(`${call.caller}:${call.callee}`,call);
  }
  const lines=[':orphan:','','后端实现与测试','==============','','.. 由功能注册、需求和节点生成；源文件为编辑入口。',''];
  for(const fn of functions.values()) {
    lines.push(`.. impl:: ${rstEscape(fn.symbol)}`,`   :id: ${fn.id}`,`   :source_path: ${fn.path}`,`   :source_symbol: ${fn.symbol}`);
    if(fn.specIds.length)lines.push(`   :implements: ${fn.specIds.join(', ')}`);
    const outgoing=[...calls.values()].filter(call=>call.caller===fn.id).map(call=>call.callee);
    if(outgoing.length)lines.push(`   :calls: ${outgoing.join(', ')}`);
    lines.push('',`   源码：${rstEscape(fn.path)} · ${rstEscape(fn.symbol)}`,'',
      '   函数定位由 CodeLinks 索引提供；calls 来自可信功能注册的调用声明。','');
  }
  for(const test of testCases.values()) {
    const verified=test.verifies.filter(link=>link.state==='linked');
    lines.push(`.. test:: ${rstEscape(test.name)}`,`   :id: ${test.id}`);
    if(verified.length)lines.push(`   :verifies: ${verified.map(link=>link.needId).join(', ')}`);
    lines.push('',`   测试文件：${rstEscape(test.file)}`,'','   执行状态从逐用例测试报告读取。','');
  }
  return lines.join('\n');
}
