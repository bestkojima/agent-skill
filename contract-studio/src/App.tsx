import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, Handle, MarkerType, Position, BaseEdge, EdgeLabelRenderer, getSmoothStepPath,
  type Node as FlowNode, type NodeProps, type Edge, type Connection,
  type NodeChange, type EdgeChange, type EdgeProps, useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import feedbackSeed from '../contracts/feedback.json';
import calculatorSeed from '../contracts/calculator.json';
import sumSeed from '../contracts/sum.json';
import expressionSeed from '../contracts/expression.json';

type Kind = 'group' | 'ui' | 'logic' | 'async' | 'action';
type Spec = {
  id:string; parentId:string|null; title:string; kind:Kind; description:string;
  position:{x:number;y:number}; size?:{width:number;height:number};
  input:string;output:string;errors:string[];fixture:Record<string,unknown>;code:string;test:string;
};
type Link = {id:string;source:string;target:string;sourceHandle?:string;targetHandle?:string;label:string};
type Graph={version:number;feature:{id:string;title:string;goal:string};nodes:Spec[];edges:Link[]};
type Step={nodeId:string;input:unknown;output:unknown;elapsedMs:number;status:'ok'|'rejected'|'mock';adapter?:string};
type BackendAdapter={id:string;label:string;available:boolean;missing:string[];source:string;buildOnFirstUse:boolean};
type Run={runId?:string;mode?:string;trace?:Step[];result?:Record<string,unknown>;ui?:{tone:string;message:string};items?:Feedback[];nodeId?:string;output?:unknown;simulated?:boolean;elapsedMs?:number;error?:string};
type Feedback={id:string;title:string;category:string;detail:string};
type TraceRef={path:string;line:number};
type Requirement={id:string;nodeId:string;title:string;description:string;status:'draft'|'confirmed';revision:number;code:TraceRef[];tests:TraceRef[]};
type RequirementDraft={title:string;description:string};
type Traceability={featureId:string;source:string;projectGraph:Graph;requirements:Requirement[];sphinx:{path:string;state:'current'|'outdated'|'missing'}};
type DisplayNode=FlowNode<{spec:Spec;collapsed:boolean;hasChildren:boolean;run?:Step['status'];requirement?:Requirement;hasUnsavedRequirement:boolean;traceAvailable:boolean;toggle:(id:string)=>void;language:string},'contract'>;
type Example='expression'|'sum'|'calculator'|'feedback';
const exampleKey='contract-studio-active-example-v1';
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
function sameValue(a:unknown,b:unknown):boolean{
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
  if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>sameValue(v,b[i]));
  const left=a as Record<string,unknown>,right=b as Record<string,unknown>;
  const keys=Object.keys(left);
  return keys.length===Object.keys(right).length&&keys.every(k=>Object.prototype.hasOwnProperty.call(right,k)&&sameValue(left[k],right[k]));
}
class ApiError extends Error{constructor(message:string,readonly status:number){super(message)}}
const labelFor=(kind:Kind)=>({group:'功能组',ui:'页面',logic:'处理',async:'异步',action:'写入'}[kind]);
async function api<T>(path:string,body?:unknown):Promise<T>{
  const r=await fetch(path,body===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json(); if(!r.ok)throw new ApiError(d.error||`HTTP ${r.status}`,r.status);return d as T;
}

function NodeCard({data}:NodeProps<DisplayNode>){
  const {spec,hasChildren,collapsed,run,requirement,hasUnsavedRequirement,traceAvailable,toggle,language}=data;
  const requirementLabel=requirement?(hasUnsavedRequirement?'需求未保存':requirement.status==='confirmed'?'需求已确认':'需求待确认'):(traceAvailable?'需求未关联':'');
  const isComputationGroup=spec.id==='expr-compute';
  if(spec.kind==='group' && hasChildren && !collapsed){
    return <div className={`group-heading ${isComputationGroup?'nested-compute-heading':''}`}>
      {isComputationGroup&&<Handle id="in" type="target" position={Position.Left} className="flow-handle"/>}
      <span><span className="group-name">{spec.title}</span>{requirementLabel&&<span className={`group-requirement ${!hasUnsavedRequirement&&requirement?.status==='confirmed'?'confirmed':''}`}>{requirementLabel}</span>}{isComputationGroup&&run&&<span className={`group-run ${run}`}>{run==='ok'?'✓ 已执行':run==='rejected'?'! 已拒绝':'○ Mock'}</span>}</span>
      <button className="node-toggle nodrag" aria-expanded="true" onClick={(e)=>{e.stopPropagation();toggle(spec.id)}}>{isComputationGroup?'折叠计算步骤 −':'折叠 −'}</button>
      {isComputationGroup&&<><Handle id="ok" type="source" position={Position.Right} style={{top:'36%'}} className="flow-handle"/><Handle id="fail" type="source" position={Position.Right} style={{top:'76%',background:'#c27d56'}} className="flow-handle"/></>}
    </div>;
  }
  return <div className={`node-card node-${spec.kind} ${run==='rejected'?'node-failed':''} ${run==='ok'?'node-passed':''}`}>
    <Handle id="in" type="target" position={Position.Left} className="flow-handle"/>
    <div className="node-kicker"><span>{labelFor(spec.kind)}</span><span>{run==='ok'?'✓ 通过':run==='rejected'?'! 拒绝':run==='mock'?'○ Mock':''}</span></div>
    <div className="node-name">{spec.title}</div>{requirementLabel&&<div className={`node-requirement ${!hasUnsavedRequirement&&requirement?.status==='confirmed'?'confirmed':''}`}>{requirementLabel}</div>}{spec.id==='validate'&&<div className="node-runtime">Adapter: {language}</div>}
    {hasChildren&&<button className="node-toggle nodrag" aria-expanded="false" onClick={(e)=>{e.stopPropagation();toggle(spec.id)}}>{isComputationGroup?'展开计算步骤 +':'展开子节点 +'}</button>}
    <Handle id="ok" type="source" position={Position.Right} style={{top:'36%'}} className="flow-handle"/>
    <Handle id="fail" type="source" position={Position.Right} style={{top:'76%',background:'#c27d56'}} className="flow-handle"/>
  </div>;
}
const nodeTypes={contract:NodeCard};

function BranchEdge({id,sourceX,sourceY,targetX,targetY,sourcePosition,targetPosition,label,style,markerEnd}:EdgeProps){
  const [path,labelX,labelY]=getSmoothStepPath({sourceX,sourceY,targetX,targetY,sourcePosition,targetPosition});
  // Horizontal neighbours have little space between cards: place their labels above both cards.
  const captionY=Math.abs(sourceY-targetY)<25?Math.min(sourceY,targetY)-60:labelY;
  return <><BaseEdge id={id} path={path} style={style} markerEnd={markerEnd}/>{label&&<EdgeLabelRenderer><div className="branch-label" style={{transform:`translate(-50%, -50%) translate(${labelX}px, ${captionY}px)`}}>{label}</div></EdgeLabelRenderer>}</>;
}
const edgeTypes={branch:BranchEdge};

function Fit({value}:{value:number}){
  const flow=useReactFlow();
  useEffect(()=>{const t=setTimeout(()=>void flow.fitView({padding:.06,duration:180}),50);return()=>clearTimeout(t)},[flow,value]);
  return null;
}

function CreateRequirement({node,onCreate}:{node:Spec;onCreate:(nodeId:string,id:string,title:string,description:string)=>Promise<void>}){
  const [id,setId]=useState('');
  const [title,setTitle]=useState(node.title);
  const [description,setDescription]=useState(node.description);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const create=async()=>{
    setBusy(true);setError('');
    try{await onCreate(node.id,id,title,description)}catch(e){setError(String(e))}finally{setBusy(false)}
  };
  return <div className="requirements-body">
    <div className="requirement-empty"><strong>此节点尚无需求</strong><p>为它创建一条草稿，确认前保留修改空间。</p></div>
    <div className="field"><label htmlFor="new-req-id">需求 ID</label><input id="new-req-id" value={id} onChange={e=>setId(e.target.value)} placeholder="例如 REQ_NEW_FEATURE"/></div>
    <div className="field"><label htmlFor="new-req-title">需求标题</label><input id="new-req-title" value={title} onChange={e=>setTitle(e.target.value)}/></div>
    <div className="field"><label htmlFor="new-req-description">需求描述</label><textarea id="new-req-description" rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></div>
    <button className="primary-button" onClick={()=>void create()} disabled={busy||!id.trim()||!title.trim()||!description.trim()}>{busy?'创建中…':'创建并关联草稿'}</button>
    <p className="micro">项目需求会保存到文件；画布草稿需点击“保存到项目”，也可导出 JSON。创建需求不会自动实现或测试功能。</p>
    {error&&<div className="notice notice-error" role="alert">{error}</div>}
  </div>;
}

function RequirementPanel({node,compatible,requirement,draft,traceability,loading,error,onRefresh,onSave,onCreate,onDraftChange,onDiscard}:{
  node:Spec;compatible:boolean;requirement?:Requirement;traceability:Traceability|null;loading:boolean;error:string;
  draft?:RequirementDraft;onDraftChange:(id:string,draft:RequirementDraft)=>void;onDiscard:(id:string)=>void;
  onRefresh:()=>void;onSave:(requirement:Requirement,title:string,description:string,action:'save'|'confirm')=>Promise<void>;
  onCreate:(nodeId:string,id:string,title:string,description:string)=>Promise<void>;
}){
  const [busy,setBusy]=useState(false);
  const [formError,setFormError]=useState('');
  const [preview,setPreview]=useState<{path:string;startLine:number;excerpt:string}|null>(null);
  const [previewError,setPreviewError]=useState('');
  if(loading)return <div className="empty">正在读取需求与代码关联…</div>;
  if(error)return <div className="trace-unavailable"><div className="notice notice-error">无法读取需求关联：{error}</div><button className="link-button" onClick={onRefresh}>重新读取</button></div>;
  if(!traceability)return <div className="empty">尚未读取需求关联。</div>;
  if(!compatible)return <div className="empty">当前画布属于其他功能，项目需求不会按同名节点自动关联。</div>;
  if(!requirement)return <CreateRequirement key={node.id} node={node} onCreate={onCreate}/>;
  const title=draft?.title??requirement.title;
  const description=draft?.description??requirement.description;
  const changed=title!==requirement.title||description!==requirement.description;
  const save=async(action:'save'|'confirm')=>{
    setBusy(true);setFormError('');
    try{await onSave(requirement,title,description,action)}catch(e){setFormError(String(e))}finally{setBusy(false)}
  };
  const showSource=async(ref:TraceRef)=>{
    setPreview(null);setPreviewError('');
    try{setPreview(await api<{path:string;startLine:number;excerpt:string}>(`/api/traceability/source?path=${encodeURIComponent(ref.path)}&line=${ref.line}`))}
    catch(e){setPreviewError(String(e))}
  };
  const links=(label:string,refs:TraceRef[])=><div className="trace-links"><div className="trace-links-heading">{label} <span>{refs.length}</span></div>{refs.length?refs.map((ref,i)=><button className="trace-ref" key={`${ref.path}:${ref.line}:${i}`} onClick={()=>void showSource(ref)} title="查看对应源文件"><span>{ref.path}</span><b>第 {ref.line} 行 ↗</b></button>):<div className="trace-missing">尚未发现关联标记</div>}</div>;
  return <div className="requirements-body">
    <div className="requirement-meta"><span className="requirement-id">{requirement.id}</span><span className={`requirement-status ${!changed&&requirement.status==='confirmed'?'confirmed':'draft'}`}>{changed?'有未保存修改':requirement.status==='confirmed'?'已确认':'草稿 · 待确认'}</span></div>
    <div className="field"><label htmlFor="requirement-title">需求标题</label><input id="requirement-title" value={title} onChange={e=>onDraftChange(requirement.id,{title:e.target.value,description})}/></div>
    <div className="field"><label htmlFor="requirement-description">需求描述</label><textarea id="requirement-description" rows={4} value={description} onChange={e=>onDraftChange(requirement.id,{title,description:e.target.value})}/></div>
    <div className="requirement-actions"><button onClick={()=>void save('save')} disabled={busy||!changed||!title.trim()||!description.trim()}>保存草稿</button><button className="primary-button" onClick={()=>void save('confirm')} disabled={busy||(!changed&&requirement.status==='confirmed')||!title.trim()||!description.trim()}>{busy?'保存中…':'确认这条需求'}</button>{changed&&<button className="link-button" onClick={()=>onDiscard(requirement.id)} disabled={busy}>放弃修改</button>}</div>
    <p className="micro">确认记录当前文字；修改后需重新确认。画布修改先保存在浏览器，需手动保存到项目；业务代码不会自动改写。</p>
    {formError&&<div className="notice notice-error" role="alert">{formError} <button className="link-button" onClick={onRefresh}>重新读取</button></div>}
    <div className="trace-section-title">关联证据 <span>由源码标记定位</span></div>
    {links('实现代码',requirement.code)}{links('相关测试',requirement.tests)}
    <p className="micro">列出的是发现的源码标记，不表示测试已经运行或验证通过。</p>
    {previewError&&<div className="notice notice-error" role="alert">无法读取源码：{previewError}</div>}
    {preview&&<div className="source-preview"><div className="source-preview-head"><b>{preview.path}</b><span>从第 {preview.startLine} 行</span><button className="link-button" onClick={()=>setPreview(null)}>关闭</button></div><pre className="source">{preview.excerpt}</pre></div>}
    <div className="trace-source">需求文件：{traceability.source} · Sphinx 文档：{traceability.sphinx.state==='current'?'已同步':traceability.sphinx.state==='outdated'?'待同步':'缺失'}</div>
  </div>;
}

// @need-ids: REQ_FEEDBACK_FORM
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

// @need-ids: REQ_CALC_INPUT, REQ_CALC_RESULT
function CalculatorPreview({onRun}:{onRun:(run:Run)=>void}){
  const [left,setLeft]=useState('6');
  const [right,setRight]=useState('2');
  const [operator,setOperator]=useState<'+'|'-'|'*'|'/'>('/');
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<Run|null>(null);
  const [error,setError]=useState('');
  const calculate=async()=>{
    setBusy(true);setError('');setResult(null);
    try{const run=await api<Run>('/api/calculator',{left,right,operator});setResult(run);onRun(run)}
    catch(e){setError(String(e));onRun({trace:[]})}finally{setBusy(false)}
  };
  return <section className="preview-panel calculator-panel">
    <div className="panel-heading"><div><div className="eyebrow">可操作的真实功能</div><h2>四则计算器</h2></div><span className="calculator-badge">互动演示</span></div>
    <p className="calculator-intro">输入两个数字，选择运算，再看左侧实际走过的节点。</p>
    <form onSubmit={e=>{e.preventDefault();void calculate()}}>
      <div className="calculator-operands">
        <div className="field"><label htmlFor="calculator-left">第一个数</label><input id="calculator-left" inputMode="decimal" value={left} onChange={e=>setLeft(e.target.value)} placeholder="例如 6"/></div>
        <div className="field"><label htmlFor="calculator-operator">运算</label><select id="calculator-operator" value={operator} onChange={e=>setOperator(e.target.value as '+'|'-'|'*'|'/')}><option value="+">＋ 加</option><option value="-">− 减</option><option value="*">× 乘</option><option value="/">÷ 除</option></select></div>
        <div className="field"><label htmlFor="calculator-right">第二个数</label><input id="calculator-right" inputMode="decimal" value={right} onChange={e=>setRight(e.target.value)} placeholder="例如 2"/></div>
      </div>
      <button type="submit" className="primary-button full" disabled={busy}>{busy?'计算中…':'计算并观察节点'}</button>
    </form>
    <div className={`calculator-result ${error||result?.ui?.tone==='error'?'is-error':''}`} aria-live="polite">
      <span>计算结果</span>
      {error?<strong>{error}</strong>:result?.ui?<strong>{result.ui.tone==='success'&&typeof result.result?.value==='number'?result.result.value:result.ui.message}</strong>:<strong className="calculator-placeholder">结果将在这里显示</strong>}
    </div>
    <p className="micro">试试 6 ÷ 2，再把第二个数改为 0，观察错误分支。</p>
  </section>;
}

type SumStep={index:number;value:number;previous:number;total:number};
type SumRun=Run&{result:{status:'success'|'invalid';value?:number;message:string;steps?:SumStep[]}};
const initialSumValues=Array.from({length:20},(_,i)=>String(i+1));
const splitSumValues=(text:string)=>text.trim().split(/[,，][ \t]*(?:\r?\n[ \t]*)?|\r?\n/).map(value=>value.trim());

// @need-ids: REQ_SUM_INPUT, REQ_SUM_RESULT
function SumPreview({onRun}:{onRun:(run:Run)=>void}){
  const [text,setText]=useState(initialSumValues.join(', '));
  const [busy,setBusy]=useState(true);
  const [result,setResult]=useState<SumRun|null>(null);
  const [error,setError]=useState('');
  const requestId=useRef(0);
  const onRunRef=useRef(onRun);onRunRef.current=onRun;
  const calculate=async(values:string[])=>{
    const current=++requestId.current;
    setBusy(true);setError('');setResult(null);
    try{
      const run=await api<SumRun>('/api/sum',{values});
      if(current!==requestId.current)return;
      setResult(run);onRunRef.current(run);
    }catch(e){
      if(current!==requestId.current)return;
      setError(String(e));onRunRef.current({trace:[]});
    }finally{if(current===requestId.current)setBusy(false)}
  };
  useEffect(()=>{void calculate(initialSumValues);return()=>{requestId.current++}},[]);
  const changeText=(value:string)=>{
    requestId.current++;setText(value);setBusy(false);setResult(null);setError('');onRunRef.current({trace:[]});
  };
  const steps=result?.result.steps??[];
  return <section className="preview-panel sum-panel">
    <div className="panel-heading"><div><div className="eyebrow">可操作的真实功能</div><h2>多数字求和</h2></div><span className="calculator-badge">互动演示</span></div>
    <p className="sum-intro">输入至少 3 个数字，看看它们是怎样一步步加起来的。</p>
    <form onSubmit={event=>{event.preventDefault();void calculate(splitSumValues(text))}}>
      <div className="field sum-input"><label htmlFor="sum-values">数字列表 <span>用逗号或换行分隔</span></label><textarea id="sum-values" rows={3} value={text} onChange={event=>changeText(event.target.value)} placeholder="例如 1, 2, 3" spellCheck={false}/></div>
      <button type="submit" className="primary-button full" disabled={busy}>{busy?'正在计算…':'计算总和并观察节点'}</button>
    </form>
    <div className={`sum-result ${error||result?.ui?.tone==='error'?'is-error':''}`} role="status">
      <span>总和</span>
      {error?<strong>{error}</strong>:result?.ui?.tone==='error'?<strong>{result.ui.message}</strong>:typeof result?.result.value==='number'?<strong>{result.result.value}</strong>:<strong className="sum-placeholder">输入数字后计算</strong>}
    </div>
    {steps.length>0&&<div className="sum-process">
      <div className="sum-process-heading"><strong>逐步累加</strong><span>共 {steps.length} 步 · 实际计算结果</span></div>
      <ol className="sum-steps">{steps.map(step=><li key={step.index}><span className="sum-step-index">{String(step.index).padStart(2,'0')}</span><span className="sum-step-equation">{step.previous} <span>+</span> {step.value}</span><strong>= {step.total}</strong></li>)}</ol>
    </div>}
  </section>;
}

type ExpressionStep={index:number;operator:string;operands:number[];result:number};
type ExpressionRun=Run&{result:{status:'success'|'invalid';value?:number;message:string;steps?:ExpressionStep[]}};
type ExpressionEngine={expression:string;busy:boolean;result:ExpressionRun|null;error:string;steps:ExpressionStep[];calculate:(value:string)=>Promise<void>;changeExpression:(value:string)=>void};
const initialExpression='12 + 3 × (8 - 4) ÷ 2';
function describeExpressionStep(step:ExpressionStep){
  const symbols:Record<string,string>={'+':'+','-':'−','*':'×','/':'÷','u+':'+','u-':'−'};
  const symbol=symbols[step.operator]??step.operator;
  return step.operands.length===1?`${symbol}${step.operands[0]}`:step.operands.join(` ${symbol} `);
}

function useExpressionEngine(enabled:boolean,onRun:(run:Run)=>void):ExpressionEngine{
  const [expression,setExpression]=useState(initialExpression);
  const expressionRef=useRef(expression);expressionRef.current=expression;
  const [busy,setBusy]=useState(true);
  const [result,setResult]=useState<ExpressionRun|null>(null);
  const [error,setError]=useState('');
  const requestId=useRef(0);
  const onRunRef=useRef(onRun);onRunRef.current=onRun;
  const calculate=async(value:string)=>{
    const current=++requestId.current;
    setBusy(true);setError('');setResult(null);
    try{
      const run=await api<ExpressionRun>('/api/expression',{expression:value});
      if(current!==requestId.current)return;
      setResult(run);onRunRef.current(run);
    }catch(e){
      if(current!==requestId.current)return;
      setError(String(e));onRunRef.current({trace:[]});
    }finally{if(current===requestId.current)setBusy(false)}
  };
  useEffect(()=>{if(!enabled)return;void calculate(expressionRef.current);return()=>{requestId.current++}},[enabled]);
  const changeExpression=(value:string)=>{
    requestId.current++;setExpression(value);setBusy(false);setResult(null);setError('');onRunRef.current({trace:[]});
  };
  return {expression,busy,result,error,steps:result?.result.steps??[],calculate,changeExpression};
}

// @need-ids: REQ_EXPR_INPUT, REQ_EXPR_RESULT
function ExpressionPreview({engine}:{engine:ExpressionEngine}){
  const {expression,busy,result,error,steps,calculate,changeExpression}=engine;
  return <section className="preview-panel expression-panel">
    <div className="panel-heading"><div><div className="eyebrow">可操作的真实功能</div><h2>混合四则运算</h2></div><span className="calculator-badge">互动演示</span></div>
    <p className="expression-intro">输入算式，观察括号和运算优先级如何影响计算顺序。</p>
    <form onSubmit={event=>{event.preventDefault();void calculate(expression)}}>
      <div className="field expression-input"><label htmlFor="expression-value">算式 <span>支持括号、+、-、×、÷</span></label><input id="expression-value" value={expression} onChange={event=>changeExpression(event.target.value)} placeholder="例如 12 + 3 × (8 - 4) ÷ 2" spellCheck={false}/><span className="expression-precision">使用 JavaScript 浮点运算，部分小数可能有舍入误差。</span></div>
      <button type="submit" className="primary-button full" disabled={busy}>{busy?'正在计算…':'计算并观察节点'}</button>
    </form>
    <div className={`expression-result ${error||result?.ui?.tone==='error'?'is-error':''}`} role="status">
      <span>计算结果</span>
      {error?<strong>{error}</strong>:result?.ui?.tone==='error'?<strong>{result.ui.message}</strong>:typeof result?.result.value==='number'?<strong>{result.result.value}</strong>:<strong className="expression-placeholder">输入算式后计算</strong>}
    </div>
    {steps.length>0&&<div className="expression-process">
      <div className="expression-process-heading"><strong>逐步计算</strong><span>共 {steps.length} 步 · 实际执行顺序</span></div>
      <ol className="expression-steps">{steps.map(step=><li key={step.index}><span className="expression-step-index">{String(step.index).padStart(2,'0')}</span><span className="expression-step-equation">{describeExpressionStep(step)}</span><strong>= {step.result}</strong></li>)}</ol>
    </div>}
    {result?.result.status==='success'&&steps.length===0&&<p className="micro">算式直接给出一个数字，无需进行运算。</p>}
  </section>;
}

// @need-ids: REQ_EXPR_INPUT, REQ_EXPR_RESULT
function ExpressionCalculator({engine}:{engine:ExpressionEngine}){
  const {expression,busy,result,error,calculate,changeExpression}=engine;
  const inputRef=useRef<HTMLInputElement>(null);
  const replace=(next:string,caret:number)=>{
    changeExpression(next);
    requestAnimationFrame(()=>{inputRef.current?.focus();inputRef.current?.setSelectionRange(caret,caret)});
  };
  const insert=(key:string)=>{
    const input=inputRef.current;
    const focused=document.activeElement===input;
    const start=focused?input?.selectionStart??expression.length:expression.length;
    const end=focused?input?.selectionEnd??start:start;
    const complete=result?.result.status==='success'&&typeof result.result.value==='number';
    const atEnd=start===expression.length&&end===expression.length;
    if(complete&&atEnd&&/^[0-9.(]$/.test(key)){replace(key,key.length);return}
    if(complete&&atEnd&&/^[+−×÷]$/.test(key)){
      const next=String(result.result.value)+key;
      replace(next,next.length);return;
    }
    replace(expression.slice(0,start)+key+expression.slice(end),start+key.length);
  };
  const erase=()=>{
    const input=inputRef.current;
    const focused=document.activeElement===input;
    const start=focused?input?.selectionStart??expression.length:expression.length;
    const end=focused?input?.selectionEnd??start:start;
    if(start===end&&start===0)return;
    const removeFrom=start===end?start-1:start;
    replace(expression.slice(0,removeFrom)+expression.slice(end),removeFrom);
  };
  const clear=()=>replace('',0);
  const keys=[
    {label:'C',action:clear,kind:'utility',aria:'清除'},
    {label:'⌫',action:erase,kind:'utility',aria:'退格'},
    {label:'(',action:()=>insert('('),kind:'utility',aria:'左括号'},
    {label:')',action:()=>insert(')'),kind:'utility',aria:'右括号'},
    ...['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','+'].map(label=>({label,action:()=>insert(label),kind:['÷','×','−','+'].includes(label)?'operator':'digit',aria:({'+':'加','−':'减','×':'乘','÷':'除','.':'小数点'} as Record<string,string>)[label]??label})),
  ];
  return <section className="expression-calculator" aria-labelledby="expression-calculator-title">
    <div className="expression-calculator-heading"><div><div className="eyebrow">亲手试一试</div><h2 id="expression-calculator-title">混合运算计算器</h2></div><span>支持键盘输入</span></div>
    <form onSubmit={event=>{event.preventDefault();void calculate(expression)}}>
      <div className="expression-calculator-display">
        <label htmlFor="expression-calculator-input">算式</label>
        <input ref={inputRef} id="expression-calculator-input" aria-label="计算器算式" value={expression} onChange={event=>changeExpression(event.target.value)} onKeyDown={event=>{if(event.key==='='){event.preventDefault();void calculate(expression)}else if(event.key==='Escape'){event.preventDefault();clear()}}} placeholder="输入算式" spellCheck={false}/>
        <div className={`expression-calculator-output ${error||result?.ui?.tone==='error'?'is-error':''}`} role="status">
          {error?error:result?.ui?.tone==='error'?result.ui.message:typeof result?.result.value==='number'?String(result.result.value):'等待计算'}
        </div>
      </div>
      <div className="expression-calculator-keys">
        {keys.map(key=><button key={key.label} type="button" className={`expression-calculator-key ${key.kind}`} aria-label={key.aria} onMouseDown={event=>event.preventDefault()} onClick={key.action}>{key.label}</button>)}
        <button type="submit" className="expression-calculator-key equals" aria-label="计算结果" disabled={busy}>=</button>
      </div>
    </form>
    <p className="expression-calculator-hint">按运算优先级计算；Enter 或 = 计算，Esc 清空。小数可能有浮点舍入误差。</p>
  </section>;
}

function Studio({example,onExampleChange}:{example:Example;onExampleChange:(example:Example)=>void}){
  const isExpression=example==='expression';
  const isCalculator=example==='calculator';
  const isSum=example==='sum';
  const isFeedback=example==='feedback';
  const original=(isExpression?expressionSeed:isSum?sumSeed:isCalculator?calculatorSeed:feedbackSeed) as Graph;
  const rootId=isExpression?'expression':isSum?'sum':isCalculator?'calculator':'submit';
  const defaultSelected=isExpression?'expr-compute':isSum?'sum-accumulate':isCalculator?'calc-compute':'lookup';
  const JSON_KEY=isExpression?'contract-studio-expression-graph-v1':isSum?'contract-studio-sum-graph-v1':isCalculator?'contract-studio-calculator-graph-v1':'contract-studio-adapters-v03';
  const GRAPH_BASE_KEY=isExpression?'contract-studio-expression-graph-base-v1':isSum?'contract-studio-sum-graph-base-v1':isCalculator?'contract-studio-calculator-graph-base-v1':'contract-studio-project-graph-base-v1';
  const GRAPH_PENDING_KEY=isExpression?'contract-studio-expression-graph-pending-v1':isSum?'contract-studio-sum-graph-pending-v1':isCalculator?'contract-studio-calculator-graph-pending-v1':'contract-studio-project-graph-pending-v1';
  const REQUIREMENT_DRAFT_KEY=isExpression?'contract-studio-expression-requirement-drafts-v1':isSum?'contract-studio-sum-requirement-drafts-v1':isCalculator?'contract-studio-calculator-requirement-drafts-v1':'contract-studio-requirement-drafts-v1';
  const traceUrl=isExpression?'/api/traceability?feature=expression':isSum?'/api/traceability?feature=sum':isCalculator?'/api/traceability?feature=calculator':'/api/traceability';
  const [initial]=useState(()=>{
    let graph=clone(original),hasDraft=false,base:Graph|null=null;
    try{const text=localStorage.getItem(JSON_KEY);if(text){graph=toGraph(text);hasDraft=true}}catch{/* Keep the usable bundled example. */}
    try{const text=localStorage.getItem(GRAPH_BASE_KEY);if(text)base=toGraph(text)}catch{/* A missing baseline requires explicit reconciliation. */}
    return {graph,hasDraft,base};
  });
  const [graph,setGraph]=useState<Graph>(initial.graph);
  const [graphBase,setGraphBase]=useState<Graph|null>(initial.base);
  const [graphReady,setGraphReady]=useState(false);
  const [graphBusy,setGraphBusy]=useState(false);
  const [graphMessage,setGraphMessage]=useState<{tone:'success'|'error';text:string}|null>(null);
  const graphRef=useRef(graph);graphRef.current=graph;
  const graphBaseRef=useRef(graphBase);graphBaseRef.current=graphBase;
  const graphInitialized=useRef(false);
  const [selectedId,setSelectedId]=useState(defaultSelected);
  const [selectedLanguage,setSelectedLanguage]=useState('javascript');
  const [adapters,setAdapters]=useState<BackendAdapter[]>([]);
  const [adapterError,setAdapterError]=useState('');
  useEffect(()=>{if(!isFeedback)return;let live=true;void api<{adapters:BackendAdapter[]}>('/api/adapters').then(d=>{if(live)setAdapters(d.adapters)}).catch(e=>{if(live)setAdapterError(String(e))});return()=>{live=false}},[isFeedback]);
  const [traceability,setTraceability]=useState<Traceability|null>(null);
  const [requirementDrafts,setRequirementDrafts]=useState<Record<string,RequirementDraft>>(()=>{try{const saved=JSON.parse(localStorage.getItem(REQUIREMENT_DRAFT_KEY)??'{}');return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{}}catch{return {}}});
  const [traceLoading,setTraceLoading]=useState(true);
  const [traceError,setTraceError]=useState('');
  const refreshTraceability=useCallback(()=>{
    setTraceLoading(true);setTraceError('');
    void api<Traceability>(traceUrl).then(data=>{
      const project=toGraph(JSON.stringify(data.projectGraph));
      setTraceability(data);
      let pending:Graph|null=null;
      try{const text=localStorage.getItem(GRAPH_PENDING_KEY);if(text)pending=toGraph(text)}catch{/* A malformed pending record cannot establish a baseline. */}
      if(pending){
        if(sameValue(project,pending)){setGraphBase(clone(project));setGraphMessage({tone:'success',text:'画布已保存到项目；业务代码不会自动改变。'});localStorage.removeItem(GRAPH_PENDING_KEY)}
        else{setGraphMessage({tone:'error',text:'上次保存未确认成功，浏览器草稿仍在；请核对项目图后再操作。'});localStorage.removeItem(GRAPH_PENDING_KEY)}
      }
      if(!graphInitialized.current){
        if(!initial.hasDraft){setGraph(clone(project));setGraphBase(clone(project))}
        else if(sameValue(graphRef.current,project))setGraphBase(clone(project));
        graphInitialized.current=true;setGraphReady(true);
      }else if(!graphBaseRef.current&&sameValue(graphRef.current,project))setGraphBase(clone(project));
    }).catch(e=>{setTraceError(String(e));graphInitialized.current=true;setGraphReady(true)}).finally(()=>setTraceLoading(false));
  },[initial.hasDraft,traceUrl,GRAPH_PENDING_KEY]);
  useEffect(()=>{refreshTraceability()},[refreshTraceability]);
  const saveRequirement=async(requirement:Requirement,title:string,description:string,action:'save'|'confirm')=>{
    const updated=await api<Traceability>('/api/traceability/requirement',{featureId:traceability?.featureId,id:requirement.id,title,description,revision:requirement.revision,action});
    setTraceability(updated);
    setRequirementDrafts(old=>{const next={...old};delete next[requirement.id];return next});
  };
  const discardDraft=(id:string)=>setRequirementDrafts(old=>{const next={...old};delete next[id];return next});
  const changeDraft=(id:string,draft:RequirementDraft)=>setRequirementDrafts(old=>({...old,[id]:draft}));
  const createRequirement=async(nodeId:string,id:string,title:string,description:string)=>{
    const updated=await api<Traceability>('/api/traceability/requirement',{featureId:traceability?.featureId,id,nodeId,title,description,action:'create'});
    setTraceability(updated);
  };
  const initialCollapsed=()=>new Set<string>(isExpression?['expr-compute']:[]);
  const [collapsed,setCollapsed]=useState<Set<string>>(initialCollapsed);
  const [tab,setTab]=useState<'requirement'|'test'|'code'|'trace'>('requirement');
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
  const compatible=!!traceability&&graph.feature?.id===traceability.featureId;
  const selectedRequirement=compatible?traceability?.requirements.find(r=>r.nodeId===selectedId):undefined;
  const degree={in:graph.edges.filter(x=>x.target===selectedId).length,out:graph.edges.filter(x=>x.source===selectedId).length};
  useEffect(()=>{localStorage.setItem(JSON_KEY,JSON.stringify(graph))},[graph]);
  useEffect(()=>{if(graphBase)localStorage.setItem(GRAPH_BASE_KEY,JSON.stringify(graphBase));else localStorage.removeItem(GRAPH_BASE_KEY)},[graphBase]);
  useEffect(()=>{localStorage.setItem(REQUIREMENT_DRAFT_KEY,JSON.stringify(requirementDrafts))},[requirementDrafts]);
  useEffect(()=>{setGraphMessage(null)},[graph]);
  useEffect(()=>{setFixture(JSON.stringify(selected?.fixture??{},null,2));setNodeResult(null);setError('');setSource(null)},[selectedId]);
  useEffect(()=>{
    if(tab!=='code'||!selected)return;
    let live=true;
    if(!isFeedback){
      const ref=selectedRequirement?.code[0];
      if(!ref){setSource(null);return()=>{live=false}}
      void api<{path:string;excerpt:string}>(`/api/traceability/source?path=${encodeURIComponent(ref.path)}&line=${ref.line}`).then(d=>{if(live)setSource({file:d.path,symbol:selected.id,excerpt:d.excerpt})}).catch(()=>{if(live)setSource(null)});
    }else{
      void api<{file:string;symbol:string;excerpt:string}>(`/api/code?nodeId=${encodeURIComponent(selected.id)}${selected.id==='validate'?`&language=${encodeURIComponent(selectedLanguage)}`:''}`).then(d=>{if(live)setSource(d)}).catch(()=>{if(live)setSource(null)});
    }
    return()=>{live=false};
  },[selectedId,tab,selectedLanguage,isFeedback,selectedRequirement]);
  const toggle=useCallback((id:string)=>{setCollapsed(old=>{const next=new Set(old);if(next.has(id))next.delete(id);else next.add(id);return next});setFitVersion(n=>n+1)},[]);
  const byId=useMemo(()=>new Map(graph.nodes.map(n=>[n.id,n])),[graph.nodes]);
  const hidden=useCallback((n:Spec)=>{let p=n.parentId;const walked=new Set<string>();while(p&&!walked.has(p)){if(collapsed.has(p))return true;walked.add(p);p=byId.get(p)?.parentId??null}return false},[collapsed,byId]);
  const statuses=useMemo(()=>Object.fromEntries(trace.map(t=>[t.nodeId,t.status])),[trace]);
  const activeEdges=useMemo(()=>{
    const active=new Map<string,'ok'|'rejected'>();
    const isWithin=(nodeId:string,ancestorId:string)=>{
      const seen=new Set<string>();
      let current:string|null|undefined=nodeId;
      while(current&&!seen.has(current)){
        if(current===ancestorId)return true;
        seen.add(current);current=byId.get(current)?.parentId;
      }
      return false;
    };
    for(let i=1;i<trace.length;i++){
      const from=trace[i-1],to=trace[i];
      if(from.status==='mock'||to.status==='mock')continue;
      const handle=from.status==='rejected'?'fail':'ok';
      for(const edge of graph.edges)if(isWithin(from.nodeId,edge.source)&&isWithin(to.nodeId,edge.target)&&(edge.sourceHandle??'ok')===handle)active.set(edge.id,from.status);
    }
    return active;
  },[graph.edges,trace,byId]);
  const flowNodes=useMemo<DisplayNode[]>(()=>graph.nodes.map(n=>{
    const hasChildren=graph.nodes.some(x=>x.parentId===n.id);
    const folded=hasChildren&&collapsed.has(n.id);
    return {id:n.id,type:'contract',parentId:n.parentId??undefined,position:n.position,
      style:{width:hasChildren&&!folded?(n.size?.width??970):n.kind==='group'?230:176,height:hasChildren&&!folded?(n.size?.height??415):n.kind==='group'?120:116},
      hidden:hidden(n),selected:n.id===selectedId,
      data:{spec:n,hasChildren,collapsed:folded,run:statuses[n.id],requirement:compatible&&!traceError&&!traceLoading?traceability?.requirements.find(r=>r.nodeId===n.id):undefined,hasUnsavedRequirement:compatible&&!!traceability?.requirements.some(r=>r.nodeId===n.id&&!!requirementDrafts[r.id]&&(requirementDrafts[r.id].title!==r.title||requirementDrafts[r.id].description!==r.description)),traceAvailable:compatible&&!traceError&&!traceLoading,toggle,language:selectedLanguage},
    };
  }),[graph.nodes,collapsed,hidden,selectedId,statuses,toggle,selectedLanguage,traceability,requirementDrafts,compatible,traceError,traceLoading]);
  const flowEdges=useMemo<Edge[]>(()=>graph.edges.map(e=>({
    ...e,id:e.id,sourceHandle:e.sourceHandle??'ok',targetHandle:e.targetHandle??'in',type:'branch',
    hidden:hidden(byId.get(e.source)!)||hidden(byId.get(e.target)!),
    animated:activeEdges.has(e.id),style:{stroke:activeEdges.get(e.id)==='rejected'?'#c45f40':activeEdges.has(e.id)?'#178367':'#94a3b8',strokeWidth:activeEdges.has(e.id)?2.5:1.5},
    markerEnd:{type:MarkerType.ArrowClosed,color:'#94a3b8',width:16,height:16}
  })),[graph.edges,byId,hidden,activeEdges]);
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
  const remove=()=>{if(selectedId===rootId)return;setGraph(g=>({...g,nodes:g.nodes.filter(n=>n.id!==selectedId),edges:g.edges.filter(e=>e.source!==selectedId&&e.target!==selectedId)}));setSelectedId(rootId)};
  const addNode=()=>{
    const id=`step-${Date.now().toString(36)}`;
    const node:Spec={id,parentId:rootId,title:'待实现功能',kind:'logic',description:'请先描述输入、处理、输出及异常。',position:{x:35,y:260},input:'Any',output:'Any',errors:[],fixture:{},code:'',test:''};
    setGraph(g=>({...g,nodes:[...g.nodes,node]}));setCollapsed(isExpression?old=>{const next=new Set(old);next.delete(rootId);return next}:new Set());setSelectedId(id);setFitVersion(n=>n+1);
  };
  const runSelected=async()=>{
    if(!selected)return;setError('');setBusy(true);
    try{const input=JSON.parse(fixture);const result=await api<Run>(isExpression?'/api/expression/test':isSum?'/api/sum/test':isCalculator?'/api/calculator/test':'/api/test',{nodeId:selected.id,input,mode,language:selectedLanguage});setNodeResult(result);
      if(result.trace)setTrace(result.trace);else setTrace([{nodeId:selected.id,input,output:result.output,status:result.simulated?'mock':(result.output as {status?:string})?.status==='invalid'||(result.output as {status?:string})?.status==='duplicate'?'rejected':'ok',elapsedMs:result.elapsedMs??0}]);
    }catch(e){setError(String(e))}finally{setBusy(false)};
  };
  const projectGraph=traceability?.projectGraph;
  const graphConflict=!!graphBase&&!!projectGraph&&!sameValue(graphBase,projectGraph);
  const graphCompatible=!!projectGraph&&graph.feature?.id===traceability?.featureId;
  const graphDirty=!!graphBase&&!sameValue(graph,graphBase);
  const saveGraph=async()=>{
    if(!graphBase||!graphCompatible||graphConflict)return;
    const saved=clone(graph);
    setGraphBusy(true);setGraphMessage(null);
    try{
      // A Vite reload can occur while the server persists the imported JSON file.
      localStorage.setItem(JSON_KEY,JSON.stringify(saved));
      localStorage.setItem(GRAPH_BASE_KEY,JSON.stringify(graphBase));
      localStorage.setItem(REQUIREMENT_DRAFT_KEY,JSON.stringify(requirementDrafts));
      localStorage.setItem(GRAPH_PENDING_KEY,JSON.stringify(saved));
      const updated=await api<Traceability>('/api/traceability/graph',{featureId:traceability!.featureId,graph:saved,expectedGraph:graphBase});
      setTraceability(updated);setGraphBase(clone(updated.projectGraph));localStorage.removeItem(GRAPH_PENDING_KEY);
      setGraphMessage({tone:'success',text:'画布已保存到项目；业务代码不会自动改变。'});
    }catch(e){
      if(e instanceof ApiError){localStorage.removeItem(GRAPH_PENDING_KEY);if(e.status===409)refreshTraceability()}
      setGraphMessage({tone:'error',text:e instanceof ApiError&&e.status===409?'项目图已变更，未覆盖。草稿仍在，请加载项目图或核对后重新设定基线。':`保存未确认：${String(e)}。草稿仍在，请重新读取项目状态。`});
    }finally{setGraphBusy(false)}
  };
  const loadProjectGraph=async()=>{
    setGraphBusy(true);
    try{
      const current=await api<Traceability>(traceUrl);
      const project=toGraph(JSON.stringify(current.projectGraph));
      setTraceability(current);setTraceError('');
      if(!sameValue(graph,project)&&!window.confirm('加载项目图会替换当前浏览器画布草稿。请先导出需要保留的草稿。确定继续吗？'))return;
      setGraph(clone(project));setGraphBase(clone(project));setSelectedId(project.nodes[0]?.id??'');setCollapsed(initialCollapsed());setTrace([]);setFitVersion(n=>n+1);
      setGraphMessage({tone:'success',text:'已读取项目图。'});
    }catch(e){setGraphMessage({tone:'error',text:`无法读取项目图：${String(e)}。浏览器草稿未改变。`})}finally{setGraphBusy(false)}
  };
  const rebaseGraph=async()=>{
    if(!window.confirm('保留当前浏览器草稿，并以最新项目图为基线？之后点击“保存到项目”会用整个草稿覆盖项目图。建议先导出并核对两份内容。'))return;
    setGraphBusy(true);
    try{
      const current=await api<Traceability>(traceUrl);
      if(graph.feature?.id!==current.featureId)throw Error('当前画布功能与项目不匹配');
      setTraceability(current);setTraceError('');setGraphBase(clone(current.projectGraph));
      setGraphMessage({tone:'success',text:'已保留草稿并更新基线；确认无误后点击“保存到项目”。'});
    }catch(e){setGraphMessage({tone:'error',text:`无法更新基线：${String(e)}。浏览器草稿未改变。`})}finally{setGraphBusy(false)}
  };
  const exportGraph=()=>{const blob=new Blob([JSON.stringify(graph,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`contract.${example}.json`;a.click();URL.revokeObjectURL(url)};
  const importGraph=async(file?:File)=>{if(!file)return;try{const g=toGraph(await file.text());setGraph(g);setSelectedId(g.nodes[0]?.id??'');setTrace([]);setCollapsed(initialCollapsed());setFitVersion(n=>n+1);setGraphMessage(null)}catch(e){setGraphMessage({tone:'error',text:`无法导入画布：${String(e)}`})}};
  const selectNode=(id:string)=>{setSelectedId(id);setError('')};
  const onFullRun=(run:Run)=>{setTrace(run.trace??[]);setNodeResult(run);setError('')};
  const expressionEngine=useExpressionEngine(isExpression,onFullRun);
  const graphStatus=!graphReady?'正在读取项目图…':traceError?'无法读取项目图，浏览器草稿仍可编辑':!graphCompatible?'画布功能与项目图不匹配':graphConflict?'项目图已变更，本地草稿未覆盖':!graphBase?'浏览器草稿缺少项目基线':graphDirty?'浏览器草稿 · 未保存到项目':'已与项目图同步';
  return <div className="studio-shell">
    <header className="topbar"><div className="brand"><div className="brand-symbol">◇</div><div><strong>Contract Studio</strong><span>让功能可见，让实现可验</span></div></div><div className="top-actions"><button onClick={addNode} disabled={!graphReady}>＋ 添加节点</button><button onClick={()=>void saveGraph()} disabled={!graphReady||graphBusy||!!traceError||!graphCompatible||!graphBase||graphConflict||!graphDirty} className="save-project">{graphBusy?'处理中…':'保存到项目'}</button><button onClick={exportGraph}>导出 JSON</button><button onClick={()=>fileRef.current?.click()} disabled={!graphReady}>导入</button><button onClick={()=>{setGraph(clone(original));setSelectedId(defaultSelected);setCollapsed(initialCollapsed());setTrace([]);setFitVersion(n=>n+1)}} disabled={!graphReady}>重置画布</button><input hidden type="file" ref={fileRef} accept=".json,application/json" onChange={e=>{void importGraph(e.target.files?.[0]);e.target.value=''}}/></div></header>
    <div className="subheader"><div className="example-switcher"><label htmlFor="studio-example">示例项目</label><select id="studio-example" value={example} onChange={e=>onExampleChange(e.target.value as Example)}><option value="expression">混合四则运算</option><option value="sum">多数字求和</option><option value="calculator">四则计算器</option><option value="feedback">反馈工单</option></select></div><span className="sub-caption">需求 · 功能图 · 实现与测试</span></div>
    {isFeedback&&<div className="adapter-bar"><label htmlFor="adapter-lang">校验节点的后端语言</label><select id="adapter-lang" value={selectedLanguage} onChange={e=>{setSelectedLanguage(e.target.value);setNodeResult(null);setSource(null);setTrace([])}}>{(adapters.length?adapters:[{id:'javascript',label:'Node.js / JavaScript',available:true,missing:[],source:'',buildOnFirstUse:false}]).map(a=><option key={a.id} value={a.id} disabled={!a.available}>{a.label}{a.available?'':'（缺少 '+a.missing.join(', ')+'）'}</option>)}</select><span className="micro">{adapterError||'只切换「字段校验」的执行语言；其他节点保持不变。编译型语言首次运行会自动编译。'}</span></div>}
    <div className="workspace">
      <section className={`canvas ${isExpression?'with-expression-calculator':''}`}>
        <div className="canvas-header"><strong>功能流程</strong><span>{isExpression?'点击节点查看需求；使用左下角按钮缩放':'点击节点查看需求、代码与测试；双击父功能折叠 / 展开'}</span><button onClick={()=>toggle(rootId)}>{collapsed.has(rootId)?'展开全部':'折叠功能'}</button></div>
        <div className={`graph-sync ${graphConflict||!graphBase?'attention':''}`} role="status"><span>{graphStatus}</span><div><button onClick={refreshTraceability} disabled={!graphReady||graphBusy||traceLoading}>刷新状态</button><button onClick={()=>void loadProjectGraph()} disabled={!graphReady||graphBusy}>读取项目图</button>{graphCompatible&&(graphConflict||!graphBase)&&<button onClick={()=>void rebaseGraph()} disabled={graphBusy}>保留草稿并更新基线</button>}</div></div>
        {graphMessage&&<div className={`graph-message ${graphMessage.tone}`} role={graphMessage.tone==='error'?'alert':'status'}>{graphMessage.text}</div>}
        <ReactFlow nodes={flowNodes} edges={flowEdges} nodesDraggable={graphReady} nodesConnectable={graphReady} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_,n)=>selectNode(n.id)} onNodeDoubleClick={(_,n)=>{if(graph.nodes.some(x=>x.parentId===n.id))toggle(n.id)}} onPaneClick={()=>{}} fitView fitViewOptions={{padding:.06}} minZoom={.35} maxZoom={1.5} zoomOnScroll={!isExpression} preventScrolling={!isExpression} deleteKeyCode={null} defaultEdgeOptions={{type:'branch'}}>
          <Background gap={22} size={1} color="#e6ebf0"/><Controls position="bottom-left" showInteractive={false}/>
          <Fit value={fitVersion}/>
        </ReactFlow>
        <div className="canvas-footer"><span>{isExpression?'计算器在下方 · 连线表示业务数据 / 分支。':'连线表示业务数据 / 分支，不表示调用栈或线程数量。'}</span><span>{graph.nodes.length} 节点 · {graph.edges.length} 条边</span></div>
        {isExpression&&<ExpressionCalculator engine={expressionEngine}/>}
      </section>
      <aside className="right-side">
        {isExpression?<ExpressionPreview engine={expressionEngine}/>:isSum?<SumPreview onRun={onFullRun}/>:isCalculator?<CalculatorPreview onRun={onFullRun}/>:null}
        <section className="inspector">
          <div className="panel-heading"><div><div className="eyebrow">节点检查器</div><h2>{selected?.title??'选择节点'}</h2></div><div className="degree">入 {degree.in} / 出 {degree.out}</div></div>
          {selected&&<>
            <p className="description">{selected.description}</p>
            <div className="info-pair"><span>输入</span><b>{selected.input}</b></div><div className="info-pair"><span>输出</span><b>{selected.output}</b></div>
            <div className="tabs">{(['requirement','test','trace','code'] as const).map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t==='requirement'?'需求关联':t==='test'?'测试':t==='trace'?'日志':'代码映射'}</button>)}</div>
            {tab==='requirement'&&<RequirementPanel key={`${selected.id}:${selectedRequirement?.id??'new'}:${selectedRequirement?.revision??0}`} node={selected} compatible={compatible} requirement={selectedRequirement} draft={selectedRequirement?requirementDrafts[selectedRequirement.id]:undefined} traceability={traceability} loading={traceLoading} error={traceError} onRefresh={refreshTraceability} onSave={saveRequirement} onCreate={createRequirement} onDraftChange={changeDraft} onDiscard={discardDraft}/>}
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
              <div className="row-actions"><button className="primary-button" onClick={()=>void runSelected()} disabled={busy}>{busy?'测试中…':'测试此节点'}</button>{selected.id!==rootId&&<button onClick={remove}>删除节点</button>}</div>
              {error&&<div className="notice notice-error">{error}</div>}
              {nodeResult&&<div className="result"><span className="result-head">运行结果 {nodeResult.simulated?'（仅 Mock）':''}{selected.id==='validate'?` · ${selectedLanguage}`:''}</span><pre>{JSON.stringify(nodeResult.output??nodeResult.result??nodeResult,null,2)}</pre></div>}
            </div>}
            {tab==='trace'&&<div className="inspector-body"><div className="micro">执行记录区分真实运行与 Mock；Mock 只展示模拟结果。</div>{trace.length?trace.map((s,i)=><div className={`trace-step ${s.nodeId===selectedId?'highlight':''}`} key={i}><div className="trace-line"><b>{s.nodeId}</b><span>{s.status} · {s.elapsedMs}ms {s.adapter?`· ${s.adapter}`:''}</span></div><details><summary>查看输入输出</summary><pre>{JSON.stringify({input:s.input,output:s.output},null,2)}</pre></details></div>):<div className="empty">提交右侧表单或测试单个节点后查看。</div>}</div>}
            {tab==='code'&&<div className="inspector-body"><p className="micro">功能优先；代码映射仅是可验证证据，不展开全仓调用关系。</p><div className="code-ref">{selected.code||'尚未绑定实现'}</div><div className="code-ref">{selected.test||'尚未绑定测试'}</div>{source?<pre className="source">{source.excerpt}</pre>:<div className="empty">{selected.code?'读取源代码映射…':'新增节点尚未实现；不能假装测试通过。'}</div>}</div>}
          </>}
        </section>
        {isFeedback&&<FeedbackPreview onRun={onFullRun} language={selectedLanguage} adapters={adapters}/>}
      </aside>
    </div>
    <footer className="footer"><span>Contract JSON 是意图；实际运行与测试才是证据。</span><span>需求追踪 · React Flow · Sphinx-Needs</span></footer>
  </div>;
}
export default function App(){
  const [example,setExample]=useState<Example>(()=>{
    const requested=new URLSearchParams(window.location.search).get('example');
    if(requested==='expression'||requested==='sum'||requested==='calculator'||requested==='feedback')return requested;
    const previous=sessionStorage.getItem(exampleKey);
    return previous==='expression'||previous==='sum'||previous==='feedback'?previous:'calculator';
  });
  const changeExample=(next:Example)=>{
    sessionStorage.setItem(exampleKey,next);
    const url=new URL(window.location.href);
    if(url.searchParams.has('example')){url.searchParams.set('example',next);window.history.replaceState(null,'',url)}
    setExample(next);
  };
  return <ReactFlowProvider key={example}><Studio example={example} onExampleChange={changeExample}/></ReactFlowProvider>;
}
