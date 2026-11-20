import {execFile} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {sourceRevision} from './needs-index.mjs';
import {nodeContext} from './node-context.mjs';
import {matchProjectReport,validProjectReport} from './project-evidence.mjs';
import {projectTestPlan} from './project-test-plan.mjs';
import {TraceError} from './traceability.mjs';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runningProjects=new Set();

function execute(root,runner,tests) {
  const python=path.join(root,process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python');
  const args=[path.join(root,runner),...tests.flatMap(test=>['--test-id',test.id])];
  return new Promise((resolve,reject)=>{
    execFile(python,args,{
      cwd:root,windowsHide:true,timeout:60_000,maxBuffer:256_000,
      env:{...process.env,PYTHONIOENCODING:'utf-8',PYTHONDONTWRITEBYTECODE:'1'}
    },(error,stdout,stderr)=>{
      if(!error||error.code===1) return resolve({stdout,failed:Boolean(error)});
      const reason=error.code==='ENOENT'?'找不到项目 Python，请先运行 uv sync。':
        error.killed?'测试运行超时。':stderr.trim().slice(-600)||error.message;
      reject(new TraceError(`项目测试未能执行：${reason}`,502));
    });
  });
}

export async function runProjectNodeTests(feature,nodeId,root=projectRoot) {
  const published=feature.publishedTests;
  if(!published?.runner)throw new TraceError('项目未登记节点测试执行器。',409);
  const key=path.join(root,published.runner);
  if(runningProjects.has(key))throw new TraceError('项目已有节点测试在运行，请等它结束。',409);
  runningProjects.add(key);
  try {
    const {context}=await nodeContext({featureId:feature.id,nodeId},root);
    const {tests,reason}=projectTestPlan(published,context.index,context.backend.testCases);
    if(reason)throw new TraceError(reason,409);
    const {stdout,failed}=await execute(root,published.runner,tests);
    let report;
    try { report=JSON.parse(stdout); } catch { throw new TraceError('项目测试未返回有效报告。',502); }
    const ids=new Set(tests.map(test=>test.id));
    if(!validProjectReport(report)||report.cases.some(item=>!ids.has(item?.id)))
      throw new TraceError('项目测试报告与请求的用例范围不符。',502);
    const stale=!isDeepStrictEqual(context.index.sourceRevision,await sourceRevision(root));
    const result=matchProjectReport(report,tests,{stale,caseDirectory:published.directory});
    if(stale)result.message='运行期间源码或规格有变化。请重建索引后重新运行。';
    else if(result.state==='unmatched')result.message='有用例未执行、被跳过或源码不匹配。';
    else if(failed&&result.state!=='failed')throw new TraceError('测试执行失败，报告没有对应的失败用例。',502);
    return {...result,indexBuiltAt:context.index.builtAt};
  } finally {
    runningProjects.delete(key);
  }
}
