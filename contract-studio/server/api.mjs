import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, runSubmission, testNode } from './domain.mjs';
import { adapterSource, supportedAdapters, listAdapters, runAdapter } from './adapters/index.mjs';
import { traceability, buildTraceabilityIndex, updateRequirement, updateGraph, sourceAt, isLocalRequest, isLocalWrite, TraceError } from './traceability.mjs';
import { runCalculation, testCalculatorNode } from './calculator.mjs';
import { openSource } from './editor.mjs';
import { runSum, testSumNode } from './sum.mjs';
import { runExpression, testExpressionNode } from './expression.mjs';
import { runAverage, testAverageNode } from './average.mjs';
import { listCapabilities, capabilityEvidence, runCapabilityTests } from './capabilities.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const permitted = { submit: 'runSubmission', form: null, validate: 'validateFeedback', lookup: 'findDuplicate', save: 'saveFeedback', view: 'toUiState' };
const calculatorSymbols = { calculator: 'runCalculation', 'calc-input': 'captureCalculatorInput', 'calc-validate': 'validateCalculatorInput', 'calc-compute': 'computeCalculator', 'calc-result': 'calculatorUi' };
const sumSymbols = { sum: 'runSum', 'sum-input': 'captureSumInput', 'sum-validate': 'validateSumInput', 'sum-accumulate': 'accumulateSum', 'sum-result': 'sumUi' };
const expressionSymbols = { expression:'runExpression', 'expr-input':'captureExpressionInput', 'expr-compute':'runExpressionCompute', 'expr-tokenize':'tokenizeExpression', 'expr-parse':'parseExpression', 'expr-evaluate':'evaluateExpression', 'expr-result':'expressionUi' };
const averageSymbols = { average:'runAverage', 'avg-validate':'validateAverageInput', 'avg-accumulate':'accumulateAverage', 'avg-compute':'computeAverage' };
let store = createStore();

async function jsonBody(req, limit = 40_000) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > limit) throw new Error('Payload too large');
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
    if (req.method === 'GET' && url.pathname === '/api/capabilities') {
      if (!isLocalRequest(req)) return reply(res, 403, {error:'Only same-origin local requests are allowed'});
      return reply(res, 200, {capabilities:listCapabilities()});
    }
    if (req.method === 'GET' && url.pathname === '/api/capabilities/evidence') {
      if (!isLocalRequest(req)) return reply(res, 403, {error:'Only same-origin local requests are allowed'});
      return reply(res, 200, await capabilityEvidence(url.searchParams.get('capabilityId')));
    }
    if (req.method === 'POST' && url.pathname === '/api/capabilities/test') {
      if (!isLocalWrite(req)) return reply(res, 403, {error:'Only same-origin local JSON updates are allowed'});
      const body = await jsonBody(req);
      return reply(res, 200, await runCapabilityTests(body.capabilityId));
    }
    if (req.method === 'POST' && url.pathname === '/api/traceability/build') {
      if (!isLocalWrite(req)) return reply(res, 403, {error:'Only same-origin local JSON updates are allowed'});
      const body = await jsonBody(req);
      if (body.featureId && !['feedback.submit','calculator.calculate','sum.calculate','expression.calculate','calculator.suite'].includes(body.featureId)) return reply(res,404,{error:'Unknown feature'});
      return reply(res,200,await buildTraceabilityIndex(undefined,body.featureId));
    }
    if (req.method === 'GET' && (url.pathname === '/api/traceability' || url.pathname === '/api/traceability/source')) {
      if (!isLocalRequest(req)) return reply(res, 403, {error: 'Only same-origin local requests are allowed'});
      if (url.pathname === '/api/traceability') {
        const feature = url.searchParams.get('feature');
        if (feature && !['feedback', 'calculator', 'sum', 'expression', 'suite'].includes(feature)) return reply(res, 404, {error: 'Unknown feature'});
        const featureId = feature === 'calculator' ? 'calculator.calculate' : feature === 'sum' ? 'sum.calculate' : feature === 'expression' ? 'expression.calculate' : feature === 'suite' ? 'calculator.suite' : undefined;
        return reply(res, 200, await traceability(undefined, featureId));
      }
      return reply(res, 200, await sourceAt(url.searchParams.get('path'), Number(url.searchParams.get('line'))));
    }
    if (req.method === 'POST' && url.pathname === '/api/open-source') {
      if (!isLocalWrite(req) || !req.headers.origin) return reply(res, 403, {error: '仅允许本机同源页面打开编辑器'});
      return reply(res, 200, await openSource(await jsonBody(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/traceability/requirement') {
      if (!isLocalWrite(req)) return reply(res, 403, {error: 'Only same-origin local JSON updates are allowed'});
      return reply(res, 200, await updateRequirement(await jsonBody(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/traceability/graph') {
      if (!isLocalWrite(req)) return reply(res, 403, {error: 'Only same-origin local JSON updates are allowed'});
      return reply(res, 200, await updateGraph(await jsonBody(req, 1_000_000)));
    }
    if (req.method === 'GET' && url.pathname === '/api/adapters') return reply(res, 200, { adapters: await listAdapters() });
    if (req.method === 'GET' && url.pathname === '/api/items') return reply(res, 200, { items: store.items });
    if (req.method === 'POST' && url.pathname === '/api/average') {
      return reply(res, 200, await runAverage(await jsonBody(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/average/test') {
      const body = await jsonBody(req);
      return reply(res, 200, await testAverageNode(body.nodeId, body.input, body.mode));
    }
    if (req.method === 'POST' && url.pathname === '/api/expression') {
      return reply(res, 200, await runExpression(await jsonBody(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/expression/test') {
      const body = await jsonBody(req);
      return reply(res, 200, await testExpressionNode(body.nodeId, body.input, body.mode));
    }
    if (req.method === 'POST' && url.pathname === '/api/sum') {
      return reply(res, 200, await runSum(await jsonBody(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/sum/test') {
      const body = await jsonBody(req);
      return reply(res, 200, await testSumNode(body.nodeId, body.input, body.mode));
    }
    if (req.method === 'POST' && url.pathname === '/api/calculator') {
      return reply(res, 200, await runCalculation(await jsonBody(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/calculator/test') {
      const body = await jsonBody(req);
      return reply(res, 200, await testCalculatorNode(body.nodeId, body.input, body.mode));
    }
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
      if (body.nodeId === 'submit' && body.mode && body.mode !== 'mock') {
        const language = body.language ?? 'javascript';
        if (!supportedAdapters.some(a=>a.id===language)) throw Error('Unsupported backend adapter');
        return reply(res,200,await runSubmission(body.input,{store,mode:body.mode,
          validator:async raw=>(await runAdapter(language,raw,{mode:'dry-run'})).output,validatorLabel:language}));
      }
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
      if (id && Object.hasOwn(averageSymbols,id)) {
        const symbol=averageSymbols[id];
        const source=await fs.readFile(path.join(here,'average.mjs'),'utf8');
        const start=source.indexOf(`export ${symbol==='runAverage'?'async ':''}function ${symbol}(`);
        const nextExport=source.indexOf('\nexport ',start+10);
        return reply(res,200,{symbol,file:'server/average.mjs',excerpt:start<0?'Not found':source.slice(start,nextExport<0?undefined:nextExport).trim().slice(0,4600)});
      }
      if (id && Object.hasOwn(expressionSymbols, id)) {
        const symbol = expressionSymbols[id];
        const source = await fs.readFile(path.join(here, 'expression.mjs'), 'utf8');
        const start = source.indexOf(`export ${['runExpression', 'runExpressionCompute'].includes(symbol) ? 'async ' : ''}function ${symbol}(`);
        const nextExport = source.indexOf('\nexport ', start + 10);
        return reply(res, 200, { symbol, file:'server/expression.mjs',
          excerpt: start < 0 ? 'Not found' : source.slice(start, nextExport < 0 ? undefined : nextExport).trim().slice(0, 4600) });
      }
      if (id && Object.hasOwn(sumSymbols, id)) {
        const symbol = sumSymbols[id];
        const source = await fs.readFile(path.join(here, 'sum.mjs'), 'utf8');
        const start = source.indexOf(`export ${symbol === 'runSum' ? 'async ' : ''}function ${symbol}(`);
        const nextExport = source.indexOf('\nexport ', start + 10);
        return reply(res, 200, { symbol, file:'server/sum.mjs',
          excerpt: start < 0 ? 'Not found' : source.slice(start, nextExport < 0 ? undefined : nextExport).trim().slice(0, 4600) });
      }
      if (id && Object.hasOwn(calculatorSymbols, id)) {
        const symbol = calculatorSymbols[id];
        const source = await fs.readFile(path.join(here, 'calculator.mjs'), 'utf8');
        const start = source.indexOf(`export ${symbol === 'runCalculation' ? 'async ' : ''}function ${symbol}(`);
        const nextExport = source.indexOf('\nexport ', start + 10);
        return reply(res, 200, { symbol, file:'server/calculator.mjs',
          excerpt: start < 0 ? 'Not found' : source.slice(start, nextExport < 0 ? undefined : nextExport).trim().slice(0, 4600) });
      }
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
    return reply(res, e instanceof TraceError ? e.status : 400, { error: e instanceof Error ? e.message : String(e) });
  }
}
