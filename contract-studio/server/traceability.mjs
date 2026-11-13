import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { readNeedsIndex, buildNeedsIndex, indexConfigured } from './needs-index.mjs';
import { nodeImportance } from '../src/node-importance.mjs';
import { featureRegistry } from './feature-registry.mjs';
import { backendRelations, backendNeedsText, nodeNeedId, acceptancePartId } from './backend-relations.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function featureConfig(featureId) {
  // Legacy direct callers may use their own feature ID in the original file pair.
  // Public API callers resolve registered IDs before entering this compatibility path.
  return featureRegistry.resolveFeature(featureId)??featureRegistry.defaultTrace;
}
const nodeIdsOf = requirement => requirement.nodeIds ?? [requirement.nodeId].filter(Boolean);
const acceptanceOf = requirement => requirement.acceptance ?? [];

function validateNodeIds(value) {
  if(!Array.isArray(value)||!value.length||value.some(id=>typeof id!=='string'||!/^[A-Za-z0-9_.-]{1,120}$/.test(id)))throw new TraceError('功能节点 ID 不合法');
  return [...new Set(value)];
}
function validateAcceptance(value) {
  if(!Array.isArray(value)||value.length>100)throw new TraceError('验收条件必须是数组（最多 100 项）');
  const ids=new Set();
  return value.map(item=>{
    if(!item||typeof item.id!=='string'||!/^[A-Za-z0-9_.-]{1,120}$/.test(item.id)||ids.has(item.id)||typeof item.input!=='string'||typeof item.expected!=='string'||!item.expected.trim()||(item.observable!==undefined&&typeof item.observable!=='string'))throw new TraceError('验收条件需包含唯一 ID、输入和预期结果');
    ids.add(item.id);
    return {id:item.id,input:item.input,expected:item.expected,...(item.observable!==undefined?{observable:item.observable}:{})};
  });
}

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
    if (item.acceptanceStatus === 'confirmed' && !isDeepStrictEqual(item.confirmedAcceptance, acceptanceOf(item))) {
      item.acceptanceStatus = 'draft';
      item.revision += 1;
      delete item.confirmedAcceptance;
      delete item.acceptanceConfirmedAt;
    }
  }
  return data;
}

export function validateGraph(graph, featureId) {
  if (!graph || typeof graph !== 'object' || graph.version !== 2 || graph.feature?.id !== featureId || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw new TraceError('功能图格式或 featureId 不匹配');
  if (typeof graph.feature.title !== 'string' || typeof graph.feature.goal !== 'string') throw new TraceError('功能图缺少标题或目标');
  const ids = new Set();
  for (const node of graph.nodes) {
    if (typeof node.id !== 'string' || !node.id || ids.has(node.id) || typeof node.title !== 'string' || !node.title.trim() || !node.position || !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) throw new TraceError('功能图节点 ID、标题或位置无效');
    try { nodeImportance(node.importance); } catch (error) { throw new TraceError(`${node.id}: ${error.message}`); }
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
  const functionId = nodeId => nodeNeedId(nodeId,feature);
  const lines = ['需求与功能图', '============', '', `.. 由 ${requirementFile} 和 ${graphFile} 生成；请修改源文件或使用工作台，不要直接编辑。`, '', '需求条目', '--------', ''];
  for (const r of (feature.requirementSources?.length ? data.requirements.filter(r => !r.sourceFeatureId) : data.requirements)) {
    lines.push(`.. req:: ${esc(r.title)}`, `   :id: ${r.id}`, `   :status: ${r.status}`, '', ...r.description.split('\n').map(line => `   ${esc(line)}`), '');
    if (acceptanceOf(r).length) {
      lines.push('   验收条件：', '');
      for(const item of acceptanceOf(r))lines.push(`   * :need_part:\`(${acceptancePartId(item.id)}) ${esc(`输入 ${item.input}；预期 ${item.expected}${item.observable?'；观察 '+item.observable:''}`).replaceAll('\n',' ')}\``);
      lines.push('');
    }
  }
  lines.push('项目功能图', '----------', '', `仅包含 ${graphFile} 已持久的图；浏览器画布草稿不会自动写入此文件。`, '', '.. 持久图完整快照，仅用于过期检测；来源仍以 JSON 文件为准。', `   ${JSON.stringify(graph)}`, '');
  for (const node of graph.nodes) {
    const children = graph.nodes.filter(n => n.parentId === node.id).map(n => functionId(n.id));
    const outgoing = graph.edges.filter(e => e.source === node.id);
    const destinations = [...new Set(outgoing.map(e => functionId(e.target)))];
    const requirements = data.requirements.filter(r => nodeIdsOf(r).includes(node.id)).map(r => r.id);
    lines.push(`.. spec:: ${esc(node.title)}`, `   :id: ${functionId(node.id)}`);
    if (node.importance !== undefined) lines.push(`   :importance: ${node.importance}`);
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
  const data = await combinedRequirements(root, feature);
  const graph = await loadGraph(root, data.featureId, feature);
  const target = path.join(root, feature.rstFile);
  const text = rstText(data, graph, feature);
  try { if(await fs.readFile(target,'utf8')===text)return; }
  catch(error) { if(error.code!=='ENOENT')throw error; }
  await fs.mkdir(path.join(root, 'traceability'), { recursive: true });
  await fs.writeFile(target, text, 'utf8');
}

async function exportBuildSources(root, featureId) {
  const selected = featureId === undefined ? featureRegistry.features.map(feature=>feature.id)
    : [...(featureConfig(featureId).requirementSources??[]),featureId];
  for(const id of selected) {
    const feature = featureConfig(id);
    // Legacy projects/fixtures may contain just the original feedback pair.
    // Explicit rebuilding never asks them to create unrelated example files.
    let present=true;
    for(const file of [feature.requirementFile,feature.graphFile]) {
      try { if(!(await fs.stat(path.join(root,file))).isFile())present=false; }
      catch(error) { if(error.code==='ENOENT')present=false;else throw error; }
    }
    if(present)await exportNeeds(root,id);
  }
}

async function backendModels(root) {
  const models=[];
  for(const feature of featureRegistry.features) {
    try { await fs.access(path.join(root,feature.requirementFile));await fs.access(path.join(root,feature.graphFile)); }
    catch(error) { if(error.code==='ENOENT')continue;throw error; }
    const data=await combinedRequirements(root,feature);
    const graph=await loadGraph(root,data.featureId,feature);
    models.push(backendRelations(graph,data.requirements,{feature}));
  }
  return models;
}

async function exportBackendNeeds(root) {
  const text=backendNeedsText(await backendModels(root));
  const target=path.join(root,'traceability/backend.rst');
  try { if(await fs.readFile(target,'utf8')===text)return; }
  catch(error) { if(error.code!=='ENOENT')throw error; }
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,text,'utf8');
}

async function refreshIndex(root,options) {
  await exportBackendNeeds(root);
  return buildNeedsIndex(root,options);
}

// The index build is explicit for legacy consumers. Configured workbenches also
// invoke it after saves; failures are returned as index state, never a source rollback.
export async function buildTraceabilityIndex(root = projectRoot, featureId, options) {
  return serialized(async()=>{
    await exportBuildSources(root,featureId);
    await refreshIndex(root, options);
    return traceability(root, featureId);
  });
}

// Imported requirements remain in their original files; this is a live view.
async function combinedRequirements(root, feature) {
  const own = await loadRequirements(root, feature);
  const sources = await Promise.all((feature.requirementSources??[]).map(async featureId => {
    const data = await loadRequirements(root, featureConfig(featureId));
    return data.requirements.map(r => ({...r, sourceFeatureId: featureId}));
  }));
  return {...own, requirements: [...own.requirements, ...sources.flat()]};
}

export async function traceability(root = projectRoot, featureId) {
  const feature = featureConfig(featureId);
  const data = await combinedRequirements(root, feature);
  if (featureId !== undefined && data.featureId !== featureId) throw new TraceError('需求文件的功能 ID 不匹配');
  const graph = await loadGraph(root, data.featureId, feature);
  const {index, needs, refs, entities=[]} = await readNeedsIndex(root);
  let sphinxState = 'missing';
  try { sphinxState = (await fs.readFile(path.join(root, feature.rstFile), 'utf8')) === rstText(data, graph, feature) ? 'current' : 'outdated'; }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  let indexSourcesCurrent=sphinxState==='current';
  if(index.state==='current' && indexSourcesCurrent && feature.requirementSources?.length) {
    for(const sourceId of feature.requirementSources) {
      const sourceFeature=featureConfig(sourceId);
      const sourceData=await loadRequirements(root,sourceFeature);
      const sourceGraph=await loadGraph(root,sourceId,sourceFeature);
      try { if(await fs.readFile(path.join(root,sourceFeature.rstFile),'utf8')!==rstText(sourceData,sourceGraph,sourceFeature))indexSourcesCurrent=false; }
      catch(e) { if(e.code==='ENOENT')indexSourcesCurrent=false;else throw e; }
    }
  }
  if(index.state==='current'&&!indexSourcesCurrent) {
    index.state='stale';index.message='需求源与 RST 未同步，索引尚未包含当前源内容。';
  }
  const backend=backendRelations(graph,data.requirements,{feature,entities:entities.map(entity=>({...entity,indexState:index.state}))});
  const relations = Object.values(needs).filter(need => need.type === 'spec').map(need => ({id:need.id,title:need.title,importance:nodeImportance(need.importance),fulfills:need.fulfills??[],contains:need.contains??[],flowsTo:need.flows_to??[]}));
  return { featureId: data.featureId, source: feature.requirementFile, projectGraph: graph, sphinx: { path: feature.rstFile, state: sphinxState }, index, relations, backend,
    ubcode: {state:'not-connected',message:'未接入（可选）'},
    requirements: data.requirements.map(r => ({ ...r,
      ...(index.state === 'current' && needs[r.id] ? {title:needs[r.id].title,description:r.description,status:needs[r.id].status} : {}),
      nodeIds:nodeIdsOf(r), acceptance:acceptanceOf(r), acceptanceStatus:r.acceptanceStatus??'draft',
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
    const isCombined = Boolean(featureConfig(body.featureId).requirementSources?.length);
    const combined = isCombined ? await combinedRequirements(root, featureConfig(body.featureId)) : null;
    if (isCombined && body.action === 'create' && combined.requirements.some(r => r.id === body.id)) throw new TraceError('需求 ID 已存在', 409);
    const owner = isCombined && body.action !== 'create' ? combined.requirements.find(r => r.id === body.id)?.sourceFeatureId : undefined;
    const feature = featureConfig(owner ?? body.featureId);
    const data = await loadRequirements(root, feature);
    const featureId = owner ?? body.featureId ?? data.featureId;
    if (data.featureId !== featureId) throw new TraceError('需求文件的功能 ID 不匹配');
    if (body.featureId && !isCombined && body.featureId !== data.featureId) throw new TraceError('当前功能图不匹配需求来源', 409);
    const nodeIds = body.nodeIds === undefined ? undefined : validateNodeIds(body.nodeIds);
    const acceptance = body.acceptance === undefined ? undefined : validateAcceptance(body.acceptance);
    if (body.action === 'create') {
      const linked = nodeIds ?? validateNodeIds([body.nodeId]);
      if (body.featureId !== data.featureId || !/^REQ_[A-Z0-9_]+$/.test(body.id) || body.id.length > 100) throw new TraceError('需求 ID 或功能节点 ID 不合法');
      if (data.requirements.some(r => r.id === body.id)) throw new TraceError('需求 ID 已存在', 409);
      data.requirements.push({id: body.id, nodeId: linked[0], ...(nodeIds?{nodeIds}:{}), title: body.title.trim(), description: body.description.trim().replaceAll('\r\n', '\n'), status: 'draft', revision: 1,...(acceptance?{acceptance,acceptanceStatus:'draft'}:{})});
      await persist(root, data, feature);
      if (await indexConfigured(root)) await refreshIndex(root);
      return traceability(root, featureId);
    }
    const item = data.requirements.find(r => r.id === body.id);
    if (!item) throw new TraceError('Requirement not found', 404);
    if (item.revision !== body.revision) throw new TraceError('需求已被其他操作修改，请刷新后重试', 409);
    const title = body.title.trim();
    const description = body.description.trim().replaceAll('\r\n', '\n');
    const changed = item.title !== title || item.description !== description;
    const acceptanceChanged = acceptance !== undefined && !isDeepStrictEqual(acceptanceOf(item), acceptance);
    const linksChanged = nodeIds !== undefined && !isDeepStrictEqual(nodeIdsOf(item), nodeIds);
    const confirmAcceptance = body.confirmAcceptance === true;
    if (changed || linksChanged || acceptanceChanged || confirmAcceptance || (body.action === 'confirm' && item.status !== 'confirmed')) {
      item.title = title;
      item.description = description;
      if (changed || body.action === 'confirm') item.status = body.action === 'confirm' ? 'confirmed' : 'draft';
      item.revision += 1;
      if (body.action === 'confirm') {
        item.confirmedAt = new Date().toISOString();
        item.confirmedText = { title, description };
      } else if (changed) {
        delete item.confirmedAt;
        delete item.confirmedText;
      }
      if (nodeIds) { item.nodeIds=nodeIds;item.nodeId=nodeIds[0]; }
      if (acceptance !== undefined) item.acceptance=acceptance;
      if (acceptanceChanged || confirmAcceptance) {
        item.acceptanceStatus=confirmAcceptance?'confirmed':'draft';
        if(confirmAcceptance){item.confirmedAcceptance=acceptanceOf(item);item.acceptanceConfirmedAt=new Date().toISOString();}
        else {delete item.confirmedAcceptance;delete item.acceptanceConfirmedAt;}
      }
      await persist(root, data, feature);
    } else {
      // Re-sync a missing or externally edited derived view on an explicit save.
      await persist(root, data, feature);
    }
    if (isCombined && owner) await exportNeeds(root, body.featureId);
    if (await indexConfigured(root)) await refreshIndex(root);
    return traceability(root, isCombined ? body.featureId : featureId);
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
    if (await indexConfigured(root)) await refreshIndex(root);
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
  const {refs} = await readNeedsIndex(root);
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
