import type { Link, Spec } from './workbench-types';
import { importanceLabel, nodeImportance } from './node-importance.ts';

type ContextNode = Pick<Spec,'id'|'parentId'|'title'|'description'|'input'|'output'|'inputSchema'|'outputSchema'|'importance'> & {kind:string};

// A bounded view of the current graph, shared by the node document and Codex task.
export function describeNodeContext(graph:{nodes:ContextNode[];edges:Link[]}, nodeId:string) {
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const selected = nodes.get(nodeId);
  if (!selected) throw Error(`未找到节点：${nodeId}`);

  const identify = (id:string) => `${id} · ${nodes.get(id)?.title ?? '缺失节点'}`;
  const interfaceLines = (node:ContextNode) => [
    `输入：${node.input || '待填写'}`,
    ...(node.inputSchema ? ['输入结构：', '```json', JSON.stringify(node.inputSchema, null, 2), '```'] : []),
    `输出：${node.output || '待填写'}`,
    ...(node.outputSchema ? ['输出结构：', '```json', JSON.stringify(node.outputSchema, null, 2), '```'] : []),
    `重要性：${importanceLabel(node.importance)} (${nodeImportance(node.importance)})`
  ];
  const edgeLines = (edge:Link) => [
    `连线：${edge.id}`,
    `路径：${identify(edge.source)} [${edge.sourceHandle ?? 'ok'}] → ${identify(edge.target)} [${edge.targetHandle ?? 'in'}]`,
    `条件 / 标签：${edge.label || '未注明'}`
  ];
  const dependency = (edge:Link, neighborId:string) => {
    const neighbor = nodes.get(neighborId);
    return [
      `#### ${identify(neighborId)}`,
      ...edgeLines(edge),
      ...(neighbor ? [`职责：${neighbor.description || '待填写'}`, ...interfaceLines(neighbor)] : [])
    ].join('\n');
  };
  const incoming = graph.edges.filter(edge => edge.target === nodeId);
  const outgoing = graph.edges.filter(edge => edge.source === nodeId);
  const sections = [
    `## 节点重要性\n${importanceLabel(selected.importance)} (${nodeImportance(selected.importance)})`,
    '## 图上依赖',
    `### 直接输入依赖\n${incoming.length ? incoming.map(edge => dependency(edge, edge.source)).join('\n\n') : '无直接输入连线。'}`,
    `### 直接输出依赖\n${outgoing.length ? outgoing.map(edge => dependency(edge, edge.target)).join('\n\n') : '无直接输出连线。'}`
  ];

  const children = graph.nodes.filter(node => node.parentId === nodeId);
  if (selected.kind === 'group' || children.length) {
    sections.push(`## 直接子节点契约\n${children.length ? children.map(node => [
      `### ${identify(node.id)}`,
      `职责：${node.description || '待填写'}`,
      ...interfaceLines(node)
    ].join('\n')).join('\n\n') : '尚无直接子节点。'}`);
    const childIds = new Set(children.map(node => node.id));
    const internalEdges = graph.edges.filter(edge => childIds.has(edge.source) && childIds.has(edge.target));
    if (internalEdges.length) sections.push(`### 子节点之间的关系\n${internalEdges.map(edge => edgeLines(edge).join('\n')).join('\n\n')}`);
  }
  return sections.join('\n\n');
}
