import { createWriteStream, readdirSync } from 'node:fs';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { run } from 'node:test';
import { tap } from 'node:test/reporters';
import { fileURLToPath } from 'node:url';
import testCaseReporter from './test-case-reporter.ts';

const args=process.argv.slice(2);
const eventsPath=args[0]==='--events'?args.splice(0,2)[1]:undefined;
const directory=fileURLToPath(new URL('../tests/',import.meta.url));
// An explicit file list works in Windows shells and on Node 20.
const files=args.length?args.map(file=>path.resolve(file)):readdirSync(directory,{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith('.test.ts'))
  .map(entry=>path.join(directory,entry.name)).sort();
if(!files.length)throw new Error('未找到工作台测试文件。');

const events=run({files,concurrency:true});
events.on('test:fail',test=>{if(!test.todo&&!test.skip)process.exitCode=1});
const tapInput=new PassThrough({objectMode:true});
const outputs=[pipeline(tap(tapInput[Symbol.asyncIterator]() as Parameters<typeof tap>[0]),process.stdout,{end:false})];
if(eventsPath){
  // Node 20 loads CLI reporters before the TS loader. Attach the typed reporter here.
  const reportInput=new PassThrough({objectMode:true});
  outputs.push(pipeline(reportInput,testCaseReporter,createWriteStream(eventsPath)));
  events.pipe(reportInput);
}
events.pipe(tapInput);
await Promise.all(outputs);
