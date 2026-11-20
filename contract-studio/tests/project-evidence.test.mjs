import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readProjectEvidence } from '../server/project-evidence.mjs';

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
  const changed=[['project/example/app.py',{mtimeMs:Date.parse(completedAt)+1000}]];
  assert.equal((await readProjectEvidence(root,file,cases,{sourceRevision:changed})).cases[0].state,'stale');
});
