/** Language adapters: trusted, fixed executables. No command strings from client or contract JSON. */
import { spawn } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFeedback } from '../domain.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const impl=path.join(root,'impl');
const buildDir=path.join(root,'_build');
const localTsc=path.join(root,'../../node_modules/typescript/bin/tsc');
const tsc=existsSync(localTsc)?[process.execPath,localTsc]:['tsc'];
const pythonCmd=process.env.PYTHON_BIN||(process.platform==='win32'?'python':'python3');
const js=path.join(impl,'node/feedback.mjs');
const ts=path.join(impl,'typescript/feedback.ts');
const python=path.join(impl,'python/feedback.py');
const cpp=path.join(impl,'cpp/feedback.cpp');
const java=path.join(impl,'java/Feedback.java');
const go=path.join(impl,'go/feedback.go');
const php=path.join(impl,'php/feedback.php');
const rust=path.join(impl,'rust/Cargo.toml');
const cs=path.join(impl,'csharp/feedback.csproj');
const binary=process.platform==='win32'?'.exe':'';
const sourceById=Object.freeze({
  javascript:js,typescript:ts,python,cpp,go,java,php,rust:path.join(impl,'rust/src/main.rs'),csharp:path.join(impl,'csharp/Program.cs')
});
const specs=Object.freeze({
 javascript:{label:'Node.js / JavaScript',requires:['node'],command:process.execPath,args:[js]},
 typescript:{label:'Node.js / TypeScript',requires:existsSync(localTsc)?['node']:['tsc','node'],build:[...tsc,'--target','ES2022','--module','ES2022','--skipLibCheck','--outDir',path.join(buildDir,'typescript'),ts],command:process.execPath,args:[path.join(buildDir,'typescript','feedback.js')],stamp:ts},
 python:{label:'Python',requires:[pythonCmd],command:pythonCmd,args:[python]},
 go:{label:'Go',requires:['go'],build:['go','build','-o',path.join(buildDir,'go'+binary),go],command:path.join(buildDir,'go'+binary),args:[],stamp:go},
 java:{label:'Java',requires:['javac','java'],build:['javac','-encoding','UTF-8','-d',path.join(buildDir,'java'),java],command:'java',args:['-cp',path.join(buildDir,'java'),'Feedback'],stamp:java},
 cpp:{label:'C++',requires:['g++'],build:['g++','-std=c++17','-O2','-o',path.join(buildDir,'cpp'+binary),cpp],command:path.join(buildDir,'cpp'+binary),args:[],stamp:cpp},
 php:{label:'PHP',requires:['php'],command:'php',args:[php]},
 rust:{label:'Rust',requires:['cargo'],build:['cargo','build','--offline','--release','--manifest-path',rust,'--target-dir',path.join(buildDir,'rust-target')],command:path.join(buildDir,'rust-target','release','feedback-contract-adapter'+binary),args:[],stamp:path.join(impl,'rust/src/main.rs')},
 csharp:{label:'C# / .NET',requires:['dotnet'],build:['dotnet','build',cs,'--configuration','Release','--output',path.join(buildDir,'csharp')],command:'dotnet',args:[path.join(buildDir,'csharp','feedback.dll')],stamp:path.join(impl,'csharp/Program.cs')},
});
const buildJobs=new Map();
const mtime=new Map();
export const supportedAdapters=Object.entries(specs).map(([id,s])=>({id,label:s.label,source:path.relative(path.dirname(path.dirname(root)),sourceById[id]).replaceAll('\\','/')}));
export function adapterSource(id){if(!(id in sourceById))return null;return sourceById[id];}

async function processCall(command,args,{input='',timeoutMs=7000,limit=64000}={}){
 return new Promise((resolve,reject)=>{
  let proc;try{proc=spawn(command,args,{cwd:path.dirname(root),windowsHide:true,stdio:['pipe','pipe','pipe'],shell:false})}catch(err){reject(err);return}
  let stdout='',stderr='',ended=false;
  const timer=setTimeout(()=>{proc.kill('SIGKILL');finish(new Error(`Process timeout after ${timeoutMs} ms`))},timeoutMs);
  function finish(err,value){if(ended)return;ended=true;clearTimeout(timer);if(err)reject(err);else resolve(value)}
  proc.on('error',err=>finish(err));
  proc.stdout.setEncoding('utf8');proc.stderr.setEncoding('utf8');
  proc.stdout.on('data',chunk=>{stdout+=chunk;if(stdout.length>limit)proc.kill('SIGKILL')});
  proc.stderr.on('data',chunk=>{stderr+=chunk;if(stderr.length>limit)proc.kill('SIGKILL')});
  proc.on('close',(code,signal)=>{
   if(stdout.length>limit||stderr.length>limit)return finish(new Error('Output size limit exceeded'));
   if(code!==0)return finish(new Error(`Adapter process failed (${code??signal}): ${stderr.slice(0,600)}`));
   finish(null,{stdout,stderr});
  });
  proc.stdin.on('error',()=>{});
  proc.stdin.end(input);
 });
}
async function checkBinary(bin){try{const out=await processCall(bin,bin==='go'?['version']:['--version'],{timeoutMs:2500});return !!out;}catch{return false}}
export async function listAdapters(){const list=await Promise.all(supportedAdapters.map(async a=>{
  const s=specs[a.id];const missing=[];
  for(const bin of s.requires){if(!(await checkBinary(bin)))missing.push(bin)}
  // Older windows Python launchers may be named python, configurable via PYTHON_BIN.
  return {...a,available:missing.length===0,missing,buildOnFirstUse:!!s.build};
}));return list}
async function ensureBuilt(id){const spec=specs[id];if(!spec.build)return;
 if(buildJobs.has(id))return buildJobs.get(id);
 const job=(async()=>{await mkdir(buildDir,{recursive:true});
  const modified=(await stat(spec.stamp)).mtimeMs;
  const target=id==='java'?path.join(buildDir,'java/Feedback.class'):spec.command==='dotnet'?spec.args[0]:spec.args.length===0?spec.command:spec.args[0];
  let existing=false;try{existing=(await stat(target)).isFile()}catch{}
  if(existing&&mtime.get(id)===modified)return;
  // A restored zip may have source changed and a stale executable: compile afresh for this process.
  const [command,...args]=spec.build;
  const res=await processCall(command,args,{timeoutMs:id==='rust'||id==='csharp'?90000:45000});
  mtime.set(id,modified);return res;
 })().finally(()=>buildJobs.delete(id));
 buildJobs.set(id,job);return job;
}
function validateResult(result){
 if(!result||typeof result!=='object')throw Error('Adapter output must be JSON object');
 if(result.status==='valid'){
  const f=result.input;if(!f||typeof f.title!=='string'||typeof f.category!=='string'||typeof f.detail!=='string')throw Error('Invalid normalized form returned');
 }else if(result.status==='invalid'){
  if(!['INVALID_TITLE','INVALID_CATEGORY','INVALID_DETAIL'].includes(result.code)||typeof result.message!=='string')throw Error('Invalid error contract returned');
 }else throw Error('Unknown adapter result status');
 return result;
}
export async function runAdapter(id,raw,{mode='dry-run'}={}){
 if(!['mock','dry-run','sandbox'].includes(mode))throw Error('Invalid test mode');
 if(!(id in specs))throw Error('Unknown or untrusted adapter');
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Feedback input must be an object');
 for(const key of ['title','category','detail']) if(key in raw && typeof raw[key]!=='string')throw Error(`${key} must be a string`);
 const input={title:raw.title??'',category:raw.category??'',detail:raw.detail??''};
 if(JSON.stringify(input).length>12000)throw Error('Input too large');
 if(mode==='mock')return {language:id,mode,simulated:true,output:{status:'mock',input},elapsedMs:0,logs:['Mock fixture only; adapter did not execute']};
 const start=performance.now();
 // "native" is a trusted in-process shortcut used by the existing feedback demo.
 if(id==='native')return {language:id,mode,simulated:false,output:validateResult(validateFeedback(input)),elapsedMs:Math.round(performance.now()-start),logs:[]};
 const spec=specs[id];await ensureBuilt(id);
 const {stdout,stderr}=await processCall(spec.command,spec.args,{input:JSON.stringify(input)+'\n',timeoutMs:7000});
 let data;try{data=JSON.parse(stdout.trim())}catch{throw Error(`Invalid JSON adapter output: ${stdout.slice(0,150)}`)}
 const output=validateResult(data);
 const canonical=validateFeedback(input);
 if(output.status!==canonical.status || (output.status==='invalid' && output.code!==canonical.code) ||
    (output.status==='valid' && JSON.stringify(output.input)!==JSON.stringify(canonical.input))) {
   throw Error(`${id} adapter violated the feedback validation contract`);
 }
 return {language:id,mode,simulated:false,output,elapsedMs:Math.round(performance.now()-start),logs:stderr?stderr.trim().split('\n').slice(-20):[]};
}
