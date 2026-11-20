// One opt-in runner per project; the index determines the exact cases for a node.
export function projectTestPlan(published,index,testCases) {
  if(!published?.runner)return {tests:[],reason:'项目未登记节点测试执行器。'};
  if(index.state!=='current')return {tests:[],reason:'需求索引已过期，请先重建索引。'};
  const tests=testCases.filter(test=>test.scope==='direct');
  if(!tests.length)return {tests:[],reason:'此节点没有直接关联的测试。'};
  const unresolved=tests.find(test=>test.sourceState!=='resolved'||test.indexState!=='current'||
    !/^TEST_[A-Z0-9_]+$/.test(test.id)||!test.reference?.path.startsWith(published.directory)||
    !test.reference.symbol.endsWith(`.test_${test.id}`));
  if(unresolved)return {tests:[],reason:`${unresolved.id} 缺少唯一的项目测试源码定位，请修正标记后重建索引。`};
  return {tests};
}
