import { runCalculation, testCalculatorNode } from '../../server/calculator.mjs';
import { runSum, testSumNode } from '../../server/sum.mjs';
import { runExpression, testExpressionNode } from '../../server/expression.mjs';
import { runAverage, testAverageNode } from '../../server/average.mjs';
const frontend = mode => ({entry:'calculator',feature:'suite',component:'ExpressionCalculator',path:'features/calculator/client.tsx',mode});
const calculatorFrontend=frontend;
const modes=[['suite','calculator.suite','计算器','calculator-suite','suite','suite'],['calculator','calculator.calculate','两数四则运算','calculator','calculator','calc-compute'],['sum','sum.calculate','多数字求和','sum','sum','sum-accumulate'],['expression','expression.calculate','混合四则运算','expression','expression','expr-compute']];
const features=modes.map(([alias,id,title,file,rootNodeId,defaultSelected])=>({
  id,alias,title,rootNodeId,defaultSelected,frontend:frontend(alias),
  graphFile:'contracts/'+file+'.json',requirementFile:'contracts/'+file+'.requirements.json',rstFile:'traceability/'+file+'.rst',
  draftKeys:{graph:'contract-studio-'+alias+'-graph-v1',base:'contract-studio-'+alias+'-graph-base-v1',pending:'contract-studio-'+alias+'-graph-pending-v1',requirements:'contract-studio-'+alias+'-requirement-drafts-v1'},
  ...(alias==='suite'?{defaultUi:true,requirementSources:['calculator.calculate','sum.calculate','expression.calculate'],specPrefix:'SUITE_'}:{})
}));
const capabilities=[
  { id:'calculator.calculate', title:'两数四则运算', rootNodeId:'calculator',
    nodeIds:['calculator','calc-input','calc-validate','calc-compute','calc-result'],
    runPath:'/api/calculator', testPath:'/api/calculator/test', frontend:calculatorFrontend('calculator'),
    testFiles:['tests/calculator.test.mjs','tests/calculator-input.test.mjs'] },
  { id:'sum.calculate', title:'多数字求和', rootNodeId:'sum',
    nodeIds:['sum','sum-input','sum-validate','sum-accumulate','sum-result'],
    runPath:'/api/sum', testPath:'/api/sum/test', frontend:calculatorFrontend('sum'),
    testFiles:['tests/sum.test.mjs','tests/calculator-input.test.mjs'] },
  { id:'expression.calculate', title:'混合四则运算', rootNodeId:'expression',
    nodeIds:['expression','expr-input','expr-compute','expr-tokenize','expr-parse','expr-evaluate','expr-result'],
    runPath:'/api/expression', testPath:'/api/expression/test', frontend:calculatorFrontend('expression'),
    testFiles:['tests/expression.test.mjs','tests/calculator-input.test.mjs'] },
  { id:'average.calculate', title:'平均值', rootNodeId:'average',
    nodeIds:['average','avg-validate','avg-accumulate','avg-compute'],
    runPath:'/api/average', testPath:'/api/average/test', frontend:calculatorFrontend('average'),
    testFiles:['tests/average.test.mjs','tests/average-api.test.mjs','tests/calculator-input.test.mjs'] }
];
const routes=[[runCalculation,testCalculatorNode,'calculator'],[runSum,testSumNode,'sum'],[runExpression,testExpressionNode,'expression'],[runAverage,testAverageNode,'average']].flatMap(([run,test,id])=>[
  {method:'POST',path:'/api/'+id,handle:body=>run(body)},
  {method:'POST',path:'/api/'+id+'/test',handle:body=>test(body.nodeId,body.input,body.mode)}
]);
const trials=[{capabilityId:'average.calculate',inputSchema:{type:'object',required:['values'],properties:{values:{type:'array',minItems:1,items:{type:['number','string']}}}},
  description:'节点试运行接收原始 values，由 testAverageNode 准备前置步骤；内部函数使用节点 inputSchema。'}];
export default {id:'calculator',features,capabilities,routes,trials};
