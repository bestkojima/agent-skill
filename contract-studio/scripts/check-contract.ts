import assert from 'node:assert/strict';
import { featureRegistry } from '../server/feature-registry.ts';
import { traceability } from '../server/traceability.ts';

for (const feature of featureRegistry.features) {
  const { index, projectGraph } = await traceability(undefined, feature.id);
  assert.equal(index.state, 'current', index.error ?? '先运行 npm run index:build');
  assert.ok(projectGraph.nodes.some(node => node.id === feature.rootNodeId), '缺少已登记的根节点');
  // traceability checks graph structure and edge ports when the index is current.
  console.log(`Graph OK: ${feature.id} (${projectGraph.nodes.length} nodes, ${projectGraph.edges.length} edges)`);
}
