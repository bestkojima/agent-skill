import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
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
  assert.equal(featureRegistry.defaultTrace.alias,'suite');
  assert.deepEqual(features.map(feature=>feature.alias),['suite']);
  for(const feature of features){
    assert.equal(feature.graph.feature.id,feature.id);
    assert.equal(featureRegistry.resolveFeature(feature.alias).id,feature.id);
    assert.equal(feature.publishedTests.path,"project/calculator/_build/test-results.json");
    assert.ok(feature.requirementsSource.endsWith('.rst'));
    assert.equal(feature.requirementFile,undefined);
    assert.equal(feature.rstFile,undefined);
  }
  assert.deepEqual(capabilities,[]);
  assert.equal(JSON.stringify(response.body).includes('handle'),false);
  features[0].title='browser change';
  assert.notEqual((await featureCatalog()).features[0].title,'browser change');
});

test('追踪旧别名与规范 ID 共用来源，未知声明在读取及更新前拒绝',async()=>{
  for(const feature of featureRegistry.features){
    const alias=await request('GET',`/api/traceability?feature=${feature.alias}`);
    assert.equal(alias.statusCode,200);assert.equal(alias.body.featureId,feature.id);
  }
  assert.equal((await request('GET','/api/traceability')).body.featureId,'calculator.suite');
  assert.equal((await request('GET','/api/traceability?feature=')).body.featureId,'calculator.suite');
  assert.equal((await request('GET','/api/traceability?feature=calculator.suite')).body.featureId,'calculator.suite');
  const native=(await request('GET','/api/traceability?feature=suite')).body;
  assert.equal(native.source,'project/calculator/requirements.rst');
  assert.deepEqual(native.sphinx,{path:native.source,state:'current'});
  for(const url of ['/api/traceability/graph','/api/traceability/requirement'])assert.equal((await request('POST',url,{featureId:'suite'})).statusCode,403);
  assert.equal((await request('POST','/api/average',{values:[1,2,3]})).statusCode,404);
  for(const url of ['/api/traceability?feature=unknown','/api/node-context?feature=unknown&nodeId=suite'])assert.equal((await request('GET',url)).statusCode,404);
  for(const url of ['/api/traceability/build','/api/traceability/graph','/api/traceability/requirement'])assert.equal((await request('POST',url,{featureId:'unknown'})).statusCode,404);
  assert.equal((await request('POST','/api/submit',{})).statusCode,404);
  assert.equal((await request('GET','/api/traceability?feature=feedback')).statusCode,404);
});

test('节点测试使用本机同源的显式请求，不接受手工用例 ID 或命令',async()=>{
  const url='/api/node-tests/run';
  const scope={featureId:'suite',nodeId:'SPEC_PYCALC_AVERAGE'};
  const origin={origin:'http://localhost:5173'};
  assert.equal((await request('POST',url,scope)).statusCode,403);
  assert.equal((await request('POST',url,scope,{origin:'http://127.0.0.1:8080'})).statusCode,403);
  assert.equal((await request('POST',url,{...scope,testIds:['TEST_PYCALC_SUM20']},origin)).statusCode,400);
  assert.equal((await request('POST',url,{...scope,featureId:'absent'},origin)).statusCode,404);
  assert.equal((await request('POST',url,{...scope,nodeId:'absent'},origin)).statusCode,404);
});

const interpreter=new URL(process.platform==='win32'?'../.venv/Scripts/python.exe':'../.venv/bin/python',import.meta.url);
test('平均值节点只运行直接用例，从结果打开源码且保留全量报告',
  {skip:!existsSync(interpreter)&&'先运行 uv sync --locked 启用项目执行器'},async()=>{
    const report=new URL('../project/calculator/_build/test-results.json',import.meta.url);
    const published=()=>readFile(report).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    const before=await published();
    const result=await request('POST','/api/node-tests/run',{featureId:'suite',nodeId:'SPEC_PYCALC_AVERAGE'},{origin:'http://localhost:5173'});
    assert.equal(result.statusCode,200,result.body.error);
    assert.equal(result.body.state,'passed');
    assert.deepEqual(result.body.cases.map(({id,state,scope})=>[id,state,scope]),[['TEST_PYCALC_AVG20','passed','direct']]);
    const {path,line}=result.body.cases[0].reference;
    const source=await request('GET',`/api/traceability/source?path=${encodeURIComponent(path)}&line=${line}`);
    assert.equal(source.statusCode,200);
    assert.match(source.body.excerpt,/def test_TEST_PYCALC_AVG20/);
    assert.deepEqual(await published(),before);
  });
