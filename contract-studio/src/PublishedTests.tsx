import { useEffect, useState } from 'react';
import { api } from './api';
import { TraceReference, useSourceEditor, type TraceRef } from './TraceReference';
type Case = {id:string;name:string;state:string;scope:'direct'|'related';message?:string;reference?:TraceRef|null};
type Evidence = {state:string;completedAt?:string;message?:string};
type IndexedFunction = {id:string;symbol:string;path:string;startLine?:number;scopeState:string;source?:TraceRef['source']};
type Response = {context:{evidence:Evidence;implementation:IndexedFunction[];relatedImplementation:IndexedFunction[];backend:{testCases:Case[]};testRun?:{available:boolean;reason?:string};index:{state:string;builtAt?:string}}};
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

function FunctionList({functions,indexState}:{functions:IndexedFunction[];indexState?:string}) {
  const [editor,changeEditor]=useSourceEditor();
  if(!functions.length)return <p className="evidence-note">未找到实现函数。</p>;
  return <div className="indexed-functions">{functions.map(fn=>fn.startLine&&fn.scopeState==='current'&&indexState==='current'?
    <TraceReference key={fn.id} reference={{path:fn.path,line:fn.startLine,source:fn.source}} label={fn.symbol} editor={editor} onEditorChange={changeEditor}/>:
    <div key={fn.id} className="function-location"><code>{fn.symbol}</code><small>{fn.path}</small><p className="evidence-note">{indexState==='stale'?'索引过期，重建后可定位源码。':'暂无可核对的源码行号。'}</p></div>
  )}</div>;
}

export function PublishedEvidence({featureId,nodeId,active,view,indexVersion,requirements,onRequirement}:{
  featureId:string;nodeId:string;active:boolean;view:'overview'|'report'|'implementation'|'hidden';indexVersion:string;
  requirements:{id:string;title:string}[];onRequirement:(id:string)=>void;
}) {
  const [response,setResponse]=useState<{key:string;value?:Response;error?:string}>();
  const [refresh,setRefresh]=useState(0);
  const [running,setRunning]=useState(false);
  const [runError,setRunError]=useState('');
  const [latest,setLatest]=useState<NodeRun|null>(null);
  const key=JSON.stringify([featureId,nodeId,indexVersion]);
  useEffect(()=>{
    if(!active)return;
    let listening=true;
    void api<Response>(`/api/node-context?feature=${encodeURIComponent(featureId)}&nodeId=${encodeURIComponent(nodeId)}`)
      .then(value=>{if(listening)setResponse({key,value})})
      .catch(reason=>{if(listening)setResponse({key,error:String(reason)})});
    return ()=>{listening=false};
  },[featureId,nodeId,active,key,refresh]);
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
  const runButton=context?.testRun&&direct.length>0&&<button type="button" className="primary-button" disabled={running||!context.testRun.available} onClick={()=>void run()}>
    {running?'运行中…':`运行 ${direct.length} 个用例`}
  </button>;
  const unavailable=context?.testRun?.reason??(!direct.length?'没有直接关联的用例。':!context?.testRun?'项目未配置节点测试。':null);
  const outcome=latest&&(resultExpired?'待复验':labels[latest.state]??latest.state);
  const previousStatus=evidence?.completedAt&&<>{labels[evidence.state]??evidence.state} · <time dateTime={evidence.completedAt}>{new Date(evidence.completedAt).toLocaleString('zh-CN',{hour12:false})}</time></>;
  if(view==='hidden')return null;
  if(view==='overview') return <div className="node-evidence-overview">
    <section className="node-evidence-row">
      <h3>需求</h3>
      {requirements.length?requirements.map(requirement=><button type="button" className="evidence-link" key={requirement.id} onClick={()=>onRequirement(requirement.id)}>{requirement.title}<small>{requirement.id}</small></button>):<p className="evidence-note">没有关联需求。</p>}
    </section>
    <section className="node-evidence-row"><h3>实现函数</h3>
      {context?<FunctionList functions={context.implementation.slice(0,1)} indexState={context.index.state}/>:<p className="evidence-note">{current?.error?'未能读取实现函数。':'正在读取函数…'}</p>}
      {context&&context.implementation.length>1&&<details className="evidence-more"><summary>其余实现函数（{context.implementation.length-1}）</summary><FunctionList functions={context.implementation.slice(1)} indexState={context.index.state}/></details>}
    </section>
    <section className="node-evidence-row"><h3>节点测试</h3>
      {current?.error?<p role="alert" className="evidence-note">无法读取测试：{current.error} <button type="button" className="link-button" onClick={()=>setRefresh(n=>n+1)}>重试</button></p>:!context?<p role="status" className="evidence-note">正在读取测试…</p>:<>
        {runButton}
        {unavailable&&<p className="evidence-note">{unavailable}</p>}
        {latest?<p className="evidence-note" role="status"><strong>本次运行：{outcome}</strong>{resultExpired?' · 索引已变化，请重新运行。':''}</p>:!running&&previousStatus&&<p className="evidence-note">上次全量报告：{previousStatus}</p>}
        {runError&&<div className="notice notice-error" role="alert">{runError}</div>}
      </>}
    </section>
  </div>;
  if(view==='implementation')return <section className="inspector-body">
    <div className="property-section-title">实现函数</div>
    {context?<FunctionList functions={context.implementation} indexState={context.index.state}/>:<p className="evidence-note">{current?.error??'正在读取函数…'}</p>}
    {context&&context.relatedImplementation.length>0&&<details className="evidence-more"><summary>相关函数（{context.relatedImplementation.length}）</summary><FunctionList functions={context.relatedImplementation} indexState={context.index.state}/></details>}
  </section>;
  const previous=<>
    {evidence?.message&&(evidence.state==='stale'||!evidence.completedAt)&&<p className="micro">{evidence.message}</p>}
    {direct.length>0&&<CaseList cases={direct}/>}
  </>;
  return <section className="inspector-body test-evidence">
    <header className="test-evidence-heading">{runButton}<button type="button" className="link-button" onClick={()=>setRefresh(n=>n+1)}>刷新报告</button></header>
    {current?.error?<p role="alert">{current.error}</p>:!context?<p role="status">正在读取…</p>:<>
      <p className="micro">{unavailable??'单独运行，不更新全量报告。'}</p>
      {runError&&<div className="notice notice-error" role="alert">{runError}</div>}
      {latest&&<div className="node-test-run">
        <div className="test-scope-heading" role="status"><strong>本次运行</strong><span>{resultExpired?'待复验':labels[latest.state]??latest.state}</span></div>
        {resultExpired?<p className="micro">索引已变化，请重新运行。</p>:latest.state!=='passed'&&latest.message&&<p className="micro">{latest.message}</p>}
        <CaseList cases={resultExpired?latest.cases.map(test=>({...test,state:'stale',reference:null})):latest.cases}/>
      </div>}
      {latest?<details className="related-test-cases"><summary>上次全量报告{previousStatus&&<>：{previousStatus}</>}</summary>{previous}</details>:<>
        {(previousStatus||direct.length>0)&&<div className="test-report-caption">{previousStatus?<>上次全量报告：{previousStatus}</>:'用例'}</div>}{previous}
      </>}
      {related.length>0&&<details className="related-test-cases">
        <summary>相关用例 <span>{related.length}</span></summary>
        <p className="micro">不计入本节点结果。</p>
        <CaseList cases={related}/>
      </details>}
    </>}
  </section>;
}
