/** Feedback Board domain: in-memory only. Every callable feature is a named export. */
const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const snapshot = (value) => JSON.parse(JSON.stringify(value));

export function createStore() {
  return { sequence: 3, items: [
    { id: 'F-1', title: '希望支持深色主题', category: 'feature', detail: '夜间阅读更舒适' },
    { id: 'F-2', title: '列表在小屏幕下拥挤', category: 'bug', detail: '手机上标题换行不美观' }
  ] };
}

export function validateFeedback(raw) {
  const input = {
    title: String(raw?.title ?? '').trim(),
    category: String(raw?.category ?? '').trim(),
    detail: String(raw?.detail ?? '').trim()
  };
  if ([...input.title].length < 3 || [...input.title].length > 60) return { status: 'invalid', code: 'INVALID_TITLE', message: '标题需为 3–60 字。' };
  if (!['feature', 'bug', 'other'].includes(input.category)) return { status: 'invalid', code: 'INVALID_CATEGORY', message: '请选择合法分类。' };
  if ([...input.detail].length > 500) return { status: 'invalid', code: 'INVALID_DETAIL', message: '内容不能超过 500 字。' };
  return { status: 'valid', input };
}

export async function findDuplicate(input, store) {
  await pause(55); // 异步等待示例：没有真正数据库或网络访问。
  const hit = store.items.find(item => item.category === input.category && item.title.toLocaleLowerCase() === input.title.toLocaleLowerCase());
  return hit ? { status: 'duplicate', existingId: hit.id, message: '发现相同标题与类别的反馈。' } : { status: 'unique' };
}

export function saveFeedback(input, store, mode = 'dry-run') {
  if (mode === 'dry-run') return { status: 'planned', wouldSave: snapshot(input), committed: false };
  if (mode !== 'sandbox') throw new Error('Real production writes are disabled');
  const item = { id: `F-${store.sequence++}`, ...input };
  store.items.unshift(item);
  return { status: 'saved', item, committed: true, storage: 'process-memory' };
}

export function toUiState(result) {
  if (result.status === 'saved') return { tone: 'success', message: `已新增 ${result.item.id}，列表已刷新。` };
  if (result.status === 'planned') return { tone: 'info', message: 'Dry-run 通过；未写入反馈列表。' };
  return { tone: 'error', message: result.message ?? result.code ?? '提交失败' };
}

export async function runSubmission(raw, { store = createStore(), mode = 'dry-run', validator = validateFeedback, validatorLabel = 'javascript' } = {}) {
  if (!['dry-run', 'sandbox'].includes(mode)) throw new Error('Unknown mode');
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const trace = [];
  async function step(nodeId, input, fn) {
    const start = performance.now();
    const output = await fn();
    trace.push({ nodeId, input: snapshot(input), output: snapshot(output),
      elapsedMs: Math.round(performance.now() - start),
      status: ['invalid', 'duplicate'].includes(output.status) ? 'rejected' : 'ok' });
    return output;
  }
  await step('form', {}, () => ({ status: 'received', draft: raw }));
  const checked = await step('validate', raw, () => validator(raw));
  trace[trace.length - 1].adapter = validatorLabel;
  if (checked.status !== 'valid') {
    const ui = await step('view', checked, () => toUiState(checked));
    return { runId, mode, status: 'rejected', result: checked, ui, trace, items: snapshot(store.items) };
  }
  const found = await step('lookup', checked.input, () => findDuplicate(checked.input, store));
  if (found.status === 'duplicate') {
    const ui = await step('view', found, () => toUiState(found));
    return { runId, mode, status: 'rejected', result: found, ui, trace, items: snapshot(store.items) };
  }
  const saved = await step('save', checked.input, () => saveFeedback(checked.input, store, mode));
  const ui = await step('view', saved, () => toUiState(saved));
  return { runId, mode, status: 'completed', result: saved, ui, trace, items: snapshot(store.items) };
}

const boundNodes = Object.freeze(['submit', 'form', 'validate', 'lookup', 'save', 'view']);
export async function testNode(nodeId, input, mode = 'mock', store = createStore()) {
  if (!boundNodes.includes(nodeId)) throw new Error('Node not bound to an executable function');
  if (!['mock', 'dry-run', 'sandbox'].includes(mode)) throw new Error('Mode denied');
  if (mode === 'mock') return { nodeId, mode, simulated: true, output: { status: 'mock', fixture: snapshot(input) }, elapsedMs: 0 };
  if (nodeId === 'submit') return runSubmission(input, { store, mode });
  const start = performance.now();
  let output;
  switch (nodeId) {
    case 'form': output = { status: 'received', draft: input }; break;
    case 'validate': output = validateFeedback(input); break;
    case 'lookup': output = await findDuplicate(input, store); break;
    case 'save': output = saveFeedback(input, store, mode); break;
    case 'view': output = toUiState(input); break;
  }
  return { nodeId, mode, simulated: false, input: snapshot(input), output,
    elapsedMs: Math.round(performance.now() - start) };
}
