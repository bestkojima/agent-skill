import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const calculatorFrontend = mode => ({ component: 'ExpressionCalculator', path: 'src/App.tsx', mode });
// Reviewed project capabilities, never commands supplied by the diagram or browser.
const registry = [
  { id:'calculator.calculate', title:'两数四则运算', rootNodeId:'calculator',
    nodeIds:['calculator','calc-input','calc-validate','calc-compute','calc-result'],
    runPath:'/api/calculator', testPath:'/api/calculator/test', frontend:calculatorFrontend('calculator'),
    implementation:[{path:'server/calculator.mjs',symbol:'runCalculation'}],
    testFiles:['tests/calculator.test.mjs','tests/calculator-input.test.mjs'],
    requirementIds:['REQ_CALC_ALL','REQ_CALC_INPUT','REQ_CALC_VALIDATE','REQ_CALC_COMPUTE','REQ_CALC_RESULT'] },
  { id:'sum.calculate', title:'多数字求和', rootNodeId:'sum',
    nodeIds:['sum','sum-input','sum-validate','sum-accumulate','sum-result'],
    runPath:'/api/sum', testPath:'/api/sum/test', frontend:calculatorFrontend('sum'),
    implementation:[{path:'server/sum.mjs',symbol:'runSum'}],
    testFiles:['tests/sum.test.mjs','tests/calculator-input.test.mjs'],
    requirementIds:['REQ_SUM_ALL','REQ_SUM_INPUT','REQ_SUM_VALIDATE','REQ_SUM_ACCUMULATE','REQ_SUM_RESULT'] },
  { id:'expression.calculate', title:'混合四则运算', rootNodeId:'expression',
    nodeIds:['expression','expr-input','expr-compute','expr-tokenize','expr-parse','expr-evaluate','expr-result'],
    runPath:'/api/expression', testPath:'/api/expression/test', frontend:calculatorFrontend('expression'),
    implementation:[{path:'server/expression.mjs',symbol:'runExpression'},{path:'server/expression.mjs',symbol:'runExpressionCompute'}],
    testFiles:['tests/expression.test.mjs','tests/calculator-input.test.mjs'],
    requirementIds:['REQ_EXPR_ALL','REQ_EXPR_INPUT','REQ_EXPR_COMPUTE','REQ_EXPR_TOKENIZE','REQ_EXPR_PARSE','REQ_EXPR_EVALUATE','REQ_EXPR_RESULT'] },
  { id:'average.calculate', title:'平均值', rootNodeId:'average',
    nodeIds:['average','avg-validate','avg-accumulate','avg-compute'],
    runPath:'/api/average', testPath:'/api/average/test', frontend:calculatorFrontend('average'),
    implementation:[{path:'server/average.mjs',symbol:'runAverage'},{path:'server/average.mjs',symbol:'validateAverageInput'},
      {path:'server/average.mjs',symbol:'accumulateAverage'},{path:'server/average.mjs',symbol:'computeAverage'}],
    testFiles:['tests/average.test.mjs','tests/average-api.test.mjs','tests/calculator-input.test.mjs'],
    requirementIds:['REQ_AVERAGE_ALL','REQ_AVERAGE_VALIDATE','REQ_AVERAGE_ACCUMULATE','REQ_AVERAGE_COMPUTE'] },
  { id:'feedback.submit', title:'反馈工单', rootNodeId:'submit',
    nodeIds:['submit','form','validate','lookup','save','view'],
    runPath:'/api/submit', testPath:'/api/test', frontend:{component:'FeedbackPreview',path:'src/App.tsx',mode:'feedback'},
    implementation:[{path:'server/domain.mjs',symbol:'runSubmission'}], testFiles:['tests/domain.test.mjs'],
    requirementIds:['REQ_FEEDBACK_SUBMIT','REQ_FEEDBACK_FORM','REQ_FEEDBACK_VALIDATE','REQ_FEEDBACK_LOOKUP','REQ_FEEDBACK_SAVE','REQ_FEEDBACK_VIEW'] }
];
export function listCapabilities() { return structuredClone(registry); }
function capability(id) {
  const found = registry.find(item => item.id === id);
  if (!found) throw new Error('未知的功能能力');
  return found;
}

async function filesUnder(root, dir) {
  let entries;
  try { entries = await fs.readdir(path.join(root,dir), {withFileTypes:true}); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const files = [];
  for (const entry of entries) {
    const relative = `${dir}/${entry.name}`;
    if (entry.isDirectory() && entry.name !== '_build' && entry.name !== 'target') files.push(...await filesUnder(root,relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

// Metadata tracks the actual candidate without storing source code or hashing files.
async function candidate(root, cap) {
  const relevant = new Set([...cap.testFiles,'server/api.mjs','server/capabilities.mjs',
    ...await filesUnder(root,'src'), ...cap.implementation.map(ref=>ref.path),
    ...await filesUnder(root,'server').then(files=>files.filter(file=>!file.startsWith('server/adapters/')))]);
  const files = [];
  for (const file of [...relevant].sort()) {
    try { const stat=await fs.stat(path.join(root,file)); files.push({path:file,size:stat.size,mtimeMs:stat.mtimeMs}); }
    catch (error) { if (error.code!=='ENOENT') throw error; files.push({path:file,missing:true}); }
  }
  const contracts = [];
  for (const file of (await filesUnder(root,'contracts')).filter(file=>file.endsWith('.json')).sort()) {
    const value=JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
    if (Array.isArray(value.requirements)) {
      for (const req of value.requirements.filter(req=>cap.requirementIds.includes(req.id))) {
        contracts.push({file,id:req.id,title:req.title,description:req.description,nodeIds:req.nodeIds??[req.nodeId],acceptance:req.acceptance??[]});
      }
    } else if (Array.isArray(value.nodes)) {
      const nodes=value.nodes.filter(node=>cap.nodeIds.includes(node.id)||node.capabilityId===cap.id).map(({position,size,importance,...node})=>node);
      const ids=new Set(nodes.map(node=>node.id));
      if (nodes.length) contracts.push({file,nodes,edges:value.edges?.filter(edge=>ids.has(edge.source)||ids.has(edge.target))});
    }
  }
  return {files,contracts};
}
const reportPath = (root,id) => path.join(root,'traceability','_build','test-results',`${id}.json`);
function publicReport(report) { const {candidate: _candidate,...result}=report; return result; }
export async function capabilityEvidence(id, root=projectRoot) {
  const cap=capability(id);
  let report;
  try { report=JSON.parse(await fs.readFile(reportPath(root,id),'utf8')); }
  catch (error) { if (error.code==='ENOENT') return {capabilityId:id,state:'not-run',message:'尚未运行关联测试'}; throw error; }
  if (!isDeepStrictEqual(report.candidate,await candidate(root,cap))) {
    return {...publicReport(report),state:'stale',message:'相关代码或行为契约已变化，请重新运行测试'};
  }
  return publicReport(report);
}

function executeTests(root, testFiles) {
  return new Promise(resolve=>{
    const args=['--test','--test-reporter=tap',...testFiles];
    const env={...process.env};
    // A caller may itself be a node:test process; this is a separate test run.
    delete env.NODE_TEST_CONTEXT;
    const child=spawn(process.execPath,args,{cwd:root,env,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let output='',message='';
    const append=chunk=>{if(output.length<200_000)output+=chunk.toString().slice(0,200_000-output.length);};
    child.stdout.on('data',append);child.stderr.on('data',append);
    const timeout=setTimeout(()=>{message='测试执行超过 60 秒，已停止本次进程';child.kill();},60_000);
    child.once('error',error=>{clearTimeout(timeout);resolve({exitCode:null,output,message:error.message,args});});
    child.once('close',exitCode=>{clearTimeout(timeout);resolve({exitCode,output,message,args});});
  });
}
const active = new Map();
export async function runCapabilityTests(id, root=projectRoot) {
  const cap=capability(id);
  const key=`${root}:${id}`;
  if(active.has(key)) return active.get(key);
  const job=(async()=>{
    const before=await candidate(root,cap);
    const startedAt=new Date().toISOString(), start=performance.now();
    const result=await executeTests(root,cap.testFiles);
    const changed=!isDeepStrictEqual(before,await candidate(root,cap));
    const passed=Number(result.output.match(/^# pass (\d+)\s*$/m)?.[1]??0);
    const failed=Number(result.output.match(/^# fail (\d+)\s*$/m)?.[1]??0);
    const report={capabilityId:id,state:changed?'stale':result.exitCode===0&&passed>0&&failed===0?'passed':'failed',
      passed,failed,exitCode:result.exitCode,startedAt,completedAt:new Date().toISOString(),durationMs:Math.round(performance.now()-start),
      command:['node',...result.args],output:result.output,candidate:before,
      message:changed?'运行期间相关代码或契约发生变化，请重新测试':result.message||undefined};
    const file=reportPath(root,id);await fs.mkdir(path.dirname(file),{recursive:true});
    await fs.writeFile(file,JSON.stringify(report,null,2)+'\n');
    return publicReport(report);
  })();
  active.set(key,job);
  try { return await job; } finally { active.delete(key); }
}
