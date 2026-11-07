import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, Handle, MarkerType, Position,
  type Node as FlowNode, type NodeProps, type Edge, type Connection,
  type NodeChange, type EdgeChange, useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import seed from '../contracts/feedback.json';

type Kind = 'group' | 'ui' | 'logic' | 'async' | 'action';
type Spec = {
  id:string; parentId:string|null; title:string; kind:Kind; description:string;
  position:{x:number;y:number}; size?:{width:number;height:number};
  input:string;output:string;errors:string[];fixture:Record<string,unknown>;code:string;test:string;
};
type Link = {id:string;source:string;target:string;sourceHandle?:string;targetHandle?:string;label:string};
type Graph={version:number;feature:{id:string;title:string;goal:string};nodes:Spec[];edges:Link[]};
type Step={nodeId:string;input:unknown;output:unknown;elapsedMs:number;status:'ok'|'rejected';adapter?:string};
type BackendAdapter={id:string;label:string;available:boolean;missing:string[];source:string;buildOnFirstUse:boolean};
type Run={runId?:string;mode?:string;trace?:Step[];result?:Record<string,unknown>;ui?:{tone:string;message:string};items?:Feedback[];nodeId?:string;output?:unknown;simulated?:boolean;elapsedMs?:number;error?:string};
type Feedback={id:string;title:string;category:string;detail:string};
type DisplayNode=FlowNode<{spec:Spec;collapsed:boolean;hasChildren:boolean;run?:Step['status']|'mock';toggle:(id:string)=>void;language:string},'contract'>;
const original = seed as Graph;
const JSON_KEY='contract-studio-adapters-v03';
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;
const toGraph=(text:string):Graph=>{
  const g:unknown=JSON.parse(text);
  if(!g||typeof g!=='object'||!('nodes' in g)||!('edges' in g))throw Error('不是功能图 JSON');
  const graph=g as Graph;
  if(!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))throw Error('nodes / edges 必须是数组');
  if(new Set(graph.nodes.map(n=>n.id)).size!==graph.nodes.length)throw Error('节点 ID 重复');
  for(const n of graph.nodes){if(!n.id||!n.position||!n.title)throw Error('节点缺少 id/position/title');}
  for(const e of graph.edges){if(!graph.nodes.some(n=>n.id===e.source)||!graph.nodes.some(n=>n.id===e.target))throw Error(`连线 ${e.id} 引用了不存在的节点`)}
  return graph;
};
const labelFor=(kind:Kind)=>({group:'功能组',ui:'页面',logic:'处理',async:'异步',action:'写入'}[kind]);
async function api<T>(path:string,body?:unknown):Promise<T>{
  const r=await fetch(path,body===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json(); if(!r.ok)throw Error(d.error||`HTTP ${r.status}`);return d as T;
}

function NodeCard({data}:NodeProps<DisplayNode>){
  const {spec,hasChildren,collapsed,run,toggle,language}=data;
  if(spec.kind==='group' && hasChildren && !collapsed){
    return <div className="group-heading">
      <span className="group-name">{spec.title}</span>
      <button className="node-toggle nodrag" onClick={(e)=>{e.stopPropagation();toggle(spec.id)}}>折叠 −</button>
    </div>;
  }
  return <div className={`node-card node-${spec.kind} ${run==='rejected'?'node-failed':''} ${run==='ok'?'node-passed':''}`}>
    <Handle id="in" type="target" position={Position.Left} className="flow-handle"/>
    <div className="node-kicker"><span>{labelFor(spec.kind)}</span><span>{run==='ok'?'✓ 通过':run==='rejected'?'! 拒绝':run==='mock'?'○ Mock':''}</span></div>
    <div className="node-name">{spec.title}</div>{spec.id==='validate'&&<div className="node-runtime">Adapter: {language}</div>}
    {hasChildren&&<button className="node-toggle nodrag" onClick={(e)=>{e.stopPropagation();toggle(spec.id)}}>展开子节点 +</button>}
    <Handle id="ok" type="source" position={Position.Right} style={{top:'36%'}} className="flow-handle"/>
    <Handle id="fail" type="source" position={Position.Right} style={{top:'76%',background:'#c27d56'}} className="flow-handle"/>
  </div>;
}
const nodeTypes={contract:NodeCard};

function Fit({value}:{value:number}){
  const flow=useReactFlow();
  useEffect(()=>{const t=setTimeout(()=>void flow.fitView({padding:.14,duration:180}),50);return()=>clearTimeout(t)},[flow,value]);
  return null;
}

function FeedbackPreview({onRun,language,adapters}:{onRun:(run:Run)=>void;language:string;adapters:BackendAdapter[]}){
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

function Studio(){
  const [graph,setGraph]=useState<Graph>(()=>{try{return toGraph(localStorage.getItem(JSON_KEY)??JSON.stringify(original))}catch{return clone(original)}});
  const [selectedId,setSelectedId]=useState('lookup');
  const [selectedLanguage,setSelectedLanguage]=useState('javascript');
  const [adapters,setAdapters]=useState<BackendAdapter[]>([]);
  const [adapterError,setAdapterError]=useState('');
  useEffect(()=>{let live=true;void api<{adapters:BackendAdapter[]}>('/api/adapters').then(d=>{if(live)setAdapters(d.adapters)}).catch(e=>{if(live)setAdapterError(String(e))});return()=>{live=false}},[]);
  const [collapsed,setCollapsed]=useState<Set<string>>(new Set());
  const [tab,setTab]=useState<'test'|'code'|'trace'>('test');
  const [fixture,setFixture]=useState('');
  const [mode,setMode]=useState<'mock'|'dry-run'|'sandbox'>('dry-run');
  const [nodeResult,setNodeResult]=useState<Run|null>(null);
  const [trace,setTrace]=useState<Step[]>([]);
  const [source,setSource]=useState<{file:string;symbol:string;excerpt:string}|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [fitVersion,setFitVersion]=useState(0);
  const fileRef=useRef<HTMLInputElement>(null);
  const selected=graph.nodes.find(n=>n.id===selectedId);
  const degree={in:graph.edges.filter(x=>x.target===selectedId).length,out:graph.edges.filter(x=>x.source===selectedId).length};
  useEffect(()=>{localStorage.setItem(JSON_KEY,JSON.stringify(graph))},[graph]);
  useEffect(()=>{setFixture(JSON.stringify(selected?.fixture??{},null,2));setNodeResult(null);setError('');setSource(null)},[selectedId]);
  useEffect(()=>{if(tab!=='code'||!selected)return;let live=true;void api<{file:string;symbol:string;excerpt:string}>(`/api/code?nodeId=${encodeURIComponent(selected.id)}${selected.id==='validate'?`&language=${encodeURIComponent(selectedLanguage)}`:''}`).then(d=>{if(live)setSource(d)}).catch(()=>{if(live)setSource(null)});return()=>{live=false}},[selectedId,tab,selectedLanguage]);
  const toggle=useCallback((id:string)=>{setCollapsed(old=>{const next=new Set(old);if(next.has(id))next.delete(id);else next.add(id);return next});setFitVersion(n=>n+1)},[]);
  const byId=useMemo(()=>new Map(graph.nodes.map(n=>[n.id,n])),[graph.nodes]);
  const hidden=useCallback((n:Spec)=>{let p=n.parentId;const walked=new Set<string>();while(p&&!walked.has(p)){if(collapsed.has(p))return true;walked.add(p);p=byId.get(p)?.parentId??null}return false},[collapsed,byId]);
  const statuses=useMemo(()=>Object.fromEntries(trace.map(t=>[t.nodeId,t.status])),[trace]);
  const flowNodes=useMemo<DisplayNode[]>(()=>graph.nodes.map(n=>{
    const hasChildren=graph.nodes.some(x=>x.parentId===n.id);
    const folded=hasChildren&&collapsed.has(n.id);
    return {id:n.id,type:'contract',parentId:n.parentId??undefined,position:n.position,
      style:{width:hasChildren&&!folded?(n.size?.width??970):n.kind==='group'?190:176,height:hasChildren&&!folded?(n.size?.height??415):n.kind==='group'?85:98},
      hidden:hidden(n),selected:n.id===selectedId,
      data:{spec:n,hasChildren,collapsed:folded,run:statuses[n.id],toggle,language:selectedLanguage},
    };
  }),[graph.nodes,collapsed,hidden,selectedId,statuses,toggle,selectedLanguage]);
  const flowEdges=useMemo<Edge[]>(()=>graph.edges.map(e=>({
    ...e,id:e.id,sourceHandle:e.sourceHandle??'ok',targetHandle:e.targetHandle??'in',type:'smoothstep',
    hidden:hidden(byId.get(e.source)!)||hidden(byId.get(e.target)!),
    animated:!!statuses[e.target],style:{stroke:statuses[e.target]?'#178367':'#94a3b8',strokeWidth:1.5},
    markerEnd:{type:MarkerType.ArrowClosed,color:'#94a3b8',width:16,height:16},
    labelStyle:{fontSize:10,fill:'#62748a'},labelBgStyle:{fill:'#fff',opacity:.9}
  })),[graph.edges,byId,hidden,statuses]);
  const onNodesChange=useCallback((changes:NodeChange<DisplayNode>[])=>{
    setGraph(g=>{let updated=g.nodes;for(const c of changes){if(c.type==='position'&&c.position){updated=updated.map(n=>n.id===c.id?{...n,position:c.position!}:n)}}return updated===g.nodes?g:{...g,nodes:updated}});
  },[]);
  const onEdgesChange=useCallback((changes:EdgeChange[])=>{
    const deleted=new Set(changes.filter(x=>x.type==='remove').map(x=>x.id));
    if(deleted.size)setGraph(g=>({...g,edges:g.edges.filter(e=>!deleted.has(e.id))}));
  },[]);
  const onConnect=useCallback((c:Connection)=>{
    if(!c.source||!c.target||c.source===c.target)return;
    const id=`edge-${Date.now()}`;
    setGraph(g=>({...g,edges:[...g.edges,{id,source:c.source,target:c.target,sourceHandle:c.sourceHandle??'ok',targetHandle:c.targetHandle??'in',label:c.sourceHandle==='fail'?'失败':'下一步'}]}));
  },[]);
  const update=(patch:Partial<Spec>)=>setGraph(g=>({...g,nodes:g.nodes.map(n=>n.id===selectedId?{...n,...patch}:n)}));
  const remove=()=>{if(selectedId==='submit')return;setGraph(g=>({...g,nodes:g.nodes.filter(n=>n.id!==selectedId),edges:g.edges.filter(e=>e.source!==selectedId&&e.target!==selectedId)}));setSelectedId('submit')};
  const addNode=()=>{
    const id=`step-${Date.now().toString(36)}`;
    const node:Spec={id,parentId:'submit',title:'待实现功能',kind:'logic',description:'请先描述输入、处理、输出及异常。',position:{x:35,y:260},input:'Any',output:'Any',errors:[],fixture:{},code:'',test:''};
    setGraph(g=>({...g,nodes:[...g.nodes,node]}));setCollapsed(new Set());setSelectedId(id);setFitVersion(n=>n+1);
  };
  const runSelected=async()=>{
    if(!selected)return;setError('');setBusy(true);
    try{const input=JSON.parse(fixture);const result=await api<Run>('/api/test',{nodeId:selected.id,input,mode,language:selectedLanguage});setNodeResult(result);
      if(result.trace)setTrace(result.trace);else setTrace([{nodeId:selected.id,input,output:result.output,status:(result.output as {status?:string})?.status==='invalid'||(result.output as {status?:string})?.status==='duplicate'?'rejected':'ok',elapsedMs:result.elapsedMs??0}]);
    }catch(e){setError(String(e))}finally{setBusy(false)};
  };
  const exportGraph=()=>{const blob=new Blob([JSON.stringify(graph,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='contract.feedback.json';a.click();URL.revokeObjectURL(url)};
  const importGraph=async(file?:File)=>{if(!file)return;try{const g=toGraph(await file.text());setGraph(g);setSelectedId(g.nodes[0]?.id??'');setTrace([]);setCollapsed(new Set());setFitVersion(n=>n+1)}catch(e){setError(String(e))}};
  const selectNode=(id:string)=>{setSelectedId(id);setTab('test');setError('')};
  const onFullRun=(run:Run)=>{setTrace(run.trace??[]);setNodeResult(run);setError('')};
  return <div className="studio-shell">
    <header className="topbar"><div className="brand"><div className="brand-symbol">◇</div><div><strong>Contract Studio</strong><span>让功能可见，让实现可验</span></div></div><div className="top-actions"><button onClick={addNode}>＋ 添加节点</button><button onClick={exportGraph}>导出 JSON</button><button onClick={()=>fileRef.current?.click()}>导入</button><button onClick={()=>{setGraph(clone(original));setSelectedId('lookup');setCollapsed(new Set());setTrace([]);setFitVersion(n=>n+1)}}>重置画布</button><input hidden type="file" ref={fileRef} accept=".json,application/json" onChange={e=>{void importGraph(e.target.files?.[0]);e.target.value=''}}/></div></header>
    <div className="subheader"><span>示例项目 / <b>反馈工单</b></span><span className="sub-caption">同一份契约 · React 前端 · 多语言校验节点</span></div>
    <div className="adapter-bar"><label htmlFor="adapter-lang">校验节点的后端语言</label><select id="adapter-lang" value={selectedLanguage} onChange={e=>{setSelectedLanguage(e.target.value);setNodeResult(null);setSource(null);setTrace([])}}>{(adapters.length?adapters:[{id:'javascript',label:'Node.js / JavaScript',available:true,missing:[],source:'',buildOnFirstUse:false}]).map(a=><option key={a.id} value={a.id} disabled={!a.available}>{a.label}{a.available?'':'（缺少 '+a.missing.join(', ')+'）'}</option>)}</select><span className="micro">{adapterError||'只切换「字段校验」的执行语言；其他节点保持不变。编译型语言首次运行会自动编译。'}</span></div>
    <div className="workspace">
      <section className="canvas">
        <div className="canvas-header"><strong>功能流程</strong><span>双击父功能折叠 / 展开；点击节点查看输入输出</span><button onClick={()=>toggle('submit')}>{collapsed.has('submit')?'展开全部':'折叠功能'}</button></div>
        <ReactFlow nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_,n)=>selectNode(n.id)} onNodeDoubleClick={(_,n)=>{if(graph.nodes.some(x=>x.parentId===n.id))toggle(n.id)}} onPaneClick={()=>{}} fitView fitViewOptions={{padding:.13}} minZoom={.35} maxZoom={1.5} deleteKeyCode={null} defaultEdgeOptions={{type:'smoothstep'}}>
          <Background gap={22} size={1} color="#e6ebf0"/><Controls position="bottom-left" showInteractive={false}/>
          <Fit value={fitVersion}/>
        </ReactFlow>
        <div className="canvas-footer"><span>连线表示业务数据 / 分支，不表示调用栈或线程数量。</span><span>{graph.nodes.length} 节点 · {graph.edges.length} 条边</span></div>
      </section>
      <aside className="right-side">
        <FeedbackPreview onRun={onFullRun} language={selectedLanguage} adapters={adapters}/>
        <section className="inspector">
          <div className="panel-heading"><div><div className="eyebrow">节点检查器</div><h2>{selected?.title??'选择节点'}</h2></div><div className="degree">入 {degree.in} / 出 {degree.out}</div></div>
          {selected&&<>
            <p className="description">{selected.description}</p>
            <div className="info-pair"><span>输入</span><b>{selected.input}</b></div><div className="info-pair"><span>输出</span><b>{selected.output}</b></div>
            <div className="tabs">{(['test','trace','code'] as const).map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t==='test'?'测试':t==='trace'?'日志':'代码映射'}</button>)}</div>
            {tab==='test'&&<div className="inspector-body">
              <details className="contract-editor"><summary>编辑节点契约</summary>
                <div className="field"><label>功能名称</label><input value={selected.title} onChange={e=>update({title:e.target.value})}/></div>
                <div className="field"><label>处理行为</label><textarea rows={2} value={selected.description} onChange={e=>update({description:e.target.value})}/></div>
                <div className="field"><label>输入</label><input value={selected.input} onChange={e=>update({input:e.target.value})}/></div>
                <div className="field"><label>输出</label><input value={selected.output} onChange={e=>update({output:e.target.value})}/></div>
              </details>
              <div className="field"><label>模拟输入 JSON</label><textarea className="json-area" rows={5} spellCheck={false} value={fixture} onChange={e=>setFixture(e.target.value)}/></div>
              <button className="link-button" onClick={()=>{try{const fixtureObj=JSON.parse(fixture);if(!fixtureObj||typeof fixtureObj!=='object'||Array.isArray(fixtureObj))throw Error('Fixture 必须是对象');update({fixture:fixtureObj});setError('')}catch(e){setError(String(e))}}}>将输入保存为节点 Fixture</button>
              <div className="mode-line"><label><input type="radio" checked={mode==='mock'} onChange={()=>setMode('mock')}/> Mock</label><label><input type="radio" checked={mode==='dry-run'} onChange={()=>setMode('dry-run')}/> Dry-run</label><label><input type="radio" checked={mode==='sandbox'} onChange={()=>setMode('sandbox')}/> Sandbox</label></div>
              <div className="row-actions"><button className="primary-button" onClick={()=>void runSelected()} disabled={busy}>{busy?'测试中…':'测试此节点'}</button>{selected.id!=='submit'&&<button onClick={remove}>删除节点</button>}</div>
              {error&&<div className="notice notice-error">{error}</div>}
              {nodeResult&&<div className="result"><span className="result-head">运行结果 {nodeResult.simulated?'（仅 Mock）':''}{selected.id==='validate'?` · ${selectedLanguage}`:''}</span><pre>{JSON.stringify(nodeResult.output??nodeResult.result??nodeResult,null,2)}</pre></div>}
            </div>}
            {tab==='trace'&&<div className="inspector-body"><div className="micro">节点执行记录来自真实 Node.js 运行结果，不是模型推测的流程。</div>{trace.length?trace.map((s,i)=><div className={`trace-step ${s.nodeId===selectedId?'highlight':''}`} key={i}><div className="trace-line"><b>{s.nodeId}</b><span>{s.status} · {s.elapsedMs}ms {s.adapter?`· ${s.adapter}`:''}</span></div><details><summary>查看输入输出</summary><pre>{JSON.stringify({input:s.input,output:s.output},null,2)}</pre></details></div>):<div className="empty">提交右侧表单或测试单个节点后查看。</div>}</div>}
            {tab==='code'&&<div className="inspector-body"><p className="micro">功能优先；代码映射仅是可验证证据，不展开全仓调用关系。</p><div className="code-ref">{selected.code||'尚未绑定实现'}</div><div className="code-ref">{selected.test||'尚未绑定测试'}</div>{source?<pre className="source">{source.excerpt}</pre>:<div className="empty">{selected.code?'读取源代码映射…':'新增节点尚未实现；不能假装测试通过。'}</div>}</div>}
          </>}
        </section>
      </aside>
    </div>
    <footer className="footer"><span>Contract JSON 是意图；Node Runner 与页面实测才是证据。</span><span>v0.3 · 多语言 Adapter · React 前端</span></footer>
  </div>;
}
export default function App(){return <ReactFlowProvider><Studio/></ReactFlowProvider>}
