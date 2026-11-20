import { useState } from 'react';
import { api } from './api';

export type TraceRef={path:string;line:number;source?:'sphinx-codelinks'|'local-marker'};
type SourcePreview={path:string;startLine:number;excerpt:string};
type SourceEditor='vscode'|'notepad';
type OpenSourceResult={opened:boolean;editor:SourceEditor;lineJumped:boolean;message:string};
const sourceEditorKey='contract-studio-source-editor-v1';

export function TraceReference({reference,editor,onEditorChange,label}:{reference:TraceRef;editor:SourceEditor;onEditorChange:(editor:SourceEditor)=>void;label?:string}){
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
      <span>{label?<><strong>{label}</strong><small className="trace-path">{reference.path}</small></>:reference.path}{reference.source==='local-marker'&&<small className="reference-origin">本地标记</small>}</span><b>第 {reference.line} 行 <span className="trace-chevron" aria-hidden="true">⌄</span></b>
    </button>
    <div className="trace-expand" aria-hidden={!expanded}><div className="trace-expand-inner"><div className="trace-preview-panel">
      <div className="trace-preview-toolbar">
        <label>编辑器<select aria-label={`选择 ${reference.path} 的编辑器`} value={editor} onChange={e=>{onEditorChange(e.target.value as SourceEditor);setOpenError('');setOpenMessage('')}}><option value="vscode">VS Code</option><option value="notepad">记事本</option></select></label>
        <button type="button" className="trace-open" disabled={opening} aria-label={opening?'正在打开源码':`打开 ${reference.path} 第 ${reference.line} 行`} onClick={()=>void openInEditor()}>{opening?'打开中…':'打开 ↗'}</button>
      </div>
      {editor==='notepad'&&<p className="trace-editor-hint">打开后，按 Ctrl+G 跳到第 {reference.line} 行。</p>}
      {openError&&<div className="notice notice-error" role="alert">{openError}</div>}
      {openMessage&&<div className="trace-open-message" role="status">{openMessage}</div>}
      {loading?<div className="trace-preview-status" role="status">正在读取代码…</div>:previewError?<div className="notice notice-error" role="alert">无法读取代码：{previewError} <button className="link-button" onClick={()=>void loadPreview()}>重试</button></div>:preview&&<div className="trace-code" aria-label={`${preview.path} 代码预览`}><pre className="trace-code-lines">{preview.excerpt.split('\n').map((line,i)=>{const number=preview.startLine+i;return <span className={`trace-code-line ${number===reference.line?'is-target':''}`} key={number}><span className="trace-line-number" aria-hidden="true">{number}</span><span>{line||' '}</span></span>})}</pre></div>}
    </div></div></div>
  </div>;
}

export function useSourceEditor() {
  const [editor,setEditor]=useState<SourceEditor>(()=>{try{return localStorage.getItem(sourceEditorKey)==='notepad'?'notepad':'vscode'}catch{return 'vscode'}});
  const changeEditor=(next:SourceEditor)=>{setEditor(next);try{localStorage.setItem(sourceEditorKey,next)}catch{/* The current selection still works in this view. */}};
  return [editor,changeEditor] as const;
}
