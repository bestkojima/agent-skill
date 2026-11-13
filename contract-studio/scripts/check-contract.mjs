import fs from 'node:fs';
import assert from 'node:assert/strict';
import { listCapabilities } from '../server/capabilities.mjs';
const capabilities=new Set(listCapabilities().map(cap=>cap.id));
for(const file of fs.readdirSync('contracts').filter(name=>name.endsWith('.json'))) {
  const graph=JSON.parse(fs.readFileSync(`contracts/${file}`,'utf8'));
  if(!Array.isArray(graph.nodes))continue;
  assert.equal(graph.version,2,`${file}: unsupported graph version`);
  const nodes=new Map(graph.nodes.map(node=>[node.id,node]));
  assert.equal(nodes.size,graph.nodes.length,`${file}: duplicate node ID`);
  for(const node of graph.nodes) {
    assert.ok(node.id&&node.title&&node.position&&Number.isFinite(node.position.x)&&Number.isFinite(node.position.y),`${file}: invalid node ${node.id}`);
    if(node.capabilityId)assert.ok(capabilities.has(node.capabilityId),`${file}: unknown capability ${node.capabilityId}`);
    const visited=new Set([node.id]);let parent=node.parentId;
    while(parent){assert.ok(nodes.has(parent)&&!visited.has(parent),`${file}: invalid parent chain for ${node.id}`);visited.add(parent);parent=nodes.get(parent).parentId;}
  }
  const edges=new Set();
  for(const edge of graph.edges){assert.ok(edge.id&&!edges.has(edge.id)&&nodes.has(edge.source)&&nodes.has(edge.target),`${file}: invalid edge ${edge.id}`);edges.add(edge.id);}
  console.log(`Graph OK: ${file} (${graph.nodes.length} nodes, ${graph.edges.length} edges)`);
}
const g = JSON.parse(fs.readFileSync('contracts/feedback.json', 'utf8'));
assert.equal(g.version, 2);
assert.equal(g.feature?.id, 'feedback.submit');
assert.ok(Array.isArray(g.nodes) && Array.isArray(g.edges), 'nodes and edges must be arrays');
const ids = new Set(g.nodes.map(x => x.id));
assert.equal(ids.size, g.nodes.length, 'Duplicate node ID');
for (const n of g.nodes) {
  assert.ok(n.id && n.title && n.position && n.input && n.output, `Invalid node ${n.id}`);
  if (n.parentId) assert.ok(ids.has(n.parentId), `Unresolved parent ${n.parentId}`);
}
const edgeIds = new Set();
for (const e of g.edges) {
  assert.ok(e.id && !edgeIds.has(e.id), `Duplicate or missing edge ID ${e.id}`);
  edgeIds.add(e.id);
  assert.ok(ids.has(e.source) && ids.has(e.target), `Invalid edge ${e.id}`);
  assert.ok(['ok', 'fail'].includes(e.sourceHandle), `Invalid output port ${e.id}`);
}
// The demo executor has this fixed business path even if extra design nodes are added.
assert.ok(ids.has('submit'), 'Missing demo root');
for (const id of ['form', 'validate', 'lookup', 'save', 'view']) {
  assert.equal(g.nodes.find(n => n.id === id)?.parentId, 'submit', `Missing or reparented demo step ${id}`);
}
for (const [source, target, sourceHandle] of [
  ['form', 'validate', 'ok'], ['validate', 'lookup', 'ok'], ['validate', 'view', 'fail'],
  ['lookup', 'save', 'ok'], ['lookup', 'view', 'fail'], ['save', 'view', 'ok'],
]) assert.ok(g.edges.some(e => e.source === source && e.target === target && e.sourceHandle === sourceHandle), `Missing demo path ${source} -> ${target} (${sourceHandle})`);
const validate = g.nodes.find(n => n.id === 'validate');
assert.equal(validate.adapter.capability, 'feedback.validate');
assert.equal(validate.adapter.default, 'javascript');
console.log(`Contract OK: ${g.nodes.length} nodes, ${g.edges.length} edges; original feedback path preserved`);
