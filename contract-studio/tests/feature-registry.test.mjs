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

test('目录保留默认入口并将桌面项目声明为外部报告来源',async()=>{
  const response=await request('GET','/api/features');
  assert.equal(response.statusCode,200);
  const {defaultFeature,features,capabilities}=response.body;
  assert.equal(defaultFeature,'suite');
  assert.equal(featureRegistry.defaultTrace.alias,'feedback');
  assert.deepEqual(features.map(feature=>feature.alias),['suite','feedback']);
  for(const feature of features){
    assert.equal(feature.graph.feature.id,feature.id);
    if(!feature.publishedTests)assert.ok(feature.graph.nodes.some(node=>node.id===feature.rootNodeId));
    if(!feature.publishedTests)assert.equal(feature.frontend.path,`features/${feature.frontend.entry}/client.tsx`);
    assert.equal(featureRegistry.resolveFeature(feature.alias).id,feature.id);
    if(feature.alias==='feedback')assert.deepEqual(feature.draftKeys,{graph:'contract-studio-adapters-v03',base:'contract-studio-project-graph-base-v1',pending:'contract-studio-project-graph-pending-v1',requirements:'contract-studio-requirement-drafts-v1'});
    else assert.equal(feature.publishedTests.path,"project/calculator/_build/test-results.json");
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
  assert.equal((await request('GET','/api/traceability?feature=suite')).body.source,'project/calculator/requirements.rst');
  for(const url of ['/api/traceability/graph','/api/traceability/requirement'])assert.equal((await request('POST',url,{featureId:'suite'})).statusCode,403);
  assert.equal((await request('POST','/api/average',{values:[1,2,3]})).statusCode,404);
  for(const url of ['/api/traceability?feature=unknown','/api/node-context?feature=unknown&nodeId=suite'])assert.equal((await request('GET',url)).statusCode,404);
  for(const url of ['/api/traceability/build','/api/traceability/graph','/api/traceability/requirement'])assert.equal((await request('POST',url,{featureId:'unknown'})).statusCode,404);
  const code=await request('GET','/api/code?nodeId=form');
  assert.equal(code.statusCode,200);assert.equal(code.body.file,'features/feedback/client.tsx');
  assert.match(code.body.excerpt,/function FeedbackPreview/);
});
