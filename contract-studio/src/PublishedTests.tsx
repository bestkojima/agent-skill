import { useEffect, useState } from 'react';
import { api } from './api';
import { TraceReference, useSourceEditor, type TraceRef } from './TraceReference';
type Case = {id:string;name:string;state:string;scope:'direct'|'related';message?:string;reference?:TraceRef|null};
type Evidence = {state:string;completedAt?:string;message?:string};
type Response = {context:{evidence:Evidence;backend:{testCases:Case[]};testRun?:{available:boolean;reason?:string};index:{state:string;builtAt?:string}}};
type NodeRun = Evidence & {cases:Case[];indexBuiltAt:string};
const labels:Record<string,string> = {passed:'通过',failed:'失败',skipped:'跳过',stale:'待复验','not-run':'未运行',unmatched:'未匹配'};

function CaseList({cases}:{cases:Case[]}) {
  const [editor,changeEditor]=useSourceEditor();
  return <ul className="test-case-list">{cases.map(test=><li key={test.id}>
    <div className="test-case-line"><strong data-state={test.state}>{labels[test.state]??test.state}</strong><span>{test.name}</span></div>
    <code>{test.id}</code>
    {test.reference&&<TraceReference key={`${test.reference.path}:${test.reference.line}`} reference={test.reference} editor={editor} onEditorChange={changeEditor}/>}
    {test.message&&<p>{test.message}</p>}
  </li>)}</ul>;
}

export function PublishedTests({featureId,nodeId}:{featureId:string;nodeId:string}) {
  const [response,setResponse]=useState<{key:string;value?:Response;error?:string}>();
  const [refresh,setRefresh]=useState(0);
  const [running,setRunning]=useState(false);
  const [runError,setRunError]=useState('');
  const [latest,setLatest]=useState<NodeRun|null>(null);
  const key=featureId+':'+nodeId;
  useEffect(()=>{
    let active=true;
    void api<Response>(`/api/node-context?feature=${encodeURIComponent(featureId)}&nodeId=${encodeURIComponent(nodeId)}`)
      .then(value=>{if(active)setResponse({key,value})})
      .catch(reason=>{if(active)setResponse({key,error:String(reason)})});
    return ()=>{active=false};
  },[featureId,nodeId,key,refresh]);
  const current=response?.key===key?response:undefined;
  const context=current?.value?.context;
  const evidence=context?.evidence;
  const direct=context?.backend.testCases.filter(test=>test.scope==='direct')??[];
  const related=context?.backend.testCases.filter(test=>test.scope==='related')??[];
  const run=async()=>{
    setRunning(true);
    setRunError('');
    setLatest(null);
    try { setLatest(await api<NodeRun>('/api/node-tests/run',{featureId,nodeId})); }
    catch(error) { setRunError(error instanceof Error?error.message:String(error)); }
    finally { setRunning(false); }
  };
  const resultExpired=latest&&(context?.index.state!=='current'||
    Date.parse(context.index.builtAt??'')>Date.parse(latest.indexBuiltAt));
  const previous=<>
    {evidence?.completedAt&&<p className="micro">{new Date(evidence.completedAt).toLocaleString()}</p>}
    {evidence?.message&&(evidence.state==='stale'||!evidence.completedAt)&&<p className="micro">{evidence.message}</p>}
    <div className="test-scope-heading"><strong>直接验证本节点</strong>{direct.length>0&&evidence&&<span>{labels[evidence.state]??evidence.state}</span>}</div>
    {direct.length?<CaseList cases={direct}/>:<p className="micro">还没有直接验收此节点的用例。</p>}
  </>;
  return <section className="inspector-body test-evidence">
    <header className="test-evidence-heading"><strong>节点测试</strong><button className="link-button" onClick={()=>setRefresh(n=>n+1)}>刷新报告</button></header>
    {current?.error?<p role="alert">{current.error}</p>:!context?<p role="status">正在读取…</p>:<>
      {context.testRun&&<div className="node-test-actions">
        <button type="button" className="primary-button" disabled={running||!context.testRun.available} onClick={()=>void run()}>
          {running?'正在运行…':'运行本节点测试'}
        </button>
        {context.testRun.reason?<p className="micro">{context.testRun.reason}</p>:<p className="micro">只运行直接关联的 {direct.length} 个用例，不覆盖全量报告。</p>}
      </div>}
      {runError&&<div className="notice notice-error" role="alert">{runError}</div>}
      {latest&&<div className="node-test-run">
        <div className="test-scope-heading" role="status"><strong>本次运行</strong><span>{resultExpired?'待复验':labels[latest.state]??latest.state}</span></div>
        {resultExpired?<p className="micro">索引已变化，请重新运行。</p>:latest.state!=='passed'&&latest.message&&<p className="micro">{latest.message}</p>}
        <CaseList cases={resultExpired?latest.cases.map(test=>({...test,state:'stale',reference:null})):latest.cases}/>
      </div>}
      {latest?<details className="related-test-cases"><summary>上次全量报告</summary>{previous}</details>:<>
        <div className="test-report-caption">上次全量报告</div>{previous}
      </>}
      {related.length>0&&<details className="related-test-cases">
        <summary>同一需求下的相关用例 <span>{related.length}</span></summary>
        <p className="micro">这些结果不计入本节点的测试状态。</p>
        <CaseList cases={related}/>
      </details>}
    </>}
  </section>;
}
