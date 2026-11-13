import test from 'node:test';
import assert from 'node:assert/strict';
import { graphFocus } from '../src/graph-focus.mjs';
import { resolveFeature, visibleFeatures, capabilityDestination } from '../src/feature-navigation.mjs';

const feature=(alias,entry)=>({id:`${alias}.feature`,alias,frontend:{entry}});
const catalog={defaultFeature:'suite',features:[feature('suite','calculator'),feature('feedback','feedback'),feature('sum','calculator'),feature('new-feature','new-ui')]};
test('工作区导航按登记目录解析旧入口与新增功能，能力跳转不内置模式表',()=>{
  assert.equal(resolveFeature(catalog,'sum',null).alias,'sum');
  assert.equal(resolveFeature(catalog,'sum.feature',null).alias,'sum');
  assert.equal(resolveFeature(catalog,null,'sum').alias,'suite');
  assert.equal(resolveFeature(catalog,null,'feedback').alias,'feedback');
  assert.equal(resolveFeature(catalog,'new-feature',null).frontend.entry,'new-ui');
  assert.deepEqual(visibleFeatures(catalog,'sum').map(item=>item.alias),['suite','feedback','sum','new-feature']);
  const capability={frontend:{entry:'new-ui',feature:'new-feature',mode:'future-mode'}};
  assert.equal(capabilityDestination(catalog,capability).alias,'new-feature');
  assert.equal(capabilityDestination(catalog,{frontend:{entry:'missing',feature:'untrusted'}}),undefined);
});

const node=(id,parentId=null)=>({id,title:`标题 ${id}`,parentId,position:{x:5000,y:9000},kind:'logic'});
test('聚焦只投影当前节点、直连与直接子节点，并保留父功能上下文；不修改原图',()=>{
  const graph={nodes:[node('root'),node('group','root'),node('selected','group'),node('input','group'),node('ok','group'),node('fail','group'),node('child','selected'),node('deep','child'),node('unrelated','root')],edges:[{source:'input',target:'selected'},{source:'selected',target:'ok'},{source:'selected',target:'fail'}]};
  const before=JSON.stringify(graph);
  const view=graphFocus(graph,'selected');
  assert.deepEqual([...view.ids],['selected','input','ok','fail','child']);
  assert.deepEqual(view.ancestors.map(item=>item.id),['root','group']);
  assert.deepEqual(view.positions.get('selected'),{x:300,y:40});
  assert.ok(view.positions.get('input').x<view.positions.get('selected').x);
  assert.ok(view.positions.get('ok').x>view.positions.get('selected').x);
  assert.equal(JSON.stringify(graph),before);
  assert.deepEqual(graphFocus(graph,'root').ancestors,[]);
  assert.equal(graphFocus(graph,'missing').ids.size,0);
});

test('聚焦功能组的直接子节点横排，继续增加时使用三列网格',()=>{
  const graph={nodes:[node('group'),...['one','two','three','four','five'].map(id=>node(id,'group'))],edges:[{source:'one',target:'two'},{source:'two',target:'three'}]};
  const view=graphFocus(graph,'group');
  const positions=['one','two','three','four','five'].map(id=>view.positions.get(id));
  assert.deepEqual(positions.slice(0,3),[{x:20,y:240},{x:300,y:240},{x:580,y:240}]);
  assert.deepEqual(positions.slice(3),[{x:160,y:420},{x:440,y:420}]);
  assert.equal(graph.edges.filter(edge=>view.ids.has(edge.source)&&view.ids.has(edge.target)).length,2);
});
