import fs from 'node:fs/promises';
import path from 'node:path';

export function validProjectReport(report) {
  return report?.version===1&&Array.isArray(report.cases)&&Number.isFinite(Date.parse(report.completedAt));
}

export async function readProjectEvidence(root, reportFile, tests, { stale = false, sourceRevision = [], summarizeDirect = false } = {}) {
  let report;
  try {
    report = JSON.parse(await fs.readFile(path.join(root, reportFile), 'utf8'));
    if (!validProjectReport(report)) {
      throw Error('报告格式无效');
    }
  } catch (error) {
    if (error.code === 'ENOENT') return {state:'not-run',cases:[],message:'项目还没有发布测试报告。'};
    return {state:'unmatched',cases:[],message:`无法读取项目报告：${error.message}`};
  }
  stale ||= sourceRevision.some(([, revision]) => revision.mtimeMs > Date.parse(report.completedAt));
  return matchProjectReport(report,tests,{stale,summarizeDirect});
}

export function matchProjectReport(report,tests,{stale=false,summarizeDirect=false,caseDirectory}={}) {
  const observed = new Map();
  for (const item of report.cases) {
    if (!item || !['passed','failed','skipped'].includes(item.state)) continue;
    observed.set(item.id, observed.has(item.id) ? null : item);
  }
  const cases = tests.map(test => {
    let item = observed.get(test.id);
    if(test.sourceState&&test.sourceState!=='resolved')item=null;
    if(item&&caseDirectory&&(
      caseDirectory+item.file!==test.reference?.path||item.symbol!==test.reference?.symbol
    ))item=null;
    return {...test,state:item ? (stale ? 'stale' : item.state) : 'unmatched',...(item?.message ? {message:item.message} : {})};
  });
  const summaryCases=summarizeDirect?cases.filter(item=>item.scope==='direct'):cases;
  const state=stale ? 'stale' : summaryCases.some(item=>item.state==='failed') ? 'failed' :
    summaryCases.length>0 && summaryCases.every(item=>item.state==='passed') ? 'passed' : 'unmatched';
  const message=stale?'需求或源码索引已变化、或当前为行为草稿；请刷新索引与项目测试报告。':
    summarizeDirect&&!summaryCases.length?'没有直接验证此节点的用例；相关用例的结果不计入本节点状态。':'此结果由目标项目发布。';
  return {state,completedAt:report.completedAt,cases,message};
}
