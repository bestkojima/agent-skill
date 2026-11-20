import type { Spec } from './workbench-types';

/** Index functional ownership without reading or changing any data-flow edges. */
export function buildFunctionTree(nodes:readonly Spec[]) {
  const byId=new Map(nodes.map(node=>[node.id,node]));
  const parents=new Map<string,string>();
  const issues=[];
  for(const node of nodes){
    if(!node.parentId)continue;
    if(!byId.has(node.parentId))issues.push(`${node.title}：找不到父节点 ${node.parentId}`);
    else parents.set(node.id,node.parentId);
  }

  // Imported or stale graphs can still be inspected. Break a bad loop only in this view.
  const checked=new Set();
  for(const {id} of nodes){
    const path=new Set();
    let current:string|undefined=id;
    while(current&&!checked.has(current)){
      if(path.has(current)){
        issues.push(`${(byId.get(current)?.title??current)}：父子关系存在循环`);
        parents.delete(current);
        break;
      }
      path.add(current);
      current=parents.get(current);
    }
    for(const id of path)checked.add(id);
  }

  const roots=[];
  const children=new Map<string,Spec[]>();
  for(const node of nodes){
    const parent=parents.get(node.id);
    if(!parent)roots.push(node);
    else {
      const siblings=children.get(parent);
      if(siblings)siblings.push(node);
      else children.set(parent,[node]);
    }
  }
  return {roots,children,parents,issues};
}
