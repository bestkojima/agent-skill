import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react';
import { buildFunctionTree } from './function-tree.ts';
import type { Spec } from './workbench-types';

const treeIndent=(depth:number):CSSProperties=>({'--tree-depth':Math.min(depth,3)} as CSSProperties);

function revealInDrawer(item:HTMLLIElement|undefined,panel:HTMLElement|null){
  const row=item?.firstElementChild?.getBoundingClientRect();
  if(!row||!panel)return;
  const bounds=panel.getBoundingClientRect();
  const top=bounds.top+(panel.firstElementChild?.getBoundingClientRect().height??0)+6;
  const bottom=bounds.bottom-6;
  if(row.top<top||row.height>bottom-top)panel.scrollTop+=row.top-top;
  else if(row.bottom>bottom)panel.scrollTop+=row.bottom-bottom;
}

function visibleNodes(tree:ReturnType<typeof buildFunctionTree>,branches:ReadonlyMap<string,boolean>){
  const ids:string[]=[];
  const visit=(nodes:Spec[],atRoot:boolean)=>{
    for(const {id} of nodes){
      ids.push(id);
      const children=tree.children.get(id);
      if(children&&(branches.get(id)??atRoot))visit(children,false);
    }
  };
  visit(tree.roots,true);
  return ids;
}

export function FunctionTree({nodes,selectedId,reveal,open,drawer,onSelect}:{
  nodes:Spec[];selectedId:string;reveal:number;open:boolean;drawer:RefObject<HTMLElement>;
  onSelect:(id:string,item:HTMLElement)=>void;
}){
  const tree=useMemo(()=>buildFunctionTree(nodes),[nodes]);
  const [branches,setBranches]=useState(new Map<string,boolean>());
  const [focusedId,setFocusedId]=useState<string|null>(null);
  const items=useRef(new Map<string,HTMLLIElement>());
  const visible=useMemo(()=>visibleNodes(tree,branches),[tree,branches]);
  const tabStop=focusedId&&visible.includes(focusedId)?focusedId:visible.includes(selectedId)?selectedId:visible[0];

  // A new selection from anywhere opens its ancestors, including a re-selection on the canvas.
  useLayoutEffect(()=>{
    setBranches(previous=>{
      let next=previous;
      for(let parent=tree.parents.get(selectedId);parent;parent=tree.parents.get(parent)){
        if(previous.get(parent)??!tree.parents.has(parent))continue;
        if(next===previous)next=new Map(previous);
        next.set(parent,true);
      }
      return next;
    });
  },[tree.parents,selectedId,reveal]);

  useLayoutEffect(()=>{
    if(!open)return;
    const frame=requestAnimationFrame(()=>revealInDrawer(items.current.get(selectedId),drawer.current));
    return ()=>cancelAnimationFrame(frame);
  },[drawer,open,selectedId,reveal,tree]);

  const expand=(id:string,value:boolean)=>setBranches(previous=>new Map(previous).set(id,value));
  const focusItem=(id:string|undefined)=>{
    if(id)items.current.get(id)?.focus({preventScroll:true});
  };
  const select=(id:string)=>{
    const item=items.current.get(id);
    if(!item)return;
    focusItem(id);
    onSelect(id,item);
  };
  const handleKey=(event:KeyboardEvent<HTMLLIElement>,id:string,expanded:boolean,firstChild?:string)=>{
    if(event.target!==event.currentTarget||event.altKey||event.ctrlKey||event.metaKey||event.nativeEvent.isComposing)return;
    switch(event.key){
      case 'ArrowUp': focusItem(visible[visible.indexOf(id)-1]);break;
      case 'ArrowDown': focusItem(visible[visible.indexOf(id)+1]);break;
      case 'Home': focusItem(visible[0]);break;
      case 'End': focusItem(visible.at(-1));break;
      case 'ArrowRight':
        if(firstChild){if(expanded)focusItem(firstChild);else expand(id,true)}
        break;
      case 'ArrowLeft':
        if(firstChild&&expanded)expand(id,false);
        else focusItem(tree.parents.get(id));
        break;
      case 'Enter':case ' ':
        if(!event.repeat)select(id);
        break;
      default:return;
    }
    event.preventDefault();
  };

  const renderBranch=(node:Spec,depth:number)=>{
    const children=tree.children.get(node.id);
    const expanded=branches.get(node.id)??(depth===0);
    return <li key={node.id} className="function-tree-item" role="treeitem" aria-label={node.title}
      aria-selected={node.id===selectedId} aria-expanded={children?expanded:undefined} tabIndex={node.id===tabStop?0:-1}
      ref={item=>{if(item)items.current.set(node.id,item);else items.current.delete(node.id)}}
      onFocus={event=>{if(event.target===event.currentTarget){setFocusedId(node.id);revealInDrawer(event.currentTarget,drawer.current)}}}
      onKeyDown={event=>handleKey(event,node.id,expanded,children?.[0]?.id)}>
      <div className="function-tree-row" data-branch={!!children} style={treeIndent(depth)} onClick={()=>select(node.id)}>
        {children?<span className="function-tree-toggle" aria-hidden="true" onClick={event=>{event.stopPropagation();focusItem(node.id);expand(node.id,!expanded)}}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg>
        </span>:<span className="function-tree-spacer" aria-hidden="true"/>}
        <span className="function-tree-label">{node.title}</span>
      </div>
      {children&&expanded&&<ul role="group" className="function-tree-branch" style={treeIndent(depth)}>{children.map(child=>renderBranch(child,depth+1))}</ul>}
    </li>;
  };

  return <>
    {tree.issues.length>0&&<details className="function-tree-issues"><summary>{tree.issues.length} 条归属异常</summary><ul>{tree.issues.map(issue=><li key={issue}>{issue}</li>)}</ul></details>}
    {tree.roots.length?<ul role="tree" aria-label="功能节点" className="function-tree"
      onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocusedId(null)}}>{tree.roots.map(node=>renderBranch(node,0))}</ul>:<p className="function-tree-empty">当前没有功能节点。</p>}
  </>;
}
