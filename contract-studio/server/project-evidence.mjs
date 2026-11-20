import fs from 'node:fs/promises';
import path from 'node:path';

export async function readProjectEvidence(root, reportFile, tests, { stale = false, sourceRevision = [] } = {}) {
  let report;
  try {
    report = JSON.parse(await fs.readFile(path.join(root, reportFile), 'utf8'));
    if (report.version !== 1 || !Array.isArray(report.cases) || !Number.isFinite(Date.parse(report.completedAt))) {
      throw Error('报告格式无效');
    }
  } catch (error) {
    if (error.code === 'ENOENT') return {state:'not-run',cases:[],message:'项目还没有发布测试报告。'};
    return {state:'unmatched',cases:[],message:`无法读取项目报告：${error.message}`};
  }
  stale ||= sourceRevision.some(([, revision]) => revision.mtimeMs > Date.parse(report.completedAt));
  const observed = new Map();
  for (const item of report.cases) {
    if (!item || !['passed','failed','skipped'].includes(item.state)) continue;
    observed.set(item.id, observed.has(item.id) ? null : item);
  }
  const cases = tests.map(test => {
    const item = observed.get(test.id);
    return {...test,state:item ? (stale ? 'stale' : item.state) : 'unmatched',...(item?.message ? {message:item.message} : {})};
  });
  const state=stale ? 'stale' : cases.some(item=>item.state==='failed') ? 'failed' :
    cases.length>0 && cases.every(item=>item.state==='passed') ? 'passed' : 'unmatched';
  return {state,completedAt:report.completedAt,cases,message:stale?'需求或源码索引已变化、或当前为行为草稿；请刷新索引与项目测试报告。':'此结果由目标项目发布。'};
}
