import { useCallback, useEffect, useState } from 'react';
import { api } from '../../src/api';
import type { Run, Feedback, BackendAdapter } from '../../src/workbench-types';
import type { FeatureClient, FeaturePanelProps } from '../../src/feature-client';

// @need-ids: REQ_FEEDBACK_FORM
export function FeedbackPreview({onRun,language,adapters}:{onRun:(run:Run)=>void;language:string;adapters:BackendAdapter[]}){
  const [title,setTitle]=useState('建议增加夜间模式');
  const [category,setCategory]=useState('feature');
  const [detail,setDetail]=useState('希望学习页面支持暗色背景');
  const [mode,setMode]=useState<'dry-run'|'sandbox'>('dry-run');
  const [busy,setBusy]=useState(false);
  const [items,setItems]=useState<Feedback[]>([]);
  const [message,setMessage]=useState<{tone:string;message:string}|null>(null);
  const refresh=useCallback(()=>{void api<{items:Feedback[]}>('/api/items').then(x=>setItems(x.items)).catch(()=>{})},[]);
  useEffect(()=>{refresh()},[refresh]);
  const submit=async()=>{
    setBusy(true);setMessage(null);
    try{const result=await api<Run>('/api/submit',{form:{title,category,detail},mode,language});onRun(result);setMessage(result.ui??null);setItems(result.items??[])}
    catch(e){setMessage({tone:'error',message:String(e)})}finally{setBusy(false)}
  };
  const reset=async()=>{await api('/api/reset',{});refresh();setMessage(null)};
  return <section className="preview-panel">
    <div className="panel-heading"><div><div className="eyebrow">真实 React 页面</div><h2>反馈工单</h2></div><button className="link-button" onClick={()=>void reset()}>重置演示数据</button></div>
    <div className="field"><label>标题</label><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={61}/></div>
    <div className="field"><label>类别</label><select value={category} onChange={e=>setCategory(e.target.value)}><option value="feature">功能建议</option><option value="bug">问题反馈</option><option value="other">其他</option></select></div>
    <div className="field"><label>内容</label><textarea rows={2} value={detail} onChange={e=>setDetail(e.target.value)}/></div>
    <div className="micro">校验引擎：{adapters.find(a=>a.id===language)?.label??language} · 其他步骤仍由 Node.js 执行</div>
    <div className="mode-line"><label><input type="radio" checked={mode==='dry-run'} onChange={()=>setMode('dry-run')}/> Dry-run</label><label><input type="radio" checked={mode==='sandbox'} onChange={()=>setMode('sandbox')}/> 内存沙箱写入</label></div>
    <button className="primary-button full" onClick={()=>void submit()} disabled={busy}>{busy?'执行中…':'提交 → 观察节点流'}</button>
    {message&&<div className={`notice notice-${message.tone}`} role="status">{message.message}</div>}
    <div className="list-head"><strong>当前反馈列表</strong><span>{items.length} 条</span></div>
    <div className="feedback-list">{items.map(item=><div className="feedback-item" key={item.id}><strong>{item.title}</strong><span>{item.id} · {item.category==='feature'?'功能':item.category==='bug'?'问题':'其他'}</span></div>)}</div>
    <p className="micro">这里只使用进程内存，不连接真实数据库。Dry-run 不修改列表；Sandbox 的写入刷新或重启演示可重置。</p>
  </section>;
}


export function FeedbackClient({onRun,runtimeOptions,onRuntimeOptionsChange}:FeaturePanelProps){
  const language=String(runtimeOptions.language??'javascript');
  const [adapters,setAdapters]=useState<BackendAdapter[]>([]);
  const [error,setError]=useState('');
  useEffect(()=>{let live=true;void api<{adapters:BackendAdapter[]}>('/api/adapters').then(data=>{if(live)setAdapters(data.adapters)}).catch(reason=>{if(live)setError(String(reason))});return()=>{live=false}},[]);
  return <><div className="adapter-bar"><label htmlFor="adapter-lang">校验节点的后端语言</label><select id="adapter-lang" value={language} onChange={event=>{onRuntimeOptionsChange({language:event.target.value})}}>{(adapters.length?adapters:[{id:'javascript',label:'Node.js / JavaScript',available:true,missing:[],source:'',buildOnFirstUse:false}]).map(adapter=><option key={adapter.id} value={adapter.id} disabled={!adapter.available}>{adapter.label}{adapter.available?'':'（缺少 '+adapter.missing.join(', ')+'）'}</option>)}</select><span className="micro">{error||'只切换「字段校验」的执行语言；其他节点保持不变。编译型语言首次运行会自动编译。'}</span></div><FeedbackPreview onRun={onRun} language={language} adapters={adapters}/></>;
}
const client:FeatureClient={
  Panel:FeedbackClient,
  nodeAnnotation:(node,options)=>node.id==='validate'?`Adapter: ${options.language??'javascript'}`:undefined,
  sourcePath:(node,options)=>`/api/code?nodeId=${encodeURIComponent(node.id)}${node.id==='validate'?`&language=${encodeURIComponent(String(options.language??'javascript'))}`:''}`
};
export default client;
