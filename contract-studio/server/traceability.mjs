import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const features = Object.freeze({
  'feedback.submit': Object.freeze({ requirementFile: 'contracts/requirements.json', graphFile: 'contracts/feedback.json', rstFile: 'traceability/requirements.rst' }),
  'calculator.calculate': Object.freeze({ requirementFile: 'contracts/calculator.requirements.json', graphFile: 'contracts/calculator.json', rstFile: 'traceability/calculator.rst' }),
  'sum.calculate': Object.freeze({ requirementFile: 'contracts/sum.requirements.json', graphFile: 'contracts/sum.json', rstFile: 'traceability/sum.rst' }),
});
function featureConfig(featureId = 'feedback.submit') {
  // The original entry point uses the existing feedback files regardless of
  // their feature ID. Only explicitly registered feature IDs select new files.
  return features[featureId === 'calculator.calculate' || featureId === 'sum.calculate' ? featureId : 'feedback.submit'];
}
const allowedSourceExtensions = new Set(['.mjs', '.js', '.ts', '.tsx', '.cpp', '.py', '.go', '.java', '.php', '.cs', '.rs']);

export class TraceError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

async function loadRequirements(root, feature = featureConfig()) {
  const { requirementFile } = feature;
  const data = JSON.parse(await fs.readFile(path.join(root, requirementFile), 'utf8'));
  if (data.version !== 1 || !Array.isArray(data.requirements)) throw new Error('Invalid requirements data');
  // An out-of-band edit to confirmed content must not inherit the old approval.
  for (const item of data.requirements) {
    if (item.status === 'confirmed' && (item.confirmedText?.title !== item.title || item.confirmedText?.description !== item.description)) {
      item.status = 'draft';
      item.revision += 1;
      delete item.confirmedAt;
      delete item.confirmedText;
    }
  }
  return data;
}

function validateGraph(graph, featureId) {
  if (!graph || typeof graph !== 'object' || graph.version !== 2 || graph.feature?.id !== featureId || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw new TraceError('功能图格式或 featureId 不匹配');
  if (typeof graph.feature.title !== 'string' || typeof graph.feature.goal !== 'string') throw new TraceError('功能图缺少标题或目标');
  const ids = new Set();
  for (const node of graph.nodes) {
    if (typeof node.id !== 'string' || !node.id || ids.has(node.id) || typeof node.title !== 'string' || !node.title.trim() || !node.position || !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) throw new TraceError('功能图节点 ID、标题或位置无效');
    ids.add(node.id);
  }
  for (const node of graph.nodes) {
    if (node.parentId && !ids.has(node.parentId)) throw new TraceError(`功能图包含未找到的父节点: ${node.parentId}`);
    const parents = new Set([node.id]);
    let parent = node.parentId;
    while (parent) {
      if (parents.has(parent)) throw new TraceError(`功能图父子关系存在循环: ${node.id}`);
      parents.add(parent);
      parent = graph.nodes.find(n => n.id === parent)?.parentId;
    }
  }
  const edgeIds = new Set();
  for (const edge of graph.edges) {
    if (typeof edge.id !== 'string' || !edge.id || edgeIds.has(edge.id) || !ids.has(edge.source) || !ids.has(edge.target)) throw new TraceError(`功能图边 ID 或端点无效: ${edge.id}`);
    edgeIds.add(edge.id);
  }
  return graph;
}

async function loadGraph(root, featureId, feature = featureConfig(featureId)) {
  const { graphFile } = feature;
  return validateGraph(JSON.parse(await fs.readFile(path.join(root, graphFile), 'utf8')), featureId);
}

// Saving is a new operation: enforce the existing contract checker without
// imposing these additional requirements on reads of legacy graphs.
function validateGraphForSave(graph, featureId) {
  validateGraph(graph, featureId);
  for (const node of graph.nodes) {
    if (!node.input || !node.output) throw new TraceError(`功能节点缺少输入或输出: ${node.id}`);
  }
  for (const edge of graph.edges) {
    if (!['ok', 'fail'].includes(edge.sourceHandle)) throw new TraceError(`功能图边输出端口无效: ${edge.id}`);
  }
  return graph;
}

function rstText(data, graph, feature = featureConfig()) {
  const { requirementFile, graphFile } = feature;
  const esc = (s) => s.replaceAll('\\', '\\\\').replaceAll('*', '\\*').replaceAll('`', '\\`').replaceAll('|', '\\|').replaceAll('_', '\\_');
  // Hex-encoded UTF-8 is reversible and collision-free, including case and punctuation.
  const functionId = (nodeId) => `FUNC_${Buffer.from(nodeId, 'utf8').toString('hex').toUpperCase()}`;
  const lines = ['需求与功能图', '============', '', `.. 由 ${requirementFile} 和 ${graphFile} 生成；请修改源文件或使用工作台，不要直接编辑。`, '', '需求条目', '--------', ''];
  for (const r of data.requirements) {
    lines.push(`.. req:: ${esc(r.title)}`, `   :id: ${r.id}`, `   :status: ${r.status}`, '', ...r.description.split('\n').map(line => `   ${esc(line)}`), '');
  }
  lines.push('项目功能图', '----------', '', `仅包含 ${graphFile} 已持久的图；浏览器画布草稿不会自动写入此文件。`, '', '.. 持久图完整快照，仅用于过期检测；来源仍以 JSON 文件为准。', `   ${JSON.stringify(graph)}`, '');
  for (const node of graph.nodes) {
    const children = graph.nodes.filter(n => n.parentId === node.id).map(n => functionId(n.id));
    const outgoing = graph.edges.filter(e => e.source === node.id);
    const destinations = [...new Set(outgoing.map(e => functionId(e.target)))];
    const requirements = data.requirements.filter(r => r.nodeId === node.id).map(r => r.id);
    lines.push(`.. spec:: ${esc(node.title)}`, `   :id: ${functionId(node.id)}`);
    if (requirements.length) lines.push(`   :fulfills: ${requirements.join(', ')}`);
    if (children.length) lines.push(`   :contains: ${children.join(', ')}`);
    if (destinations.length) lines.push(`   :flows_to: ${destinations.join(', ')}`);
    lines.push('', '   功能节点原始字段::', '', `      ${JSON.stringify(node)}`, '');
    if (outgoing.length) {
      lines.push('   原始业务出边（含端口、分支标签和其他字段）::', '');
      for (const edge of outgoing) lines.push(`      ${JSON.stringify(edge)}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

export async function exportNeeds(root = projectRoot, featureId = 'feedback.submit') {
  const feature = featureConfig(featureId);
  const data = await loadRequirements(root, feature);
  const graph = await loadGraph(root, data.featureId, feature);
  await fs.mkdir(path.join(root, 'traceability'), { recursive: true });
  await fs.writeFile(path.join(root, feature.rstFile), rstText(data, graph, feature), 'utf8');
}

async function markerReferences(root) {
  const refs = new Map();
  async function scan(dir, prefix) {
    for (const item of await fs.readdir(dir, { withFileTypes: true })) {
      const rel = `${prefix}/${item.name}`;
      const absolute = path.join(dir, item.name);
      if (item.isDirectory()) { if (item.name !== '_build') await scan(absolute, rel); continue; }
      if (!item.isFile() || !allowedSourceExtensions.has(path.extname(item.name))) continue;
      const lines = (await fs.readFile(absolute, 'utf8')).split(/\r?\n/);
      lines.forEach((line, i) => {
        const match = line.match(/^\s*(?:\/\/|#)\s*@need-ids:\s*([A-Za-z0-9_,\s-]+)$/);
        if (!match) return;
        for (const id of match[1].split(',').map(s => s.trim()).filter(Boolean)) {
          if (!refs.has(id)) refs.set(id, []);
          refs.get(id).push({ path: rel, line: i + 1 });
        }
      });
    }
  }
  for (const dir of ['src', 'server', 'tests']) await scan(path.join(root, dir), dir);
  return refs;
}

export async function traceability(root = projectRoot, featureId) {
  const feature = featureConfig(featureId);
  const data = await loadRequirements(root, feature);
  if (featureId !== undefined && data.featureId !== featureId) throw new TraceError('需求文件的功能 ID 不匹配');
  const graph = await loadGraph(root, data.featureId, feature);
  const refs = await markerReferences(root);
  let sphinxState = 'missing';
  try { sphinxState = (await fs.readFile(path.join(root, feature.rstFile), 'utf8')) === rstText(data, graph, feature) ? 'current' : 'outdated'; }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  return { featureId: data.featureId, source: feature.requirementFile, projectGraph: graph, sphinx: { path: feature.rstFile, state: sphinxState },
    requirements: data.requirements.map(r => ({ ...r,
      code: (refs.get(r.id) ?? []).filter(ref => !ref.path.startsWith('tests/')),
      tests: (refs.get(r.id) ?? []).filter(ref => ref.path.startsWith('tests/')) })) };
}

let saveQueue = Promise.resolve();
function serialized(fn) {
  const task = saveQueue.then(fn);
  saveQueue = task.catch(() => {});
  return task;
}

export function updateRequirement(body, root = projectRoot) {
  return serialized(async () => {
    if (!body || !['save', 'confirm', 'create'].includes(body.action) || typeof body.id !== 'string') throw new TraceError('Invalid update request');
    if (body.action !== 'create' && !Number.isInteger(body.revision)) throw new TraceError('Invalid revision');
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200 || /[\r\n]/.test(body.title)) throw new TraceError('需求标题须为 1–200 字且不能换行');
    if (typeof body.description !== 'string' || !body.description.trim() || body.description.length > 5000) throw new TraceError('需求描述须为 1–5000 字');
    const feature = featureConfig(body.featureId);
    const data = await loadRequirements(root, feature);
    const featureId = body.featureId ?? data.featureId;
    if (data.featureId !== featureId) throw new TraceError('需求文件的功能 ID 不匹配');
    if (body.featureId && body.featureId !== data.featureId) throw new TraceError('当前功能图不匹配需求来源', 409);
    if (body.action === 'create') {
      if (body.featureId !== data.featureId || !/^REQ_[A-Z0-9_]+$/.test(body.id) || body.id.length > 100 || typeof body.nodeId !== 'string' || !/^[A-Za-z0-9_.-]{1,120}$/.test(body.nodeId)) throw new TraceError('需求 ID 或功能节点 ID 不合法');
      if (data.requirements.some(r => r.id === body.id || r.nodeId === body.nodeId)) throw new TraceError('需求 ID 或功能节点已存在', 409);
      data.requirements.push({id: body.id, nodeId: body.nodeId, title: body.title.trim(), description: body.description.trim().replaceAll('\r\n', '\n'), status: 'draft', revision: 1});
      await persist(root, data, feature);
      return traceability(root, featureId);
    }
    const item = data.requirements.find(r => r.id === body.id);
    if (!item) throw new TraceError('Requirement not found', 404);
    if (item.revision !== body.revision) throw new TraceError('需求已被其他操作修改，请刷新后重试', 409);
    const title = body.title.trim();
    const description = body.description.trim().replaceAll('\r\n', '\n');
    const changed = item.title !== title || item.description !== description;
    if (changed || (body.action === 'confirm' && item.status !== 'confirmed')) {
      item.title = title;
      item.description = description;
      item.status = body.action === 'confirm' ? 'confirmed' : 'draft';
      item.revision += 1;
      if (item.status === 'confirmed') {
        item.confirmedAt = new Date().toISOString();
        item.confirmedText = { title, description };
      } else {
        delete item.confirmedAt;
        delete item.confirmedText;
      }
      await persist(root, data, feature);
    } else {
      // Re-sync a missing or externally edited derived view on an explicit save.
      await persist(root, data, feature);
    }
    return traceability(root, featureId);
  });
}

export function updateGraph(body, root = projectRoot) {
  return serialized(async () => {
    if (!body || !body.featureId || !body.expectedGraph || !body.graph) throw new TraceError('缺少功能图或基线');
    const feature = featureConfig(body.featureId);
    const data = await loadRequirements(root, feature);
    if (body.featureId !== data.featureId) throw new TraceError('功能图不匹配');
    const current = await loadGraph(root, data.featureId, feature);
    if (!isDeepStrictEqual(current, body.expectedGraph)) throw new TraceError('项目图已被其他操作修改，请先处理冲突', 409);
    const graph = validateGraphForSave(body.graph, data.featureId);
    const target = path.join(root, feature.graphFile);
    const temp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(graph, null, 2) + '\n', 'utf8');
    await fs.rename(temp, target);
    await exportNeeds(root, data.featureId);
    return traceability(root, data.featureId);
  });
}

async function persist(root, data, feature) {
  const target = path.join(root, feature.requirementFile);
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await fs.rename(temp, target);
  await exportNeeds(root, data.featureId);
}

export async function sourceAt(referencePath, line, root = projectRoot) {
  if (typeof referencePath !== 'string' || !Number.isInteger(line) || line < 1) throw new TraceError('Invalid source reference');
  const refs = await markerReferences(root);
  const found = [...refs.values()].flat().some(ref => ref.path === referencePath && ref.line === line);
  if (!found) throw new TraceError('Source reference not found', 404);
  const lines = (await fs.readFile(path.join(root, referencePath), 'utf8')).split(/\r?\n/);
  const startLine = Math.max(1, line - 3);
  return { path: referencePath, startLine, excerpt: lines.slice(startLine - 1, Math.min(lines.length, line + 18)).join('\n') };
}

export function isLocalRequest(req) {
  const remote = req.socket?.remoteAddress;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) return false;
  try {
    const host = new URL(`http://${req.headers.host}`);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host.hostname)) return false;
    const origin = req.headers.origin;
    if (origin && origin !== host.origin) return false;
    return true;
  } catch { return false; }
}

export function isLocalWrite(req) {
  return isLocalRequest(req) && (req.headers['content-type'] ?? '').split(';')[0].trim() === 'application/json';
}
