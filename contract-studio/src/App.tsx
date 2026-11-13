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
import suiteSeed from '../contracts/calculator-suite.json';
import { prepareCalculatorRequest, normalizeCalculatorResult, type CalculatorMode } from './calculator-input.mjs';
import { NodeProperties } from './NodeProperties';
import { CapabilityPanel, type Capability } from './CapabilityPanel';
import { describeNodeContext } from './node-context.mjs';
import { importanceLabels, importanceLabel, nodeImportance, type Importance } from './node-importance.mjs';

type Kind = 'group' | 'ui' | 'logic' | 'async' | 'action';
type Spec = {
  id:string; parentId:string|null; title:string; kind:Kind; description:string; importance?:Importance;
  position:{x:number;y:number}; size?:{width:number;height:number};
  input:string;output:string;errors:string[];fixture:Record<string,unknown>;code:string;test:string;processing?:string;acceptance?:string;inputSchema?:Record<string,unknown>;outputSchema?:Record<string,unknown>;capabilityId?:string;
};
type Link = {id:string;source:string;target:string;sourceHandle?:string;targetHandle?:string;label:string};
type Graph={version:number;feature:{id:string;title:string;goal:string};nodes:Spec[];edges:Link[]};
type Step={nodeId:string;input:unknown;output:unknown;elapsedMs:number;status:'ok'|'rejected'|'mock';adapter?:string;derived?:boolean};
type BackendAdapter={id:string;label:string;available:boolean;missing:string[];source:string;buildOnFirstUse:boolean};
type Run={runId?:string;mode?:string;trace?:Step[];result?:Record<string,unknown>;ui?:{tone:string;message:string};items?:Feedback[];nodeId?:string;output?:unknown;simulated?:boolean;elapsedMs?:number;error?:string};
type Feedback={id:string;title:string;category:string;detail:string};
type TraceRef={path:string;line:number;source?:'sphinx-codelinks'|'local-marker'};
type Acceptance={id:string;input:string;expected:string;observable?:string};
type Requirement={id:string;nodeId:string;nodeIds?:string[];title:string;description:string;status:'draft'|'confirmed';revision:number;code:TraceRef[];tests:TraceRef[];acceptance?:Acceptance[];acceptanceStatus?:'draft'|'confirmed'};
type RequirementDraft={title:string;description:string;acceptance?:Acceptance[]};
type Traceability={featureId:string;source:string;projectGraph:Graph;requirements:Requirement[];sphinx:{path:string;state:'current'|'outdated'|'missing'};index?:{state:'current'|'stale'|'failed'|'missing'|'unconfigured';source:string;path:string;builtAt?:string;error?:string;sourceRevision?:unknown};ubcode?:{state:string;message:string}};
type DisplayNode=FlowNode<{spec:Spec;collapsed:boolean;hasChildren:boolean;run?:Step['status'];derived?:boolean;requirement?:Requirement;hasUnsavedRequirement:boolean;traceAvailable:boolean;toggle:(id:string)=>void;addChild:(id:string)=>void;language:string},'contract'>;
type Example='suite'|'expression'|'sum'|'calculator'|'feedback';
const exampleKey='contract-studio-active-example-v1';
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;
const toGraph=(text:string):Graph=>{
  const g:unknown=JSON.parse(text);
  if(!g||typeof g!=='object'||!('nodes' in g)||!('edges' in g))throw Error('不是功能图 JSON');
  const graph=g as Graph;
  if(!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))throw Error('nodes / edges 必须是数组');
  if(new Set(graph.nodes.map(n=>n.id)).size!==graph.nodes.length)throw Error('节点 ID 重复');
  for(const n of graph.nodes){if(!n.id||!n.position||!n.title)throw Error('节点缺少 id/position/title');nodeImportance(n.importance);}
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
  const {spec,hasChildren,collapsed,run,derived,requirement,hasUnsavedRequirement,traceAvailable,toggle,addChild,language}=data;
  const runLabel=run==='mock'?'○ Mock':derived?run==='ok'?'✓ 运行汇总':'! 失败汇总':run==='ok'?'✓ 已执行':run==='rejected'?'! 已拒绝':'';
  const requirementLabel=requirement?(hasUnsavedRequirement?'需求未保存':requirement.status==='confirmed'?'需求已确认':'需求待确认'):(traceAvailable?'需求未关联':'');
  const isComputationGroup=spec.id==='expr-compute'||spec.id==='suite-compute';
  const importance=nodeImportance(spec.importance);
  const badge=<span className={`importance-badge importance-${importance}`} title={`${labelFor(spec.kind)} · ${importanceLabel(importance)}`}>{importanceLabel(importance)}</span>;
  if(spec.kind==='group' && hasChildren && !collapsed){
    return <div className={`group-heading importance-${importance} ${isComputationGroup?'nested-compute-heading':''}`}>
      {isComputationGroup&&<Handle id="in" type="target" position={Position.Left} className="flow-handle"/>}
      <span className="group-identity"><span className="group-name">{spec.title}</span>{badge}{requirementLabel&&<span className={`group-requirement ${!hasUnsavedRequirement&&requirement?.status==='confirmed'?'confirmed':''}`}>{requirementLabel}</span>}{isComputationGroup&&run&&<span className={`group-run ${run}`}>{runLabel}</span>}</span>
      <span className="node-actions"><button className="node-add nodrag" aria-label={`在${spec.title}中添加节点`} onClick={e=>{e.stopPropagation();addChild(spec.id)}}>＋ 添加</button><button className="node-toggle nodrag" aria-expanded="true" onClick={(e)=>{e.stopPropagation();toggle(spec.id)}}>{isComputationGroup?'折叠计算步骤 −':'折叠 −'}</button></span>
      {isComputationGroup&&<><Handle id="ok" type="source" position={Position.Right} style={{top:'36%'}} className="flow-handle"/><Handle id="fail" type="source" position={Position.Right} style={{top:'76%',background:'#c27d56'}} className="flow-handle"/></>}
    </div>;
  }
  return <div className={`node-card node-${spec.kind} importance-${importance} ${run==='rejected'?'node-failed':''} ${run==='ok'?'node-passed':''}`}>
    <Handle id="in" type="target" position={Position.Left} className="flow-handle"/>
    <div className="node-kicker">{badge}<span>{runLabel}</span></div>
    <div className="node-name">{spec.title}</div>{requirementLabel&&<div className={`node-requirement ${!hasUnsavedRequirement&&requirement?.status==='confirmed'?'confirmed':''}`}>{requirementLabel}</div>}{spec.id==='validate'&&<div className="node-runtime">Adapter: {language}</div>}
    {hasChildren&&<button className="node-toggle nodrag" aria-expanded="false" onClick={(e)=>{e.stopPropagation();toggle(spec.id)}}>{isComputationGroup?'展开计算步骤 +':'展开子节点 +'}</button>}
    {spec.kind==='group'&&<button className="node-add nodrag" aria-label={`在${spec.title}中添加节点`} onClick={e=>{e.stopPropagation();addChild(spec.id)}}>＋ 添加</button>}
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
  useEffect(()=>{const t=setTimeout(()=>void flow.fitView({padding:.06,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:180}),50);return()=>clearTimeout(t)},[flow,value]);
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

type SourcePreview={path:string;startLine:number;excerpt:string};
type SourceEditor='vscode'|'notepad';
type OpenSourceResult={opened:boolean;editor:SourceEditor;lineJumped:boolean;message:string};
const sourceEditorKey='contract-studio-source-editor-v1';

function TraceReference({reference,editor,onEditorChange}:{reference:TraceRef;editor:SourceEditor;onEditorChange:(editor:SourceEditor)=>void}){
  const [expanded,setExpanded]=useState(false);
  const [preview,setPreview]=useState<SourcePreview|null>(null);
  const [loading,setLoading]=useState(false);
  const [previewError,setPreviewError]=useState('');
  const [opening,setOpening]=useState(false);
  const [openMessage,setOpenMessage]=useState('');
  const [openError,setOpenError]=useState('');
  const loadPreview=async()=>{
    if(loading)return;
    setLoading(true);setPreviewError('');
    try{setPreview(await api<SourcePreview>(`/api/traceability/source?path=${encodeURIComponent(reference.path)}&line=${reference.line}`))}
    catch(e){setPreviewError(e instanceof Error?e.message:String(e))}
    finally{setLoading(false)}
  };
  const show=()=>{if(expanded){setExpanded(false);return}setExpanded(true);if(!preview)void loadPreview()};
  const openInEditor=async()=>{
    setOpening(true);setOpenMessage('');setOpenError('');
    try{const result=await api<OpenSourceResult>('/api/open-source',{path:reference.path,line:reference.line,editor});setOpenMessage(result.message)}
    catch(e){setOpenError(e instanceof Error?e.message:String(e))}
    finally{setOpening(false)}
  };
  return <div className={`trace-reference ${expanded?'is-expanded':''}`}>
    <button type="button" className="trace-ref" aria-expanded={expanded} onClick={()=>void show()}>
      <span>{reference.path}{reference.source==='local-marker'&&<small className="reference-origin">本地标记</small>}</span><b>第 {reference.line} 行 <span className="trace-chevron" aria-hidden="true">⌄</span></b>
    </button>
    <div className="trace-expand" aria-hidden={!expanded}><div className="trace-expand-inner"><div className="trace-preview-panel">
      <div className="trace-preview-toolbar">
        <label>打开方式<select aria-label={`选择 ${reference.path} 的编辑器`} value={editor} onChange={e=>{onEditorChange(e.target.value as SourceEditor);setOpenError('');setOpenMessage('')}}><option value="vscode">VS Code</option><option value="notepad">记事本</option></select></label>
        <button type="button" className="trace-open" disabled={opening} onClick={()=>void openInEditor()}>{opening?'正在打开…':'在编辑器打开 ↗'}</button>
      </div>
      {editor==='notepad'&&<p className="trace-editor-hint">记事本打开文件后，请按 Ctrl+G 跳到第 {reference.line} 行。</p>}
      {openError&&<div className="notice notice-error" role="alert">{openError}</div>}
      {openMessage&&<div className="trace-open-message" role="status">{openMessage}</div>}
      {loading?<div className="trace-preview-status" role="status">正在读取代码…</div>:previewError?<div className="notice notice-error" role="alert">无法读取代码：{previewError} <button className="link-button" onClick={()=>void loadPreview()}>重试</button></div>:preview&&<div className="trace-code" aria-label={`${preview.path} 代码预览`}><div className="trace-code-caption">代码预览 · 从第 {preview.startLine} 行</div><pre className="trace-code-lines">{preview.excerpt.split('\n').map((line,i)=>{const number=preview.startLine+i;return <span className={`trace-code-line ${number===reference.line?'is-target':''}`} key={number}><span className="trace-line-number" aria-hidden="true">{number}</span><span>{line||' '}</span></span>})}</pre></div>}
    </div></div></div>
  </div>;
}

function RequirementPanel({node,compatible,requirement,draft,traceability,loading,error,onRefresh,onSave,onCreate,onDraftChange,onDiscard}:{
  node:Spec;compatible:boolean;requirement?:Requirement;traceability:Traceability|null;loading:boolean;error:string;
  draft?:RequirementDraft;onDraftChange:(id:string,draft:RequirementDraft)=>void;onDiscard:(id:string)=>void;
  onRefresh:()=>void;onSave:(requirement:Requirement,title:string,description:string,action:'save'|'confirm',acceptance?:Acceptance[],confirmAcceptance?:boolean)=>Promise<void>;
  onCreate:(nodeId:string,id:string,title:string,description:string)=>Promise<void>;
}){
  const [busy,setBusy]=useState(false);
  const [formError,setFormError]=useState('');
  const [editor,setEditor]=useState<SourceEditor>(()=>{try{return localStorage.getItem(sourceEditorKey)==='notepad'?'notepad':'vscode'}catch{return 'vscode'}});
  const changeEditor=(next:SourceEditor)=>{setEditor(next);try{localStorage.setItem(sourceEditorKey,next)}catch{/* The current selection still works in this view. */}};
  if(loading)return <div className="empty">正在读取需求与代码关联…</div>;
  if(error)return <div className="trace-unavailable"><div className="notice notice-error">无法读取需求关联：{error}</div><button className="link-button" onClick={onRefresh}>重新读取</button></div>;
  if(!traceability)return <div className="empty">尚未读取需求关联。</div>;
  if(!compatible)return <div className="empty">当前画布属于其他功能，项目需求不会按同名节点自动关联。</div>;
  if(!requirement)return <CreateRequirement key={node.id} node={node} onCreate={onCreate}/>;
  const title=draft?.title??requirement.title;
  const description=draft?.description??requirement.description;
  const acceptance=draft?.acceptance??requirement.acceptance??[];
  const changed=title!==requirement.title||description!==requirement.description;
  const acceptanceChanged=!sameValue(acceptance,requirement.acceptance??[]);
  const addAcceptance=()=>{let number=1;while(acceptance.some(item=>item.id===`${requirement.id}_AC_${number}`))number++;editAcceptance([...acceptance,{id:`${requirement.id}_AC_${number}`,input:'',expected:''}])};
  const editAcceptance=(next:Acceptance[])=>onDraftChange(requirement.id,{title,description,acceptance:next});
  const save=async(action:'save'|'confirm',confirmAcceptance=false)=>{
    setBusy(true);setFormError('');
    try{await onSave(requirement,title,description,action,acceptance,confirmAcceptance)}catch(e){setFormError(String(e))}finally{setBusy(false)}
  };
  const links=(label:string,refs:TraceRef[])=><div className="trace-links"><div className="trace-links-heading">{label} <span>{refs.length}</span></div>{refs.length?refs.map((ref,i)=><TraceReference key={`${ref.path}:${ref.line}:${i}`} reference={ref} editor={editor} onEditorChange={changeEditor}/>):<div className="trace-missing">尚未发现关联标记</div>}</div>;
  return <div className="requirements-body">
    <div className="requirement-meta"><span className="requirement-id">{requirement.id}</span><span className={`requirement-status ${!changed&&requirement.status==='confirmed'?'confirmed':'draft'}`}>{changed?'有未保存修改':requirement.status==='confirmed'?'已确认':'草稿 · 待确认'}</span></div>
    <div className="trace-section-title">关联证据 <span>{traceability.index?.source==='sphinx-needs+codelinks'?'Sphinx-Needs / CodeLinks':'本地标记索引'}</span></div>
    {links('实现代码',requirement.code)}{links('相关测试',requirement.tests)}
    <p className="micro">列出的是发现的源码标记，不表示测试已经运行或验证通过。</p>
    <div className="field"><label htmlFor="requirement-title">需求标题</label><input id="requirement-title" value={title} onChange={e=>onDraftChange(requirement.id,{title:e.target.value,description,acceptance})}/></div>
    <div className="field"><label htmlFor="requirement-description">需求描述</label><textarea id="requirement-description" rows={4} value={description} onChange={e=>onDraftChange(requirement.id,{title,description:e.target.value,acceptance})}/></div>
    <div className="acceptance-heading"><strong>验收条件</strong><span className={`requirement-status ${!acceptanceChanged&&requirement.acceptanceStatus==='confirmed'?'confirmed':'draft'}`}>{!acceptanceChanged&&requirement.acceptanceStatus==='confirmed'?'已确认':'待确认'}</span></div>
    {acceptance.map((item,index)=><fieldset className="acceptance-item" key={index}><legend>条件 {index+1}</legend>{(['id','input','expected','observable'] as const).map(field=><div className="field" key={field}><label>{({id:'条件 ID',input:'输入',expected:'预期结果',observable:'可观察行为'} as const)[field]}<input aria-label={`条件${index+1}${field}`} value={item[field]??''} onChange={event=>editAcceptance(acceptance.map((entry,i)=>i===index?{...entry,[field]:event.target.value}:entry))}/></label></div>)}<button className="link-button danger-link" onClick={()=>editAcceptance(acceptance.filter((_,i)=>i!==index))}>移除此条件</button></fieldset>)}
    <div className="requirement-actions"><button className="link-button" onClick={addAcceptance}>＋ 添加验收条件</button><button onClick={()=>void save('save',true)} disabled={busy||!acceptance.length||acceptance.some(item=>!item.id.trim()||!item.input.trim()||!item.expected.trim())||(!acceptanceChanged&&requirement.acceptanceStatus==='confirmed')}>确认验收条件</button></div>
    <div className="requirement-actions"><button onClick={()=>void save('save')} disabled={busy||(!changed&&!acceptanceChanged)||!title.trim()||!description.trim()}>保存草稿</button><button className="primary-button" onClick={()=>void save('confirm')} disabled={busy||(!changed&&requirement.status==='confirmed')||!title.trim()||!description.trim()}>{busy?'保存中…':'确认这条需求'}</button>{(changed||acceptanceChanged)&&<button className="link-button" onClick={()=>onDiscard(requirement.id)} disabled={busy}>放弃修改</button>}</div>
    <p className="micro">确认记录当前文字；修改后需重新确认。画布修改先保存在浏览器，需手动保存到项目；业务代码不会自动改写。</p>
    {formError&&<div className="notice notice-error" role="alert">{formError} <button className="link-button" onClick={onRefresh}>重新读取</button></div>}
    <div className="trace-source">需求文件：{traceability.source} · RST 源文件：{traceability.sphinx.state==='current'?'已同步':traceability.sphinx.state==='outdated'?'待同步':'缺失'}</div>
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
type ExpressionRun=Run&{result:{status:'success'|'invalid';value?:number;count?:number;total?:number;message:string;steps?:ExpressionStep[]}};
type ExpressionEngine={expression:string;busy:boolean;result:ExpressionRun|null;error:string;steps:ExpressionStep[];calculate:(value:string)=>Promise<void>;changeExpression:(value:string)=>void};
const initialExpression='12 + 3 × (8 - 4) ÷ 2';
function describeExpressionStep(step:ExpressionStep){
  const symbols:Record<string,string>={'+':'+','-':'−','*':'×','/':'÷','u+':'+','u-':'−'};
  const symbol=symbols[step.operator]??step.operator;
  return step.operands.length===1?`${symbol}${step.operands[0]}`:step.operands.join(` ${symbol} `);
}

function useExpressionEngine(enabled:boolean,onRun:(run:Run)=>void,mode:CalculatorMode='expression'):ExpressionEngine{
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
      const {path,body}=prepareCalculatorRequest(mode,value);
      const run=normalizeCalculatorResult(mode,await api<unknown>(path,body)) as ExpressionRun;
      if(current!==requestId.current)return;
      setResult(run);onRunRef.current(run);
    }catch(e){
      if(current!==requestId.current)return;
      setError(String(e));onRunRef.current({trace:[]});
    }finally{if(current===requestId.current)setBusy(false)}
  };
  useEffect(()=>{if(!enabled)return;void calculate(expressionRef.current);return()=>{requestId.current++}},[enabled,mode]);
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

// @need-ids: REQ_EXPR_INPUT, REQ_EXPR_RESULT, REQ_AVERAGE_ALL
function ExpressionCalculator({engine,onShowProcess,title='混合运算计算器',inputMode='expression'}:{engine:ExpressionEngine;onShowProcess:()=>void;title?:string;inputMode?:CalculatorMode}){
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
  const runCalculation=()=>{onShowProcess();void calculate(expression)};
  const keys=[
    {label:'C',action:clear,kind:'utility',aria:'清除'},
    {label:'⌫',action:erase,kind:'utility',aria:'退格'},
    {label:inputMode==='average'?',':'(',action:()=>insert(inputMode==='average'?',':'('),kind:'utility',aria:inputMode==='average'?'分隔数字':'左括号'},
    {label:inputMode==='average'?'±':')',action:()=>insert(inputMode==='average'?'-':')'),kind:'utility',aria:inputMode==='average'?'负号':'右括号'},
    ...['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','+'].map(label=>({label,action:()=>insert(label),kind:['÷','×','−','+'].includes(label)?'operator':'digit',aria:({'+':'加','−':'减','×':'乘','÷':'除','.':'小数点'} as Record<string,string>)[label]??label})),
  ];
  return <section className="expression-calculator" aria-labelledby="expression-calculator-title">
    <div className="expression-calculator-heading"><div><div className="eyebrow">亲手试一试</div><h2 id="expression-calculator-title">{title}</h2></div><span>支持键盘输入</span></div>
    <form onSubmit={event=>{event.preventDefault();runCalculation()}}>
      <div className="expression-calculator-display">
        <label htmlFor="expression-calculator-input">{inputMode==='average'?'数字列表':'算式'}</label>
        <input ref={inputRef} id="expression-calculator-input" aria-label="计算器算式" value={expression} onChange={event=>changeExpression(event.target.value)} onKeyDown={event=>{if(event.key==='='){event.preventDefault();runCalculation()}else if(event.key==='Escape'){event.preventDefault();clear()}}} placeholder={inputMode==='average'?'例如 1, 2, 3':'输入算式'} spellCheck={false}/>
        <div className={`expression-calculator-output ${error||result?.ui?.tone==='error'?'is-error':''}`} role="status">
          {error?error:result?.ui?.tone==='error'?result.ui.message:typeof result?.result.value==='number'?String(result.result.value):'等待计算'}
        </div>
      </div>
      <div className="expression-calculator-keys">
        {keys.map(key=><button key={key.label} type="button" className={`expression-calculator-key ${key.kind}`} aria-label={key.aria} onMouseDown={event=>event.preventDefault()} onClick={key.action}>{key.label}</button>)}
        <button type="submit" className="expression-calculator-key equals" aria-label="计算结果" disabled={busy}>=</button>
      </div>
    </form>
    <p className="expression-calculator-hint">{inputMode==='average'?'数字用逗号或加号分隔。':'按所选模式计算。'}Enter 或 = 计算，Esc 清空。小数可能有浮点舍入误差。</p>
  </section>;
}

function Studio({example,onExampleChange}:{example:Example;onExampleChange:(example:Example)=>void}){
  const isSuite=example==='suite';
  const isExpression=example==='expression';
  const isCalculator=example==='calculator';
  const isSum=example==='sum';
  const isFeedback=example==='feedback';
  const original=(isSuite?suiteSeed:isExpression?expressionSeed:isSum?sumSeed:isCalculator?calculatorSeed:feedbackSeed) as Graph;
  const rootId=isSuite?'suite':isExpression?'expression':isSum?'sum':isCalculator?'calculator':'submit';
  const defaultSelected=isSuite?'suite':isExpression?'expr-compute':isSum?'sum-accumulate':isCalculator?'calc-compute':'lookup';
  const JSON_KEY=isSuite?'contract-studio-suite-graph-v1':isExpression?'contract-studio-expression-graph-v1':isSum?'contract-studio-sum-graph-v1':isCalculator?'contract-studio-calculator-graph-v1':'contract-studio-adapters-v03';
  const GRAPH_BASE_KEY=isSuite?'contract-studio-suite-graph-base-v1':isExpression?'contract-studio-expression-graph-base-v1':isSum?'contract-studio-sum-graph-base-v1':isCalculator?'contract-studio-calculator-graph-base-v1':'contract-studio-project-graph-base-v1';
  const GRAPH_PENDING_KEY=isSuite?'contract-studio-suite-graph-pending-v1':isExpression?'contract-studio-expression-graph-pending-v1':isSum?'contract-studio-sum-graph-pending-v1':isCalculator?'contract-studio-calculator-graph-pending-v1':'contract-studio-project-graph-pending-v1';
  const REQUIREMENT_DRAFT_KEY=isSuite?'contract-studio-suite-requirement-drafts-v1':isExpression?'contract-studio-expression-requirement-drafts-v1':isSum?'contract-studio-sum-requirement-drafts-v1':isCalculator?'contract-studio-calculator-requirement-drafts-v1':'contract-studio-requirement-drafts-v1';
  const traceUrl=isSuite?'/api/traceability?feature=suite':isExpression?'/api/traceability?feature=expression':isSum?'/api/traceability?feature=sum':isCalculator?'/api/traceability?feature=calculator':'/api/traceability';
  const [initial]=useState(()=>{
    let graph=clone(original),hasDraft=false,base:Graph|null=null,rawDraft='',draftError='';
    try{rawDraft=localStorage.getItem(JSON_KEY)??'';if(rawDraft){hasDraft=true;graph=toGraph(rawDraft)}}catch(error){draftError=String(error)}
    try{const text=localStorage.getItem(GRAPH_BASE_KEY);if(text)base=toGraph(text)}catch{/* A missing baseline requires explicit reconciliation. */}
    return {graph,hasDraft,base,rawDraft,draftError};
  });
  const [draftReadError,setDraftReadError]=useState(initial.draftError);
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
  const [capabilities,setCapabilities]=useState<Capability[]>([]);
  const [capabilityError,setCapabilityError]=useState('');
  useEffect(()=>{let live=true;void api<{capabilities:Capability[]}>('/api/capabilities').then(data=>{if(live)setCapabilities(data.capabilities)}).catch(reason=>{if(live)setCapabilityError(String(reason))});return()=>{live=false}},[]);
  useEffect(()=>{if(!isFeedback)return;let live=true;void api<{adapters:BackendAdapter[]}>('/api/adapters').then(d=>{if(live)setAdapters(d.adapters)}).catch(e=>{if(live)setAdapterError(String(e))});return()=>{live=false}},[isFeedback]);
  const [traceability,setTraceability]=useState<Traceability|null>(null);
  const [requirementDrafts,setRequirementDrafts]=useState<Record<string,RequirementDraft>>(()=>{try{const saved=JSON.parse(localStorage.getItem(REQUIREMENT_DRAFT_KEY)??'{}');return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{}}catch{return {}}});
  const [traceLoading,setTraceLoading]=useState(true);
  const [traceError,setTraceError]=useState('');
  const [indexBusy,setIndexBusy]=useState(false);
  const [indexError,setIndexError]=useState('');
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
  const saveRequirement=async(requirement:Requirement,title:string,description:string,action:'save'|'confirm',acceptance?:Acceptance[],confirmAcceptance=false)=>{
    const updated=await api<Traceability>('/api/traceability/requirement',{featureId:traceability?.featureId,id:requirement.id,title,description,revision:requirement.revision,action,acceptance,confirmAcceptance});
    setTraceability(updated);
    setRequirementDrafts(old=>{const next={...old};delete next[requirement.id];return next});
  };
  const discardDraft=(id:string)=>setRequirementDrafts(old=>{const next={...old};delete next[id];return next});
  const changeDraft=(id:string,draft:RequirementDraft)=>setRequirementDrafts(old=>({...old,[id]:draft}));
  const createRequirement=async(nodeId:string,id:string,title:string,description:string)=>{
    const updated=await api<Traceability>('/api/traceability/requirement',{featureId:traceability?.featureId,id,nodeId,title,description,action:'create'});
    setTraceability(updated);
  };
  const initialCollapsed=()=>new Set<string>(isSuite?['suite-compute','calculator','sum','expression','expr-compute','average']:isExpression?['expr-compute']:[]);
  const [collapsed,setCollapsed]=useState<Set<string>>(initialCollapsed);
  const [tab,setTab]=useState<'property'|'document'|'requirement'|'test'|'code'|'trace'>('property');
  const [expressionPane,setExpressionPane]=useState<'detail'|'process'>('detail');
  const [suiteMode,setSuiteMode]=useState<CalculatorMode>('expression');
  const modeInputs=useRef<Partial<Record<CalculatorMode,string>>>({expression:initialExpression});
  const [activeRequirementId,setActiveRequirementId]=useState('');
  const [linkRequirementId,setLinkRequirementId]=useState('');
  const [creatingRequirement,setCreatingRequirement]=useState(false);
  const [linkBusy,setLinkBusy]=useState(false);
  const [linkError,setLinkError]=useState('');
  const [panelOpen,setPanelOpen]=useState(!isSuite);
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
  const selectedRequirements=compatible?traceability?.requirements.filter(r=>(r.nodeIds??[r.nodeId]).includes(selectedId))??[]:[];
  const selectedRequirement=selectedRequirements.find(requirement=>requirement.id===activeRequirementId)??selectedRequirements[0];
  const selectedCapability=selected?.capabilityId?capabilities.find(capability=>capability.id===selected.capabilityId):capabilities.find(capability=>capability.nodeIds.includes(selectedId));
  const degree={in:graph.edges.filter(x=>x.target===selectedId).length,out:graph.edges.filter(x=>x.source===selectedId).length};
  useEffect(()=>{if(!draftReadError)localStorage.setItem(JSON_KEY,JSON.stringify(graph))},[graph,draftReadError]);
  useEffect(()=>{if(draftReadError)return;if(graphBase)localStorage.setItem(GRAPH_BASE_KEY,JSON.stringify(graphBase));else localStorage.removeItem(GRAPH_BASE_KEY)},[graphBase,draftReadError]);
  useEffect(()=>{localStorage.setItem(REQUIREMENT_DRAFT_KEY,JSON.stringify(requirementDrafts))},[requirementDrafts]);
  useEffect(()=>{setGraphMessage(null)},[graph]);
  useEffect(()=>{setFixture(JSON.stringify(selected?.fixture??{},null,2));setNodeResult(null);setError('');setSource(null);setActiveRequirementId('');setCreatingRequirement(false);setLinkRequirementId('');setLinkError('')},[selectedId]);
  useEffect(()=>{if(!panelOpen)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!(event.target instanceof HTMLInputElement)&&!(event.target instanceof HTMLTextAreaElement))setPanelOpen(false)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[panelOpen]);
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
  const toggleNode=useCallback((id:string)=>{toggle(id);if(isExpression||isSuite){setSelectedId(id);setExpressionPane('detail')}},[toggle,isExpression,isSuite]);
  const hidden=useCallback((n:Spec)=>{let p=n.parentId;const walked=new Set<string>();while(p&&!walked.has(p)){if(collapsed.has(p))return true;walked.add(p);p=byId.get(p)?.parentId??null}return false},[collapsed,byId]);
  const statuses=useMemo(()=>Object.fromEntries(trace.map(t=>[t.nodeId,t.status])),[trace]);
  const derivedNodes=useMemo(()=>new Set(trace.filter(step=>step.derived).map(step=>step.nodeId)),[trace]);
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
  const suiteLayout=useMemo(()=>{
    if(!isSuite)return {offsets:new Map<string,{x:number;y:number}>(),width:0,height:0,computeWidth:0,computeHeight:0};
    const offsets=new Map<string,{x:number;y:number}>();
    const children=graph.nodes.filter(n=>n.parentId==='suite-compute').sort((a,b)=>a.position.y-b.position.y);
    let computeWidth=870,computeHeight=285;
    if(children.length<=4&&children.every(n=>['calculator','sum','expression','average'].includes(n.id)&&collapsed.has(n.id))){
      computeWidth=650;
      for(const n of children){const i=children.indexOf(n);const initial=(suiteSeed as Graph).nodes.find(x=>x.id===n.id)!;const delta={x:initial.position.x-(25+(i%2)*290),y:initial.position.y-(85+Math.floor(i/2)*170)};offsets.set(n.id,delta);computeWidth=Math.max(computeWidth,n.position.x-delta.x+295);computeHeight=Math.max(computeHeight,n.position.y-delta.y+185)}
    }else{
      let offset=0;computeWidth=500;computeHeight=250;
      for(const n of children){offsets.set(n.id,{x:0,y:offset});const has=graph.nodes.some(c=>c.parentId===n.id),folded=has&&collapsed.has(n.id);const h=has&&!folded?(n.size?.height??415):n.kind==='group'?120:116;const w=has&&!folded?(n.size?.width??970):n.kind==='group'?230:176;computeWidth=Math.max(computeWidth,n.position.x+w+65);computeHeight=Math.max(computeHeight,n.position.y-offset+h+65);if(folded)offset+=Math.max(0,(n.size?.height??415)-120)}
    }
    const expanded=!collapsed.has('suite-compute');const groupWidth=expanded?computeWidth:230,groupHeight=expanded?computeHeight:120;
    const targets:Record<string,{x:number;y:number}>={'suite-input':{x:30,y:135},'suite-compute':{x:260,y:85},'suite-result':{x:260+groupWidth+60,y:135}};
    let width=260+groupWidth+300,height=Math.max(285,groupHeight+160);
    for(const n of graph.nodes.filter(x=>x.parentId==='suite')){
      const target=targets[n.id];const initial=(suiteSeed as Graph).nodes.find(x=>x.id===n.id);
      if(target&&initial){const delta={x:initial.position.x-target.x,y:initial.position.y-target.y};offsets.set(n.id,delta);width=Math.max(width,n.position.x-delta.x+(n.id==='suite-compute'?groupWidth:176)+65);height=Math.max(height,n.position.y-delta.y+(n.id==='suite-compute'?groupHeight:116)+65)}
      else {width=Math.max(width,n.position.x+(n.size?.width??176)+65);height=Math.max(height,n.position.y+(n.size?.height??116)+65)}
    }
    return {offsets,width,height,computeWidth,computeHeight};
  },[isSuite,graph.nodes,collapsed]);
  const addChild=useCallback((parentId:string)=>{
    if(!graphReady)return;
    const id=`step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
    setGraph(g=>{
      const parent=g.nodes.find(n=>n.id===parentId);
      if(!parent||parent.kind!=='group')return g;
      const children=g.nodes.filter(n=>n.parentId===parentId);
      const y=Math.max(80,...children.map(n=>n.position.y+(n.size?.height??120)+28));
      const node:Spec={id,parentId,title:'新功能节点',kind:'logic',importance:'normal',description:'',position:{x:35,y},input:'待填写',output:'待填写',processing:'',acceptance:'',errors:[],fixture:{},code:'',test:''};
      const size={width:Math.max(parent.size?.width??0,970),height:Math.max(parent.size?.height??0,y+160)};
      return {...g,nodes:[...g.nodes.map(n=>n.id===parentId?{...n,size}:n),node]};
    });
    setCollapsed(old=>{const next=new Set(old);next.delete(parentId);return next});
    setSelectedId(id);setPanelOpen(true);setTab('property');setExpressionPane('detail');setFitVersion(n=>n+1);
  },[graphReady]);
  const flowNodes=useMemo<DisplayNode[]>(()=>[...graph.nodes].sort((a,b)=>{const depth=(node:Spec)=>{let value=0,p=node.parentId;const seen=new Set<string>();while(p&&!seen.has(p)){seen.add(p);value++;p=byId.get(p)?.parentId??null}return value};return depth(a)-depth(b)}).map(n=>{
    const hasChildren=graph.nodes.some(x=>x.parentId===n.id);
    const folded=hasChildren&&collapsed.has(n.id);
    const displacement=suiteLayout.offsets.get(n.id);
    return {id:n.id,type:'contract',parentId:n.parentId??undefined,position:displacement?{x:n.position.x-displacement.x,y:n.position.y-displacement.y}:n.position,
      style:{width:isSuite&&n.id==='suite'&&!folded?suiteLayout.width:isSuite&&n.id==='suite-compute'&&!folded?suiteLayout.computeWidth:hasChildren&&!folded?(n.size?.width??970):n.kind==='group'?230:176,height:isSuite&&n.id==='suite'&&!folded?suiteLayout.height:isSuite&&n.id==='suite-compute'&&!folded?suiteLayout.computeHeight:hasChildren&&!folded?(n.size?.height??415):n.kind==='group'?120:116},
      hidden:hidden(n),selected:n.id===selectedId,
      data:{spec:n,hasChildren,collapsed:folded,run:statuses[n.id],derived:derivedNodes.has(n.id),requirement:compatible&&!traceError&&!traceLoading?traceability?.requirements.find(r=>(r.nodeIds??[r.nodeId]).includes(n.id)):undefined,hasUnsavedRequirement:compatible&&!!traceability?.requirements.some(r=>(r.nodeIds??[r.nodeId]).includes(n.id)&&!!requirementDrafts[r.id]&&(requirementDrafts[r.id].title!==r.title||requirementDrafts[r.id].description!==r.description||!sameValue(requirementDrafts[r.id].acceptance??r.acceptance??[],r.acceptance??[]))),traceAvailable:compatible&&!traceError&&!traceLoading,toggle:toggleNode,addChild,language:selectedLanguage},
    };
  }),[graph.nodes,byId,collapsed,hidden,selectedId,statuses,derivedNodes,toggleNode,addChild,selectedLanguage,traceability,requirementDrafts,compatible,traceError,traceLoading,isSuite,suiteLayout]);
  const flowEdges=useMemo<Edge[]>(()=>graph.edges.map(e=>({
    ...e,id:e.id,sourceHandle:e.sourceHandle??'ok',targetHandle:e.targetHandle??'in',type:'branch',
    hidden:hidden(byId.get(e.source)!)||hidden(byId.get(e.target)!),
    animated:activeEdges.has(e.id),style:{stroke:activeEdges.get(e.id)==='rejected'?'#c45f40':activeEdges.has(e.id)?'#178367':'#94a3b8',strokeWidth:activeEdges.has(e.id)?2.5:1.5},
    markerEnd:{type:MarkerType.ArrowClosed,color:'#94a3b8',width:16,height:16}
  })),[graph.edges,byId,hidden,activeEdges]);
  const onNodesChange=useCallback((changes:NodeChange<DisplayNode>[])=>{
    setGraph(g=>{let updated=g.nodes;for(const c of changes){if(c.type==='position'&&c.position){updated=updated.map(n=>{if(n.id!==c.id)return n;const delta=suiteLayout.offsets.get(n.id);return {...n,position:delta?{x:c.position!.x+delta.x,y:c.position!.y+delta.y}:c.position!}})}}return updated===g.nodes?g:{...g,nodes:updated}});
  },[suiteLayout]);
  const onEdgesChange=useCallback((changes:EdgeChange[])=>{
    const deleted=new Set(changes.filter(x=>x.type==='remove').map(x=>x.id));
    if(deleted.size)setGraph(g=>({...g,edges:g.edges.filter(e=>!deleted.has(e.id))}));
  },[]);
  const onConnect=useCallback((c:Connection)=>{
    if(!c.source||!c.target||c.source===c.target)return;
    const id=`edge-${Date.now()}`;
    setGraph(g=>({...g,edges:[...g.edges,{id,source:c.source,target:c.target,sourceHandle:c.sourceHandle??'ok',targetHandle:c.targetHandle??'in',label:c.sourceHandle==='fail'?'失败':'下一步'}]}));
  },[]);
  const update=(patch:Partial<Spec>)=>{setGraph(g=>({...g,nodes:g.nodes.map(n=>n.id===selectedId?{...n,...patch}:n)}));if(patch.parentId)setCollapsed(old=>{const next=new Set(old);next.delete(patch.parentId!);return next})};
  const remove=()=>{
    if(selectedId===rootId)return;
    const removed=new Set([selectedId]);let changed=true;
    while(changed){changed=false;for(const node of graph.nodes)if(node.parentId&&removed.has(node.parentId)&&!removed.has(node.id)){removed.add(node.id);changed=true}}
    if(removed.size>1&&!window.confirm(`删除「${selected?.title}」和它的 ${removed.size-1} 个子节点？此操作先修改浏览器草稿。`))return;
    setGraph(g=>({...g,nodes:g.nodes.filter(n=>!removed.has(n.id)),edges:g.edges.filter(e=>!removed.has(e.source)&&!removed.has(e.target))}));setSelectedId(rootId);
  };
  const addNode=()=>{
    const id=`step-${Date.now().toString(36)}`;
    const node:Spec={id,parentId:rootId,title:'待实现功能',kind:'logic',importance:'normal',description:'请先描述输入、处理、输出及异常。',position:{x:35,y:260},input:'Any',output:'Any',errors:[],fixture:{},code:'',test:''};
    setGraph(g=>({...g,nodes:[...g.nodes,node]}));setCollapsed(isExpression?old=>{const next=new Set(old);next.delete(rootId);return next}:new Set());setSelectedId(id);setFitVersion(n=>n+1);
  };
  const runSelected=async()=>{
    if(!selected||!selectedCapability)return;setError('');setBusy(true);
    try{const input=JSON.parse(fixture);
      const nodeId=selectedCapability.nodeIds.includes(selected.id)?selected.id:selectedCapability.rootNodeId;
      const result=await api<Run>(selectedCapability.testPath,{nodeId,input,mode,language:selectedLanguage});setNodeResult(result);
      if(result.trace)setTrace(result.trace);else setTrace([{nodeId:selected.id,input,output:result.output,status:result.simulated?'mock':(result.output as {status?:string})?.status==='invalid'||(result.output as {status?:string})?.status==='duplicate'?'rejected':'ok',elapsedMs:result.elapsedMs??0}]);
    }catch(e){setError(String(e))}finally{setBusy(false)};
  };
  const projectGraph=traceability?.projectGraph;
  const graphConflict=!!graphBase&&!!projectGraph&&!sameValue(graphBase,projectGraph);
  const graphCompatible=!!projectGraph&&graph.feature?.id===traceability?.featureId;
  const graphDirty=!!graphBase&&!sameValue(graph,graphBase);
  const saveGraph=async()=>{
    if(draftReadError||!graphBase||!graphCompatible||graphConflict)return;
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
      if((draftReadError||!sameValue(graph,project))&&!window.confirm('加载项目图会替换当前浏览器画布草稿。请先导出需要保留的草稿。确定继续吗？'))return;
      setDraftReadError('');setGraph(clone(project));setGraphBase(clone(project));setSelectedId(project.nodes[0]?.id??'');setCollapsed(initialCollapsed());setTrace([]);setFitVersion(n=>n+1);
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
  const exportGraph=()=>{const blob=new Blob([draftReadError?initial.rawDraft:JSON.stringify(graph,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`contract.${example}${draftReadError?'.invalid-draft':''}.json`;a.click();URL.revokeObjectURL(url)};
  const importGraph=async(file?:File)=>{if(!file)return;try{const g=toGraph(await file.text());setDraftReadError('');setGraph(g);setSelectedId(g.nodes[0]?.id??'');setTrace([]);setCollapsed(initialCollapsed());setFitVersion(n=>n+1);setGraphMessage(null)}catch(e){setGraphMessage({tone:'error',text:`无法导入画布：${String(e)}`})}};
  const selectNode=(id:string)=>{setSelectedId(id);setError('');setPanelOpen(true);setTab('property');setExpressionPane('detail')};
  const selectedPath:Spec[]=[];
  {let current=selected;const seen=new Set<string>();while(current&&!seen.has(current.id)){seen.add(current.id);selectedPath.unshift(current);current=current.parentId?byId.get(current.parentId):undefined}}
  const onFullRun=(run:Run)=>{
    const actual=run.trace??[];
    if(isSuite&&actual.length&&run.result){
      const rejected=run.result.status!=='success';
      const marker=(nodeId:string,status:'ok'|'rejected'):Step=>({nodeId,input:null,output:null,elapsedMs:0,status,derived:true});
      setTrace([marker('suite-input','ok'),...actual,marker('suite-compute',rejected?'rejected':'ok'),marker('suite-result','ok')]);
    }else setTrace(actual);
    setNodeResult(run);setError('');
  };
  const expressionEngine=useExpressionEngine(isExpression||isSuite,onFullRun,isSuite?suiteMode:'expression');
  const changeCalculationMode=(next:CalculatorMode,exampleValue?:string)=>{
    if(next===suiteMode){if(exampleValue!==undefined){expressionEngine.changeExpression(exampleValue);void expressionEngine.calculate(exampleValue)}return}
    modeInputs.current[suiteMode]=expressionEngine.expression;
    const defaults:Record<CalculatorMode,string>={expression:initialExpression,sum:'1+2+3',calculator:'1+2',average:'1, 2, 3'};
    expressionEngine.changeExpression(exampleValue??modeInputs.current[next]??defaults[next]);setSuiteMode(next);setTrace([]);setNodeResult(null);
  };
  const buildIndex=async()=>{setIndexBusy(true);setIndexError('');try{setTraceability(await api<Traceability>('/api/traceability/build',{featureId:traceability?.featureId??graph.feature.id}))}catch(reason){setIndexError(String(reason))}finally{setIndexBusy(false)}};
  const linkRequirement=async()=>{
    const requirement=traceability?.requirements.find(item=>item.id===linkRequirementId);if(!requirement)return;
    setLinkBusy(true);setLinkError('');
    try{const nodeIds=[...new Set([...(requirement.nodeIds??[requirement.nodeId]),selectedId])];setTraceability(await api<Traceability>('/api/traceability/requirement',{featureId:traceability!.featureId,id:requirement.id,title:requirement.title,description:requirement.description,revision:requirement.revision,action:'save',nodeIds}));setActiveRequirementId(requirement.id);setCreatingRequirement(false);setLinkRequirementId('')}catch(reason){setLinkError(String(reason))}finally{setLinkBusy(false)}
  };
  const openCapability=(capability:Capability)=>{
    if(capability.id==='feedback.submit'){if(!isFeedback)onExampleChange('feedback');else document.querySelector('.preview-panel')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});setPanelOpen(false);return}
    if(!isSuite){onExampleChange('suite');return}
    const next=capability.frontend?.mode as CalculatorMode;
    if(['average','expression','sum','calculator'].includes(next)){
      changeCalculationMode(next);
      setPanelOpen(false);document.querySelector('.suite-calculator')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    }
  };
  const nodeDocument=selected?[
    `# ${selected.title}`,`节点：${selected.id} · 所属：${selectedPath.map(n=>n.title).join(' / ')}`,`来源：${graphDirty?'浏览器草稿，尚未保存到项目':'项目功能图'}`,
    `## 功能描述\n${selected.description||'待填写'}`,`## 输入\n${selected.input||'待填写'}${selected.inputSchema?'\n```json\n'+JSON.stringify(selected.inputSchema,null,2)+'\n```':''}`,
    `## 处理\n${selected.processing||'待填写'}`,`## 输出\n${selected.output||'待填写'}${selected.outputSchema?'\n```json\n'+JSON.stringify(selected.outputSchema,null,2)+'\n```':''}`,
    `## 异常\n${selected.errors.join('\n')||'待填写'}`,`## 节点验收说明\n${selected.acceptance||'待填写'}`,
    describeNodeContext(graph,selected.id),
    `## 关联需求\n${selectedRequirements.map(requirement=>`### ${requirement.id} · ${requirement.title}\n状态：${requirement.status==='confirmed'?'正文已确认':'正文待确认'}；验收：${requirement.acceptanceStatus==='confirmed'?'已确认':'待确认'}\n${requirement.description}\n${(requirement.acceptance??[]).map(item=>`- ${item.id}：输入 ${item.input}；预期 ${item.expected}${item.observable?'；观察 '+item.observable:''}`).join('\n')}`).join('\n\n')||'待关联'}`,
    `## 实现函数\n${selectedCapability?.implementation.map(ref=>`- ${ref.path}#${ref.symbol}`).join('\n')||'待实现'}`,
    `## 前端入口\n${selectedCapability?.frontend?`${selectedCapability.frontend.component} · ${selectedCapability.frontend.path} · 模式 ${selectedCapability.frontend.mode??'默认'}`:'前端待接入'}`,
    `## 源码定位\n${selectedRequirements.flatMap(requirement=>requirement.code.map(ref=>`- ${ref.path}:${ref.line} (${ref.source??'索引'})`)).join('\n')||'待关联'}`,
    `## 相关测试\n${selectedRequirements.flatMap(requirement=>requirement.tests.map(ref=>`- ${ref.path}:${ref.line}`)).join('\n')||selectedCapability?.testFiles.join('\n')||'待关联'}`
  ].join('\n\n'):'';
  const nodeTask=[`# Codex 开发任务：${selected?.title??''}`,'请围绕下列节点契约完成实现、前端接入和验收。保留其他功能的既有入口与行为；未确认需求先指出待确认项。',nodeDocument,`## 本次需要补齐\n- 后端：${selectedCapability?'核对实际实现与当前契约':'待实现并登记可信能力'}\n- 前端：${selectedCapability?.frontend?'核对输入、结果、错误及过程展示':'补齐真实功能操作入口'}\n- 验收：运行关联测试并记录结果，在工作台核对成功与失败路径。`,`## 追踪上下文\n项目：${graph.feature.id}\n需求源：${traceability?.source??'未读取'}\n索引：${traceability?.index?.source??'未读取'} / ${traceability?.index?.state??'未读取'}\n实际测试证据：${selectedCapability?`/api/capabilities/evidence?capabilityId=${selectedCapability.id}`:'能力尚未登记'}`].join('\n\n');
  const exportNodeDocument=(task=false)=>{const blob=new Blob([task?nodeTask:nodeDocument],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${selected?.id??'node'}${task?'.codex-task':''}.md`;a.click();URL.revokeObjectURL(url)};
  const graphStatus=!graphReady?'正在读取项目图…':traceError?'无法读取项目图，浏览器草稿仍可编辑':!graphCompatible?'画布功能与项目图不匹配':graphConflict?'项目图已变更，本地草稿未覆盖':!graphBase?'浏览器草稿缺少项目基线':graphDirty?'浏览器草稿 · 未保存到项目':'已与项目图同步';
  return <div className="studio-shell">
    <header className="topbar"><div className="brand"><div className="brand-symbol">◇</div><div><strong>Contract Studio</strong><span>让功能可见，让实现可验</span></div></div><div className="top-actions">{!isSuite&&<button onClick={addNode} disabled={!graphReady}>＋ 添加节点</button>}<button onClick={()=>void saveGraph()} disabled={!!draftReadError||!graphReady||graphBusy||!!traceError||!graphCompatible||!graphBase||graphConflict||!graphDirty} className="save-project">{graphBusy?'处理中…':'保存到项目'}</button><button onClick={exportGraph}>导出 JSON</button><button onClick={()=>fileRef.current?.click()} disabled={!graphReady}>导入</button><button onClick={()=>{if(draftReadError&&!window.confirm('重置会替换被拒绝的草稿，请先导出需要保留的原稿。继续吗？'))return;setDraftReadError('');setGraph(clone(original));setSelectedId(defaultSelected);setCollapsed(initialCollapsed());setTrace([]);setFitVersion(n=>n+1)}} disabled={!graphReady}>重置画布</button><input hidden type="file" ref={fileRef} accept=".json,application/json" onChange={e=>{void importGraph(e.target.files?.[0]);e.target.value=''}}/></div></header>
    <div className="subheader"><div className="example-switcher"><label htmlFor="studio-example">示例项目</label><select id="studio-example" value={example} onChange={e=>onExampleChange(e.target.value as Example)}><option value="suite">计算器</option><option value="feedback">反馈工单</option>{isExpression&&<option value="expression">混合四则运算（旧版）</option>}{isSum&&<option value="sum">多数字求和（旧版）</option>}{isCalculator&&<option value="calculator">四则计算器（旧版）</option>}</select></div><span className="sub-caption">需求 · 功能图 · 实现与测试</span></div>
    {isFeedback&&<div className="adapter-bar"><label htmlFor="adapter-lang">校验节点的后端语言</label><select id="adapter-lang" value={selectedLanguage} onChange={e=>{setSelectedLanguage(e.target.value);setNodeResult(null);setSource(null);setTrace([])}}>{(adapters.length?adapters:[{id:'javascript',label:'Node.js / JavaScript',available:true,missing:[],source:'',buildOnFirstUse:false}]).map(a=><option key={a.id} value={a.id} disabled={!a.available}>{a.label}{a.available?'':'（缺少 '+a.missing.join(', ')+'）'}</option>)}</select><span className="micro">{adapterError||'只切换「字段校验」的执行语言；其他节点保持不变。编译型语言首次运行会自动编译。'}</span></div>}
    <div className="workspace">
      <section className={`canvas ${isExpression||isSuite?'with-expression-calculator':''}`}>
        <div className="canvas-header"><strong>功能流程</strong><span>{isSuite?'点击节点编辑；在功能组内添加子节点':'点击节点查看需求、代码与测试；双击父功能折叠 / 展开'}</span><button onClick={()=>toggle(rootId)}>{collapsed.has(rootId)?'展开全部':'折叠功能'}</button></div>
        <div className="importance-legend" aria-label="逻辑重要性图例"><span>逻辑重要性</span>{Object.entries(importanceLabels).map(([value,label])=><span className={`importance-badge importance-${value}`} key={value}>{label}</span>)}</div>
        <div className={`graph-sync ${graphConflict||!graphBase?'attention':''}`} role="status"><span>{graphStatus}</span><div><button onClick={refreshTraceability} disabled={!graphReady||graphBusy||traceLoading}>刷新状态</button><button onClick={()=>void loadProjectGraph()} disabled={!graphReady||graphBusy}>读取项目图</button>{graphCompatible&&(graphConflict||!graphBase)&&<button onClick={()=>void rebaseGraph()} disabled={graphBusy}>保留草稿并更新基线</button>}</div></div>
        <div className={`index-status ${traceability?.index?.state??'missing'}`} role="status"><span><b>需求索引</b> · {indexBusy?'正在构建…':traceability?.index?({current:'已构建 · 当前',stale:'源已变化 · 待重建',failed:'构建失败',missing:'尚未构建',unconfigured:'未配置构建工具'} as const)[traceability.index.state]:'正在读取'}{traceability?.index?.source==='local-marker'?' · 本地标记兼容视图':' · Sphinx-Needs / CodeLinks'}</span><button className="link-button" disabled={indexBusy||traceLoading||!traceability} onClick={()=>void buildIndex()}>重建索引</button></div>
        {traceability?.ubcode&&<div className="index-tool-note">ubCode：{traceability.ubcode.message}</div>}
        {(indexError||traceability?.index?.error)&&<div className="graph-message error" role="alert">{indexError||traceability?.index?.error}</div>}
        {capabilityError&&<div className="graph-message error" role="alert">运行能力暂不可用：{capabilityError}</div>}
        {draftReadError&&<div className="graph-message error" role="alert">浏览器草稿读取被拒绝：{draftReadError}。原始草稿已保留，当前显示项目示例且暂停自动保存；“导出 JSON”可备份原稿，再读取项目图或导入修正版。</div>}
        {graphMessage&&<div className={`graph-message ${graphMessage.tone}`} role={graphMessage.tone==='error'?'alert':'status'}>{graphMessage.text}</div>}
        <ReactFlow nodes={flowNodes} edges={flowEdges} nodesDraggable={graphReady} nodesConnectable={graphReady} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_,n)=>selectNode(n.id)} onNodeDoubleClick={(_,n)=>{if(graph.nodes.some(x=>x.parentId===n.id))toggleNode(n.id)}} onPaneClick={(event)=>{if(isSuite&&event.detail===2&&graphReady)addChild(rootId)}} fitView fitViewOptions={{padding:.06}} minZoom={.2} maxZoom={1.5} zoomOnScroll={!(isExpression||isSuite)} preventScrolling={!(isExpression||isSuite)} deleteKeyCode={null} defaultEdgeOptions={{type:'branch'}}>
          <Background gap={22} size={1} color="#e6ebf0"/><Controls position="bottom-left" showInteractive={false}/>
          <Fit value={fitVersion}/>
        </ReactFlow>
        <div className="canvas-footer"><span>{isSuite?'在功能组里添加节点，也可双击空白处添加。':isExpression?'计算器在下方 · 连线表示业务数据 / 分支。':'连线表示业务数据 / 分支，不表示调用栈或线程数量。'}</span><span>{graph.nodes.length} 节点 · {graph.edges.length} 条边</span></div>
        {isExpression&&<ExpressionCalculator engine={expressionEngine} onShowProcess={()=>setExpressionPane('process')}/>}
        {isSuite&&<div className="suite-calculator"><div className="suite-calculator-heading"><div><div className="eyebrow">真实执行 · 查看过程</div><h2>计算器</h2></div><div className="suite-modes" role="group" aria-label="计算方式">{(['expression','sum','calculator','average'] as const).map(m=><button key={m} aria-pressed={suiteMode===m} onClick={()=>changeCalculationMode(m)}>{m==='expression'?'混合运算':m==='sum'?'多数字求和':m==='average'?'平均值':'两数运算'}</button>)}</div></div>
          <div className="suite-examples"><span>示例</span>{([{label:'1 + 2',mode:'calculator',value:'1+2'},{label:'1 + 2 + 3',mode:'sum',value:'1+2+3'},{label:'1 加到 20',mode:'sum',value:Array.from({length:20},(_,i)=>i+1).join('+')},{label:'20 个数求平均',mode:'average',value:Array.from({length:20},(_,i)=>i+1).join(', ')},{label:'括号与优先级',mode:'expression',value:'12+3×(8-4)÷2'}] as const).map(x=><button key={x.label} onClick={()=>changeCalculationMode(x.mode,x.value)}>{x.label}</button>)}</div>
          <p className="suite-mode-hint">{suiteMode==='sum'?'至少三个数字，用 + 连接；逐项累加。':suiteMode==='calculator'?'输入两个数字和一个运算符。':suiteMode==='average'?'一个或多个数字，用逗号或 + 分隔；展示数量、总和与平均值。':'支持括号及加减乘除，按优先级计算。'}</p>
          <ExpressionCalculator engine={expressionEngine} title={suiteMode==='average'?'平均值':'算式'} inputMode={suiteMode} onShowProcess={()=>setExpressionPane('process')}/>
          {suiteMode==='average'&&expressionEngine.result?.result.status==='success'&&<dl className="average-summary"><div><dt>数字数量</dt><dd>{expressionEngine.result.result.count}</dd></div><div><dt>总和</dt><dd>{expressionEngine.result.result.total}</dd></div><div><dt>平均值</dt><dd>{expressionEngine.result.result.value}</dd></div></dl>}
          {expressionEngine.steps.length>0&&<div className="suite-process"><div className="expression-process-heading"><strong>{suiteMode==='sum'?'逐项累加':'计算过程'}</strong><span>共 {expressionEngine.steps.length} 步 · 实际执行顺序</span></div><ol className="expression-steps">{expressionEngine.steps.map(step=><li key={step.index}><span className="expression-step-index">{String(step.index).padStart(2,'0')}</span><span className="expression-step-equation">{describeExpressionStep(step)}</span><strong>= {step.result}</strong></li>)}</ol></div>}
        </div>}
      </section>
      <aside className={`right-side ${isExpression?'expression-side':''} ${isSuite?'node-drawer':''} ${isSuite&&panelOpen?'is-open':''}`} aria-label="节点详情">
        {isExpression&&<div className="expression-side-switch" role="group" aria-label="右侧内容"><button type="button" aria-pressed={expressionPane==='detail'} onClick={()=>setExpressionPane('detail')}>节点详情</button><button type="button" aria-pressed={expressionPane==='process'} onClick={()=>setExpressionPane('process')}>计算过程</button></div>}
        {isExpression?<div hidden={expressionPane!=='process'}><ExpressionPreview engine={expressionEngine}/></div>:isSum?<SumPreview onRun={onFullRun}/>:isCalculator?<CalculatorPreview onRun={onFullRun}/>:null}
        <section className="inspector" hidden={(isExpression&&expressionPane!=='detail')||(isSuite&&!panelOpen)}>
          <div className="panel-heading"><div><div className="eyebrow">节点检查器</div><h2>{selected?.title??'选择节点'}</h2></div><div className="degree">入 {degree.in} / 出 {degree.out}</div>{isSuite&&<button type="button" className="drawer-close" aria-label="关闭节点详情" onClick={()=>setPanelOpen(false)}>×</button>}</div>
          {selected&&<>
            {selectedPath.length>1&&<nav className="node-path" aria-label="功能层级">{selectedPath.map((part,index)=><span key={part.id}>{index>0&&<span className="path-separator" aria-hidden="true">›</span>}{index===selectedPath.length-1?<strong aria-current="location">{part.title}</strong>:<button type="button" onClick={()=>selectNode(part.id)}>{part.title}</button>}</span>)}</nav>}
            <p className="description">{selected.description}</p>
            <div className="info-pair"><span>输入</span><b>{selected.input}</b></div><div className="info-pair"><span>输出</span><b>{selected.output}</b></div>
            <div className="tabs">{(['property','document','requirement','test','trace','code'] as const).map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t==='property'?'节点属性':t==='document'?'文档与任务':t==='requirement'?'需求关联':t==='test'?'运行与测试':t==='trace'?'日志':'实现映射'}</button>)}</div>
            {tab==='property'&&<NodeProperties key={selected.id} node={selected} nodes={graph.nodes} capabilities={capabilities} onPatch={update} onSave={()=>void saveGraph()} saving={graphBusy} canSave={!draftReadError&&graphDirty&&!graphConflict&&graphCompatible&&!!graphBase&&!!selected.title.trim()} onRemove={selected.id===rootId?undefined:remove}/>}
            {tab==='document'&&<div className="inspector-body"><p className="micro">{graphDirty?'文档包含尚未保存的浏览器草稿。':'文档由当前节点及关联需求生成。'}</p><div className="document-actions"><button className="primary-button" onClick={()=>exportNodeDocument()}>导出节点说明</button><button className="primary-button secondary" onClick={()=>exportNodeDocument(true)}>导出 Codex 开发任务</button></div><pre className="node-document">{nodeDocument}</pre></div>}
            {tab==='requirement'&&<>
              {compatible&&!traceLoading&&!traceError&&<div className="requirement-picker">
                {selectedRequirements.length>0&&<div className="field"><label htmlFor="node-requirement">关联需求 · {selectedRequirements.length} 条</label><select id="node-requirement" value={creatingRequirement?'':selectedRequirement?.id??''} onChange={event=>{setActiveRequirementId(event.target.value);setCreatingRequirement(false)}}>{creatingRequirement&&<option value="">正在创建新需求</option>}{selectedRequirements.map(requirement=><option key={requirement.id} value={requirement.id}>{requirement.id} · {requirement.title}</option>)}</select></div>}
                <details><summary>关联已有需求或新增需求</summary><div className="requirement-link-row"><select aria-label="选择已有需求" value={linkRequirementId} onChange={event=>setLinkRequirementId(event.target.value)}><option value="">选择已有需求</option>{traceability?.requirements.filter(requirement=>!(requirement.nodeIds??[requirement.nodeId]).includes(selectedId)).map(requirement=><option key={requirement.id} value={requirement.id}>{requirement.id} · {requirement.title}</option>)}</select><button className="link-button" disabled={!linkRequirementId||linkBusy||!projectGraph?.nodes.some(node=>node.id===selectedId)} onClick={()=>void linkRequirement()}>关联</button></div><button className="link-button" onClick={()=>setCreatingRequirement(true)}>＋ 创建新需求</button>{!projectGraph?.nodes.some(node=>node.id===selectedId)&&<p className="micro">先将新节点保存到项目，再关联需求。</p>}</details>
                {linkError&&<div className="notice notice-error" role="alert">{linkError}</div>}
              </div>}
              <RequirementPanel key={`${selected.id}:${creatingRequirement?'new':selectedRequirement?.id??'new'}:${selectedRequirement?.revision??0}`} node={selected} compatible={compatible} requirement={creatingRequirement?undefined:selectedRequirement} draft={!creatingRequirement&&selectedRequirement?requirementDrafts[selectedRequirement.id]:undefined} traceability={traceability} loading={traceLoading} error={traceError} onRefresh={refreshTraceability} onSave={saveRequirement} onCreate={async(...args)=>{await createRequirement(...args);setActiveRequirementId(args[1]);setCreatingRequirement(false)}} onDraftChange={changeDraft} onDiscard={discardDraft}/>
            </>}
            {tab==='test'&&<div className="inspector-body">
              <CapabilityPanel key={selectedCapability?.id??selected.id} capability={selectedCapability} onOpen={openCapability}/>
              <div className="property-section-title">节点试运行</div>
              <div className="field"><label>试运行输入 JSON</label><textarea className="json-area" rows={5} spellCheck={false} value={fixture} onChange={e=>setFixture(e.target.value)}/></div>
              <button className="link-button" onClick={()=>{try{const fixtureObj=JSON.parse(fixture);if(!fixtureObj||typeof fixtureObj!=='object'||Array.isArray(fixtureObj))throw Error('Fixture 必须是对象');update({fixture:fixtureObj});setError('')}catch(e){setError(String(e))}}}>将输入保存为节点 Fixture</button>
              <div className="mode-line"><label><input type="radio" checked={mode==='mock'} onChange={()=>setMode('mock')}/> Mock</label><label><input type="radio" checked={mode==='dry-run'} onChange={()=>setMode('dry-run')}/> Dry-run</label><label><input type="radio" checked={mode==='sandbox'} onChange={()=>setMode('sandbox')}/> Sandbox</label></div>
              <div className="row-actions"><button className="primary-button" onClick={()=>void runSelected()} disabled={busy||!selectedCapability}>{busy?'运行中…':selectedCapability?'试运行节点':'待实现 · 暂不可运行'}</button></div>
              {error&&<div className="notice notice-error">{error}</div>}
              {nodeResult&&<div className="result"><span className="result-head">运行结果 {nodeResult.simulated?'（仅 Mock）':''}{selected.id==='validate'?` · ${selectedLanguage}`:''}</span><pre>{JSON.stringify(nodeResult.output??nodeResult.result??nodeResult,null,2)}</pre></div>}
            </div>}
            {tab==='trace'&&<div className="inspector-body"><div className="micro">执行记录区分真实运行、汇总与 Mock；Mock 只展示模拟结果。</div>{trace.length?trace.map((s,i)=><div className={`trace-step ${s.nodeId===selectedId?'highlight':''}`} key={i}><div className="trace-line"><b>{s.nodeId}</b><span>{s.status} · {s.derived?'根据实际运行汇总':`${s.elapsedMs}ms`} {s.adapter?`· ${s.adapter}`:''}</span></div>{!s.derived&&<details><summary>查看输入输出</summary><pre>{JSON.stringify({input:s.input,output:s.output},null,2)}</pre></details>}</div>):<div className="empty">提交表单或测试单个节点后查看。</div>}</div>}
            {tab==='code'&&<div className="inspector-body"><div className="property-section-title">实际能力与函数</div>{selectedCapability?<><div className="code-ref">{selectedCapability.id} · {selectedCapability.runPath}</div>{selectedCapability.implementation.map(reference=><div className="code-ref" key={`${reference.path}:${reference.symbol}`}><strong>{reference.symbol}</strong><br/>{reference.path}</div>)}<div className="code-ref">前端：{selectedCapability.frontend?`${selectedCapability.frontend.component} / ${selectedCapability.frontend.mode??'默认'}`:'待接入'}</div></>:<div className="capability-pending">此节点尚未绑定实际能力。</div>}<div className="property-section-title">节点定位</div><div className="code-ref">{selected.code||'尚未绑定实现位置'}</div><div className="code-ref">{selected.test||'尚未绑定测试位置'}</div>{source?<pre className="source">{source.excerpt}</pre>:<div className="empty">在需求关联中查看当前索引的代码与测试位置。</div>}</div>}
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
    if(requested==='suite'||requested==='expression'||requested==='sum'||requested==='calculator'||requested==='feedback')return requested;
    const previous=sessionStorage.getItem(exampleKey);
    return previous==='feedback'?'feedback':'suite';
  });
  const changeExample=(next:Example)=>{
    sessionStorage.setItem(exampleKey,next);
    const url=new URL(window.location.href);
    if(url.searchParams.has('example')){url.searchParams.set('example',next);window.history.replaceState(null,'',url)}
    setExample(next);
  };
  return <ReactFlowProvider key={example}><Studio example={example} onExampleChange={changeExample}/></ReactFlowProvider>;
}
