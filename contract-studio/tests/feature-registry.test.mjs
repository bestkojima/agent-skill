import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createFeatureRegistry, featureRegistry, featureCatalog } from '../server/feature-registry.mjs';
import { api } from '../server/api.mjs';

async function request(method,url,body,headers={}) {
  const req=Readable.from(body===undefined?[]:[JSON.stringify(body)]);
  Object.assign(req,{method,url,socket:{remoteAddress:'127.0.0.1'},headers:{host:'localhost:5173','content-type':'application/json',...headers}});
  const res={setHeader(){},end(text){this.body=JSON.parse(text);}};
  await api(req,res,()=>assert.fail('Unexpected middleware fallback'));
  return res;
}

test('可信业务声明一次连接图来源、前端、路由和能力，新增声明无需宿主分支',async()=>{
  const feature={id:'text.length',alias:'length',frontend:{entry:'text',feature:'length',mode:'length'}};
  const bundle={id:'text',features:[feature],capabilities:[{id:'text.length',runPath:'/api/text',testPath:'/api/text/test',frontend:feature.frontend}],routes:[
    {method:'POST',path:'/api/text',handle:body=>({value:body.text.length})},
    {method:'POST',path:'/api/text/test',handle:body=>({value:body.input.text.length})}
  ]};
  const registry=createFeatureRegistry([bundle]);
  assert.equal(registry.resolveFeature('length'),feature);
  assert.equal(registry.resolveFeature('text.length'),feature);
  assert.deepEqual(await registry.route('POST','/api/text').handle({text:'abc'}),{value:3});
  assert.deepEqual(await registry.route('POST','/api/text/test').handle({input:{text:'hello'}}),{value:5});
  assert.equal(registry.route('POST','/api/unknown'),undefined);
  assert.throws(()=>createFeatureRegistry([bundle,bundle]),/Duplicate/);
  assert.throws(()=>createFeatureRegistry([{...bundle,routes:[]}]),/Missing trusted routes/);
});

test('目录保留全部旧 URL、草稿标识和默认入口，目录响应不暴露处理函数',async()=>{
  const response=await request('GET','/api/features');
  assert.equal(response.statusCode,200);
  const {defaultFeature,features,capabilities}=response.body;
  assert.equal(defaultFeature,'suite');
  assert.equal(featureRegistry.defaultTrace.alias,'feedback');
  assert.deepEqual(features.map(feature=>feature.alias),['suite','calculator','sum','expression','feedback']);
  for(const feature of features){
    assert.equal(feature.graph.feature.id,feature.id);
    assert.ok(feature.graph.nodes.some(node=>node.id===feature.rootNodeId));
    assert.equal(feature.frontend.path,`features/${feature.frontend.entry}/client.tsx`);
    assert.equal(featureRegistry.resolveFeature(feature.alias).id,feature.id);
    if(feature.alias==='feedback')assert.deepEqual(feature.draftKeys,{graph:'contract-studio-adapters-v03',base:'contract-studio-project-graph-base-v1',pending:'contract-studio-project-graph-pending-v1',requirements:'contract-studio-requirement-drafts-v1'});
    else assert.deepEqual(feature.draftKeys,{graph:`contract-studio-${feature.alias}-graph-v1`,base:`contract-studio-${feature.alias}-graph-base-v1`,pending:`contract-studio-${feature.alias}-graph-pending-v1`,requirements:`contract-studio-${feature.alias}-requirement-drafts-v1`});
  }
  for(const capability of capabilities)assert.ok(features.some(feature=>feature.alias===capability.frontend.feature&&feature.frontend.entry===capability.frontend.entry));
  assert.equal(JSON.stringify(response.body).includes('handle'),false);
  features[0].title='browser change';
  assert.notEqual((await featureCatalog()).features[0].title,'browser change');
});

test('追踪旧别名与规范 ID 共用来源，未知声明在读取及更新前拒绝',async()=>{
  for(const feature of featureRegistry.features){
    const alias=await request('GET',`/api/traceability?feature=${feature.alias}`);
    assert.equal(alias.statusCode,200);assert.equal(alias.body.featureId,feature.id);
  }
  assert.equal((await request('GET','/api/traceability')).body.featureId,'feedback.submit');
  assert.equal((await request('GET','/api/traceability?feature=')).body.featureId,'feedback.submit');
  assert.equal((await request('GET','/api/traceability?feature=calculator.suite')).body.featureId,'calculator.suite');
  for(const url of ['/api/traceability?feature=unknown','/api/node-context?feature=unknown&nodeId=suite'])assert.equal((await request('GET',url)).statusCode,404);
  for(const url of ['/api/traceability/build','/api/traceability/graph','/api/traceability/requirement'])assert.equal((await request('POST',url,{featureId:'unknown'})).statusCode,404);
  const code=await request('GET','/api/code?nodeId=form');
  assert.equal(code.statusCode,200);assert.equal(code.body.file,'features/feedback/client.tsx');
  assert.match(code.body.excerpt,/function FeedbackPreview/);
});

test('节点上下文接口共享保存态和预览，返回草稿来源并保持项目图',async()=>{
  const catalog=await featureCatalog();const graph=catalog.features.find(feature=>feature.alias==='suite').graph;
  const before=JSON.stringify(graph);
  const saved=await request('GET','/api/node-context?feature=suite&nodeId=avg-compute');
  assert.equal(saved.statusCode,200);assert.equal(saved.body.context.node.id,'avg-compute');
  assert.equal(saved.body.context.provenance.graph,'saved');
  graph.nodes.find(node=>node.id==='avg-compute').description+=' draft';
  const preview=await request('POST','/api/node-context/preview',{featureId:'calculator.suite',nodeId:'avg-compute',graph});
  assert.equal(preview.statusCode,200);assert.equal(preview.body.context.provenance.graph,'draft');
  assert.equal(preview.body.context.provenance.semanticChanges,true);
  assert.equal(preview.body.context.evidence.coversCurrentGraph,false);
  assert.match(preview.body.markdown,/draft/);assert.match(preview.body.taskMarkdown,/draft/);
  assert.equal(JSON.stringify((await featureCatalog()).features.find(feature=>feature.alias==='suite').graph),before);
  assert.equal((await request('GET','/api/node-context?feature=suite&nodeId=missing')).statusCode,404);
  assert.equal((await request('POST','/api/node-context/preview',{featureId:'calculator.suite',nodeId:'suite'})).statusCode,400);
  for(const url of ['/api/features','/api/node-context?feature=suite&nodeId=suite'])assert.equal((await request('GET',url,undefined,{origin:'https://example.org'})).statusCode,403);
  assert.equal((await request('POST','/api/node-context/preview',{featureId:'calculator.suite',nodeId:'suite',graph},{origin:'https://example.org'})).statusCode,403);
});
