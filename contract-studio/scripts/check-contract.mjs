import fs from 'node:fs';
import assert from 'node:assert/strict';
const g=JSON.parse(fs.readFileSync('contracts/feedback.json','utf8'));
assert.equal(g.version,2);
const ids=new Set(g.nodes.map(x=>x.id));assert.equal(ids.size,g.nodes.length);
for(const n of g.nodes){assert.ok(n.id&&n.title&&n.position&&n.input&&n.output,`Invalid node ${n.id}`);if(n.parentId)assert.ok(ids.has(n.parentId),`Unresolved parent ${n.parentId}`)}
for(const e of g.edges){assert.ok(ids.has(e.source)&&ids.has(e.target),`Invalid edge ${e.id}`);assert.ok(['ok','fail'].includes(e.sourceHandle),`Invalid output port ${e.id}`)}
assert.equal(g.nodes.filter(n=>n.parentId==='submit').length,5);
const validate=g.nodes.find(n=>n.id==='validate');
assert.equal(validate.adapter.capability,'feedback.validate');
assert.equal(validate.adapter.default,'javascript');
console.log(`Contract OK: ${g.nodes.length} nodes, ${g.edges.length} edges, 5 child steps`);
