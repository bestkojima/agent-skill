import test from 'node:test';
import assert from 'node:assert/strict';
import { projectNeedsGraph } from '../server/needs-projection.ts';
import { buildFunctionTree } from '../src/function-tree.ts';

test('功能树只读规格归属，兼容 contains，忽略需求和跨分支数据流',()=>{
  const graph={feature:{id:'demo'},nodes:[],edges:[]};
  const need=(id,fields={})=>({id,title:id,type:'spec',feature_id:'demo',...fields});
  const needs={
    SPEC_MEAN:need('SPEC_MEAN',{parent_spec:['SPEC_LIST'],fulfills:['REQ_MEAN']}),
    SPEC_SUM:need('SPEC_SUM',{parent_spec:['SPEC_LIST'],flows_to:['SPEC_RENDER']}),
    SPEC_RENDER:need('SPEC_RENDER',{parent_spec:['SPEC_ROOT']}),
    SPEC_LIST:need('SPEC_LIST',{parent_spec:['SPEC_ROOT'],contains:['SPEC_PARSE']}),
    SPEC_PARSE:need('SPEC_PARSE'),
    SPEC_ROOT:need('SPEC_ROOT'),
    REQ_MEAN:need('REQ_MEAN',{type:'req'}),
  };
  const view=projectNeedsGraph(graph,needs,{});
  const tree=buildFunctionTree(view.nodes);
  assert.deepEqual(tree.roots.map(node=>node.id),['SPEC_ROOT']);
  assert.deepEqual(tree.children.get('SPEC_ROOT').map(node=>node.id),['SPEC_RENDER','SPEC_LIST']);
  assert.deepEqual(tree.children.get('SPEC_LIST').map(node=>node.id),['SPEC_MEAN','SPEC_SUM','SPEC_PARSE']);
  assert.equal(tree.parents.has('REQ_MEAN'),false);
  assert.deepEqual(view.edges.map(({source,target})=>[source,target]),[['SPEC_SUM','SPEC_RENDER']]);
  assert.deepEqual(tree.issues,[]);
});

test('父节点缺失或循环时，树报告问题并保留所有节点，源关系不被改写',()=>{
  const nodes=[
    {id:'a',title:'A',parentId:'b'},
    {id:'b',title:'B',parentId:'a'},
    {id:'orphan',title:'Orphan',parentId:'missing'},
  ];
  const tree=buildFunctionTree(nodes);
  assert.deepEqual(tree.roots.map(node=>node.id),['a','orphan']);
  assert.deepEqual(tree.children.get('a').map(node=>node.id),['b']);
  assert.deepEqual(tree.issues,['Orphan：找不到父节点 missing','A：父子关系存在循环']);
  assert.deepEqual(nodes.map(node=>node.parentId),['b','a','missing']);
});
