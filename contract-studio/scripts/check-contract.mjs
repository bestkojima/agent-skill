import fs from 'node:fs';
import assert from 'node:assert/strict';
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
