import assert from 'node:assert/strict';
import {test} from 'node:test';
import {resolveTestChain} from '../src/test-chain.ts';
import type {Graph, Link, Spec} from '../src/workbench-types';

const node=(id:string,output:string):Spec=>({
  id,title:id,output,input:'',kind:'logic',description:'',parentId:null,position:{x:0,y:0},errors:[],fixture:{},code:'',test:'',
});
const edge=(source:string,target:string):Link=>({id:`${source}-${target}`,source,target,label:''});
const graph:Pick<Graph,'nodes'|'edges'>={
  nodes:[node('list','数字列表'),node('sum','总和'),node('avg','均值'),node('plot','图表')],
  edges:[edge('list','sum'),edge('sum','avg'),edge('sum','plot')],
};

test('selecting in reverse still follows the graph and ignores unselected branches',()=>{
  const chain=resolveTestChain(graph,['avg','sum','list']);
  assert.equal(chain.error,undefined);
  assert.deepEqual(chain.nodes?.map(({id})=>id),['list','sum','avg']);
  assert.deepEqual(chain.edges?.map(({id})=>id),['list-sum','sum-avg']);
});

test('a gap, fork or cycle prevents exporting a single test chain',()=>{
  assert.ok(resolveTestChain(graph,['list','avg']).error);
  assert.ok(resolveTestChain(graph,['sum','avg','plot']).error);
  assert.ok(resolveTestChain({...graph,edges:[edge('list','sum'),edge('sum','list')]},['avg','sum','list']).error);
});

test('the endpoint must have an output; intermediate outputs need not be asserted',()=>{
  const nodes=[node('list',''),node('sum','待填写'),node('avg','均值')];
  assert.ok(resolveTestChain({nodes,edges:graph.edges},['list','sum']).error);
  assert.equal(resolveTestChain({nodes,edges:graph.edges},['list','sum','avg']).error,undefined);
});
