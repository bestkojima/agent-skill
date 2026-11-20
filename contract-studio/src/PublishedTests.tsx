import { useEffect, useState } from 'react';
import { api } from './api';
type Case = {id:string;name:string;state:string;message?:string};
type Evidence = {state:string;completedAt?:string;message?:string};
type Response = {context:{evidence:Evidence;backend:{testCases:Case[]}}};
const labels:Record<string,string> = {passed:'通过',failed:'失败',skipped:'跳过',stale:'待复验','not-run':'未运行',unmatched:'未匹配'};
export function PublishedTests({featureId,nodeId}:{featureId:string;nodeId:string}) {
  const [response,setResponse]=useState<{key:string;value?:Response;error?:string}>();
  const [refresh,setRefresh]=useState(0);
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
  return <section className="inspector-body test-evidence">
    <header className="test-evidence-heading"><strong>项目测试报告</strong><button className="link-button" onClick={()=>setRefresh(n=>n+1)}>刷新结果</button></header>
    {current?.error?<p role="alert">{current.error}</p>:!context?<p role="status">正在读取…</p>:<>
      {evidence?.completedAt&&<p className="micro">{new Date(evidence.completedAt).toLocaleString()}</p>}
      {evidence?.message&&<p className="micro">{evidence.message}</p>}
      {context.backend.testCases.length?<ul>{context.backend.testCases.map(test=><li key={test.id}><strong>{labels[test.state]??test.state}</strong> · {test.name} <code>{test.id}</code>{test.message&&<p>{test.message}</p>}</li>)}</ul>:<p>此节点没有可定位的验收测试。</p>}
    </>}
  </section>;
}
