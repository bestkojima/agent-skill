import test from 'node:test';
import assert from 'node:assert/strict';
import { runAdapter,listAdapters,adapterSource } from '../server/adapters/index.mjs';
import { validateFeedback,createStore,runSubmission } from '../server/domain.mjs';
import { createServer } from 'node:http';
import { api } from '../server/api.mjs';

const samples = [
  {title:'改进暗色模式',category:'feature',detail:'晚上阅读更方便'},
  {title:'x',category:'feature',detail:''},
  {title:'有效的标题',category:'bad',detail:''},
  {title:'新增键盘快捷键',category:'feature',detail:'abc'},
  {title:'文字包含 "引号"',category:'other',detail:'包含反斜杠 \\ 和换行\n内容'}
];

test('adapter manifest is fixed and source paths exist', async()=>{
 const all=await listAdapters();
 assert.ok(all.length>=7);
 assert.equal(all.find(a=>a.id==='javascript')?.available,true);
 assert.equal(adapterSource('untrusted-shellexec'),null);
});

// @need-ids: REQ_FEEDBACK_VALIDATE
test('all installed language adapters obey same user-facing function contract', {timeout:150000}, async t=>{
 const available=(await listAdapters()).filter(x=>x.available);
 for(const info of available){
  await t.test(info.id,async()=>{
   for(const input of samples){
    const actual=await runAdapter(info.id,input);
    assert.deepEqual(actual.output,validateFeedback(input));
    assert.equal(actual.simulated,false);
   }
  });
 }
});

test('Mock never launches language implementation, and unknown adapters denied',async()=>{
 const mock=await runAdapter('cpp',{title:'x'}, {mode:'mock'});
 assert.equal(mock.simulated,true);assert.equal(mock.output.status,'mock');
 await assert.rejects(runAdapter('sh',{title:'x'}),/Unknown or untrusted/);
 await assert.rejects(runAdapter('python',{title:[]}),/must be a string/);
});

test('external adapter can be injected into complete business execution; dry-run still no write',async()=>{
 const store=createStore();const before=store.items.length;
 const out=await runSubmission(samples[0],{store,mode:'dry-run',validator:async raw=>(await runAdapter('python',raw)).output,validatorLabel:'python'});
 assert.equal(out.result.status,'planned');assert.equal(store.items.length,before);
 assert.equal(out.trace.find(x=>x.nodeId==='validate')?.adapter,'python');
});

test('HTTP adapter API endpoints use the allowlist and report a trace', {timeout:15000}, async()=>{
 const srv=createServer((req,res)=>api(req,res,()=>{res.writeHead(404).end()}));
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${srv.address().port}`;
 try {
  const manifest=await (await fetch(base+'/api/adapters')).json();
  assert.ok(manifest.adapters.find(a=>a.id==='python'));
  const response=await fetch(base+'/api/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'dry-run',language:'python',form:samples[0]})});
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.trace.find(x=>x.nodeId==='validate')?.adapter,'python');
  const source=await (await fetch(base+'/api/code?nodeId=validate&language=python')).json();
  assert.match(source.file,/python\/feedback\.py$/);
  const denied=await fetch(base+'/api/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nodeId:'validate',input:samples[0],language:'nonexistent',mode:'dry-run'})});
  assert.equal(denied.status,400);
 }finally {await new Promise(resolve=>srv.close(resolve))}
});
