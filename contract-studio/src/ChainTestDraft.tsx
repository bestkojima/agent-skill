import {useState} from 'react';
import {resolveTestChain} from './test-chain';
import type {Graph} from './workbench-types';

export function ChainTestDraft({graph,ids}:{graph:Graph;ids:readonly string[]}) {
  const [input,setInput]=useState('');
  const [expected,setExpected]=useState('');
  const chain=resolveTestChain(graph,ids);
  if(chain.error!==undefined)return <div className="inspector-body"><p className="evidence-note" role="status">{chain.error}</p></div>;
  const first=chain.nodes[0],last=chain.nodes.at(-1)!;
  const download=()=>{
    if(!expected.trim())return;
    const draft={
      status:'draft',
      featureId:graph.feature.id,
      nodeIds:chain.nodes.map(node=>node.id),
      edgeIds:chain.edges.map(edge=>edge.id),
      input:input.trim(),
      output:last.output,
      expected:expected.trim(),
    };
    const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)+'\n'],{type:'application/json'}));
    const link=document.createElement('a');
    link.href=url;
    link.download='chain-test.draft.json';
    link.click();
    URL.revokeObjectURL(url);
  };
  return <div className="inspector-body chain-test-draft">
    <ol aria-label="测试链路">{chain.nodes.map(node=><li key={node.id}>{node.title}</li>)}</ol>
    <div className="info-pair"><span>输出</span><b>{last.output}</b></div>
    <div className="field"><label htmlFor="chain-input">测试输入</label><textarea id="chain-input" rows={2} placeholder={first.input||'没有输入可留空'} value={input} onChange={event=>setInput(event.target.value)}/></div>
    <div className="field"><label htmlFor="chain-expected">预期输出</label><textarea id="chain-expected" rows={2} value={expected} onChange={event=>setExpected(event.target.value)} required/></div>
    <button type="button" className="primary-button" disabled={!expected.trim()} onClick={download}>导出测试草稿</button>
    <p className="evidence-note">交给项目补成用例后才能运行。</p>
  </div>;
}
