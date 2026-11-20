import type {Graph, Link, Spec} from './workbench-types';

export function resolveTestChain(graph:Pick<Graph,'nodes'|'edges'>, ids:readonly string[]):
  {nodes:Spec[];edges:Link[];error?:never}|{error:string} {
  const selected=new Set(ids);
  const nodes=new Map(graph.nodes.filter(node=>selected.has(node.id)).map(node=>[node.id,node]));
  const edges=graph.edges.filter(edge=>selected.has(edge.source)&&selected.has(edge.target));
  const next=new Map(edges.map(edge=>[edge.source,edge]));
  const prev=new Set(edges.map(edge=>edge.target));
  const start=ids.filter(id=>!prev.has(id));
  if(nodes.size!==selected.size||nodes.size<2||edges.length!==nodes.size-1
    ||next.size!==edges.length||prev.size!==edges.length||start.length!==1){
    return {error:'请选择一条连续的有向链路，不要同时选中两条分支。'};
  }
  const ordered:Spec[]=[];
  const orderedEdges:Link[]=[];
  for(let id:string|undefined=start[0];id&&ordered.length<nodes.size;){
    ordered.push(nodes.get(id)!);
    const edge=next.get(id);
    if(edge)orderedEdges.push(edge);
    id=edge?.target;
  }
  if(ordered.length!==nodes.size)return {error:'请选择一条连续链路，链路不能成环。'};
  const output=ordered.at(-1)!.output?.trim();
  if(!output||/^(待填写|未填写|无|无输出|none|void|n\/a)$/i.test(output)){
    return {error:'链路末端没有定义输出，先补上末端节点的输出。'};
  }
  return {nodes:ordered,edges:orderedEdges};
}
