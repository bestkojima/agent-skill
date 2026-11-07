import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, runSubmission, testNode } from './domain.mjs';
import { adapterSource, supportedAdapters, listAdapters, runAdapter } from './adapters/index.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const permitted = { submit: 'runSubmission', form: null, validate: 'validateFeedback', lookup: 'findDuplicate', save: 'saveFeedback', view: 'toUiState' };
let store = createStore();

async function jsonBody(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 40_000) throw new Error('Payload too large');
  }
  return text ? JSON.parse(text) : {};
}
const reply = (res, status, value) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(value));
};

// Vite development/preview middleware, intentionally NO arbitrary code execution.
export async function api(req, res, next) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith('/api/')) return next();
  try {
    if (req.method === 'GET' && url.pathname === '/api/adapters') return reply(res, 200, { adapters: await listAdapters() });
    if (req.method === 'GET' && url.pathname === '/api/items') return reply(res, 200, { items: store.items });
    if (req.method === 'POST' && url.pathname === '/api/submit') {
      const body = await jsonBody(req);
      const language = body.language ?? 'javascript';
      if (!supportedAdapters.some(a => a.id === language)) throw Error('Unsupported backend adapter');
      return reply(res, 200, await runSubmission(body.form, { store, mode: body.mode,
        validator: async raw => (await runAdapter(language, raw, { mode: 'dry-run' })).output,
        validatorLabel: language }));
    }
    if (req.method === 'POST' && url.pathname === '/api/test') {
      const body = await jsonBody(req);
      if (body.nodeId === 'validate') {
        const language = body.language ?? 'javascript';
        return reply(res, 200, {nodeId:'validate',...(await runAdapter(language, body.input, {mode:body.mode}))});
      }
      return reply(res, 200, await testNode(body.nodeId, body.input, body.mode, store));
    }
    if (req.method === 'POST' && url.pathname === '/api/reset') {
      store = createStore(); return reply(res, 200, { items: store.items });
    }
    if (req.method === 'GET' && url.pathname === '/api/code') {
      const id = url.searchParams.get('nodeId');
      if (id === 'validate' && url.searchParams.has('language')) {
        const lang = url.searchParams.get('language');
        const file = adapterSource(lang);
        if (!file) return reply(res, 404, {error:'Unknown adapter source'});
        const text = await fs.readFile(file, 'utf8');
        return reply(res, 200, {symbol:'feedback.validate',file:path.relative(path.join(here, '..'),file).replaceAll('\\','/'),excerpt:text.slice(0,6000)});
      }
      if (!id || !(id in permitted)) return reply(res, 404, { error: 'Unbound code' });
      const symbol = permitted[id];
      if (!symbol) {
        const reactSource = await fs.readFile(path.join(here, '../src/App.tsx'), 'utf8');
        const start = reactSource.indexOf('function FeedbackPreview(');
        const end = reactSource.indexOf('\nfunction Studio()', start);
        return reply(res, 200, { symbol: 'FeedbackPreview', file: 'src/App.tsx',
          excerpt: start < 0 ? 'Not found' : reactSource.slice(start, end < 0 ? undefined : end).slice(0, 4600) });
      }
      const source = await fs.readFile(path.join(here, 'domain.mjs'), 'utf8');
      const start = source.indexOf(`export ${['findDuplicate','runSubmission','testNode'].includes(symbol) ? 'async ' : ''}function ${symbol}(`);
      const nextExport = source.indexOf('\nexport ', start + 10);
      return reply(res, 200, { symbol, file: 'server/domain.mjs',
        excerpt: start < 0 ? 'Not found' : source.slice(start, nextExport < 0 ? undefined : nextExport).trim().slice(0, 4600) });
    }
    return reply(res, 404, { error: 'Unknown API' });
  } catch (e) {
    return reply(res, 400, { error: e instanceof Error ? e.message : String(e) });
  }
}
