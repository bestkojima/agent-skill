import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { matchProjectReport, readProjectEvidence } from '../server/project-evidence.mjs';

test('display only consumes published cases; missing, duplicate and stale results cannot pass', async t => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-published-'));
  t.after(()=>fs.rm(root,{force:true,recursive:true}));
  const file='result.json';
  const cases=[{id:'TEST_ONE',verifies:[{needId:'REQ_X.ONE'}]}];
  assert.equal((await readProjectEvidence(root,file,cases)).state,'not-run');
  const completedAt='2026-01-02T00:00:00Z';
  const write=entries=>fs.writeFile(path.join(root,file),JSON.stringify({version:1,completedAt,cases:entries}));
  await write([{id:'TEST_OTHER',state:'passed'}]);
  assert.equal((await readProjectEvidence(root,file,cases)).cases[0].state,'unmatched');
  await write([{id:'TEST_ONE',state:'passed'},{id:'TEST_ONE',state:'failed'}]);
  assert.equal((await readProjectEvidence(root,file,cases)).state,'unmatched');
  await write([{id:'TEST_ONE',state:'failed',message:'bad total'}]);
  assert.equal((await readProjectEvidence(root,file,cases)).cases[0].message,'bad total');
  await write([{id:'TEST_ONE',state:'passed'}]);
  assert.equal((await readProjectEvidence(root,file,cases)).cases[0].state,'passed');
  assert.equal((await readProjectEvidence(root,file,[{...cases[0],sourceState:'missing'}])).state,'unmatched');
  const changed=[['project/example/app.py',{mtimeMs:Date.parse(completedAt)+1000}]];
  assert.equal((await readProjectEvidence(root,file,cases,{sourceRevision:changed})).cases[0].state,'stale');
});

test('selected-run evidence needs the indexed file and symbol as well as the ID', ()=>{
  const testCase={id:'TEST_DIRECT',sourceState:'resolved',
    reference:{path:'project/example/tests/test_values.py',symbol:'Checks.test_TEST_DIRECT'}};
  const observed={id:testCase.id,state:'passed',file:'tests/test_values.py',symbol:testCase.reference.symbol};
  const match=caseResult=>matchProjectReport({cases:[caseResult]},[testCase],{caseDirectory:'project/example/'}).state;
  assert.equal(match(observed),'passed');
  assert.equal(match({...observed,file:'tests/test_other.py'}),'unmatched');
  assert.equal(match({...observed,symbol:'Other.test_TEST_DIRECT'}),'unmatched');
});

test('a related pass or failure does not decide the result of this node',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-scoped-evidence-'));
  t.after(()=>fs.rm(root,{force:true,recursive:true}));
  const file='result.json';
  const completedAt='2026-01-02T00:00:00Z';
  const results=[{id:'TEST_DIRECT',state:'passed'},{id:'TEST_RELATED',state:'failed'}];
  await fs.writeFile(path.join(root,file),JSON.stringify({version:1,completedAt,cases:results}));
  const direct={id:'TEST_DIRECT',scope:'direct'};
  const related={id:'TEST_RELATED',scope:'related'};
  const options={summarizeDirect:true};
  const read=tests=>readProjectEvidence(root,file,tests,options);
  const both=await read([direct,related]);
  assert.equal(both.state,'passed');
  assert.equal(both.cases[1].state,'failed');
  const relatedOnly=await read([{...direct,scope:'related'}]);
  assert.equal(relatedOnly.state,'unmatched');
  assert.equal(relatedOnly.cases[0].state,'passed');
});
