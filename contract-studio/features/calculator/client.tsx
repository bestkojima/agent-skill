import { useEffect, useRef, useState } from 'react';
import { api } from '../../src/api';
import type { Run, Step, Graph } from '../../src/workbench-types';
import type { FeatureClient, FeaturePanelProps, GraphLayout } from '../../src/feature-client';
import { prepareCalculatorRequest, normalizeCalculatorResult, type CalculatorMode } from '../../src/calculator-input.mjs';

// @need-ids: REQ_CALC_INPUT, REQ_CALC_RESULT
export function CalculatorPreview({onRun}:{onRun:(run:Run)=>void}){
  const [left,setLeft]=useState('6');
  const [right,setRight]=useState('2');
  const [operator,setOperator]=useState<'+'|'-'|'*'|'/'>('/');
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<Run|null>(null);
  const [error,setError]=useState('');
  const calculate=async()=>{
    setBusy(true);setError('');setResult(null);
    try{const run=await api<Run>('/api/calculator',{left,right,operator});setResult(run);onRun(run)}
    catch(e){setError(String(e));onRun({trace:[]})}finally{setBusy(false)}
  };
  return <section className="preview-panel calculator-panel">
    <div className="panel-heading"><div><div className="eyebrow">可操作的真实功能</div><h2>四则计算器</h2></div><span className="calculator-badge">互动演示</span></div>
    <p className="calculator-intro">输入两个数字，选择运算，再看左侧实际走过的节点。</p>
    <form onSubmit={e=>{e.preventDefault();void calculate()}}>
      <div className="calculator-operands">
        <div className="field"><label htmlFor="calculator-left">第一个数</label><input id="calculator-left" inputMode="decimal" value={left} onChange={e=>setLeft(e.target.value)} placeholder="例如 6"/></div>
        <div className="field"><label htmlFor="calculator-operator">运算</label><select id="calculator-operator" value={operator} onChange={e=>setOperator(e.target.value as '+'|'-'|'*'|'/')}><option value="+">＋ 加</option><option value="-">− 减</option><option value="*">× 乘</option><option value="/">÷ 除</option></select></div>
        <div className="field"><label htmlFor="calculator-right">第二个数</label><input id="calculator-right" inputMode="decimal" value={right} onChange={e=>setRight(e.target.value)} placeholder="例如 2"/></div>
      </div>
      <button type="submit" className="primary-button full" disabled={busy}>{busy?'计算中…':'计算并观察节点'}</button>
    </form>
    <div className={`calculator-result ${error||result?.ui?.tone==='error'?'is-error':''}`} aria-live="polite">
      <span>计算结果</span>
      {error?<strong>{error}</strong>:result?.ui?<strong>{result.ui.tone==='success'&&typeof result.result?.value==='number'?result.result.value:result.ui.message}</strong>:<strong className="calculator-placeholder">结果将在这里显示</strong>}
    </div>
    <p className="micro">试试 6 ÷ 2，再把第二个数改为 0，观察错误分支。</p>
  </section>;
}

type SumStep={index:number;value:number;previous:number;total:number};
type SumRun=Run&{result:{status:'success'|'invalid';value?:number;message:string;steps?:SumStep[]}};
const initialSumValues=Array.from({length:20},(_,i)=>String(i+1));
const splitSumValues=(text:string)=>text.trim().split(/[,，][ \t]*(?:\r?\n[ \t]*)?|\r?\n/).map(value=>value.trim());

// @need-ids: REQ_SUM_INPUT, REQ_SUM_RESULT
export function SumPreview({onRun}:{onRun:(run:Run)=>void}){
  const [text,setText]=useState(initialSumValues.join(', '));
  const [busy,setBusy]=useState(true);
  const [result,setResult]=useState<SumRun|null>(null);
  const [error,setError]=useState('');
  const requestId=useRef(0);
  const onRunRef=useRef(onRun);onRunRef.current=onRun;
  const calculate=async(values:string[])=>{
    const current=++requestId.current;
    setBusy(true);setError('');setResult(null);
    try{
      const run=await api<SumRun>('/api/sum',{values});
      if(current!==requestId.current)return;
      setResult(run);onRunRef.current(run);
    }catch(e){
      if(current!==requestId.current)return;
      setError(String(e));onRunRef.current({trace:[]});
    }finally{if(current===requestId.current)setBusy(false)}
  };
  useEffect(()=>{void calculate(initialSumValues);return()=>{requestId.current++}},[]);
  const changeText=(value:string)=>{
    requestId.current++;setText(value);setBusy(false);setResult(null);setError('');onRunRef.current({trace:[]});
  };
  const steps=result?.result.steps??[];
  return <section className="preview-panel sum-panel">
    <div className="panel-heading"><div><div className="eyebrow">可操作的真实功能</div><h2>多数字求和</h2></div><span className="calculator-badge">互动演示</span></div>
    <p className="sum-intro">输入至少 3 个数字，看看它们是怎样一步步加起来的。</p>
    <form onSubmit={event=>{event.preventDefault();void calculate(splitSumValues(text))}}>
      <div className="field sum-input"><label htmlFor="sum-values">数字列表 <span>用逗号或换行分隔</span></label><textarea id="sum-values" rows={3} value={text} onChange={event=>changeText(event.target.value)} placeholder="例如 1, 2, 3" spellCheck={false}/></div>
      <button type="submit" className="primary-button full" disabled={busy}>{busy?'正在计算…':'计算总和并观察节点'}</button>
    </form>
    <div className={`sum-result ${error||result?.ui?.tone==='error'?'is-error':''}`} role="status">
      <span>总和</span>
      {error?<strong>{error}</strong>:result?.ui?.tone==='error'?<strong>{result.ui.message}</strong>:typeof result?.result.value==='number'?<strong>{result.result.value}</strong>:<strong className="sum-placeholder">输入数字后计算</strong>}
    </div>
    {steps.length>0&&<div className="sum-process">
      <div className="sum-process-heading"><strong>逐步累加</strong><span>共 {steps.length} 步 · 实际计算结果</span></div>
      <ol className="sum-steps">{steps.map(step=><li key={step.index}><span className="sum-step-index">{String(step.index).padStart(2,'0')}</span><span className="sum-step-equation">{step.previous} <span>+</span> {step.value}</span><strong>= {step.total}</strong></li>)}</ol>
    </div>}
  </section>;
}

type ExpressionStep={index:number;operator:string;operands:number[];result:number};
type ExpressionRun=Run&{result:{status:'success'|'invalid';value?:number;count?:number;total?:number;message:string;steps?:ExpressionStep[]}};
type ExpressionEngine={expression:string;busy:boolean;result:ExpressionRun|null;error:string;steps:ExpressionStep[];calculate:(value:string)=>Promise<void>;changeExpression:(value:string)=>void};
const initialExpression='12 + 3 × (8 - 4) ÷ 2';
function describeExpressionStep(step:ExpressionStep){
  const symbols:Record<string,string>={'+':'+','-':'−','*':'×','/':'÷','u+':'+','u-':'−'};
  const symbol=symbols[step.operator]??step.operator;
  return step.operands.length===1?`${symbol}${step.operands[0]}`:step.operands.join(` ${symbol} `);
}

function useExpressionEngine(enabled:boolean,onRun:(run:Run)=>void,mode:CalculatorMode='expression'):ExpressionEngine{
  const [expression,setExpression]=useState(initialExpression);
  const expressionRef=useRef(expression);expressionRef.current=expression;
  const [busy,setBusy]=useState(true);
  const [result,setResult]=useState<ExpressionRun|null>(null);
  const [error,setError]=useState('');
  const requestId=useRef(0);
  const onRunRef=useRef(onRun);onRunRef.current=onRun;
  const calculate=async(value:string)=>{
    const current=++requestId.current;
    setBusy(true);setError('');setResult(null);
    try{
      const {path,body}=prepareCalculatorRequest(mode,value);
      const run=normalizeCalculatorResult(mode,await api<unknown>(path,body)) as ExpressionRun;
      if(current!==requestId.current)return;
      setResult(run);onRunRef.current(run);
    }catch(e){
      if(current!==requestId.current)return;
      setError(String(e));onRunRef.current({trace:[]});
    }finally{if(current===requestId.current)setBusy(false)}
  };
  useEffect(()=>{if(!enabled)return;void calculate(expressionRef.current);return()=>{requestId.current++}},[enabled,mode]);
  const changeExpression=(value:string)=>{
    requestId.current++;setExpression(value);setBusy(false);setResult(null);setError('');onRunRef.current({trace:[]});
  };
  return {expression,busy,result,error,steps:result?.result.steps??[],calculate,changeExpression};
}

// @need-ids: REQ_EXPR_INPUT, REQ_EXPR_RESULT
export function ExpressionPreview({engine}:{engine:ExpressionEngine}){
  const {expression,busy,result,error,steps,calculate,changeExpression}=engine;
  return <section className="preview-panel expression-panel">
    <div className="panel-heading"><div><div className="eyebrow">可操作的真实功能</div><h2>混合四则运算</h2></div><span className="calculator-badge">互动演示</span></div>
    <p className="expression-intro">输入算式，观察括号和运算优先级如何影响计算顺序。</p>
    <form onSubmit={event=>{event.preventDefault();void calculate(expression)}}>
      <div className="field expression-input"><label htmlFor="expression-value">算式 <span>支持括号、+、-、×、÷</span></label><input id="expression-value" value={expression} onChange={event=>changeExpression(event.target.value)} placeholder="例如 12 + 3 × (8 - 4) ÷ 2" spellCheck={false}/><span className="expression-precision">使用 JavaScript 浮点运算，部分小数可能有舍入误差。</span></div>
      <button type="submit" className="primary-button full" disabled={busy}>{busy?'正在计算…':'计算并观察节点'}</button>
    </form>
    <div className={`expression-result ${error||result?.ui?.tone==='error'?'is-error':''}`} role="status">
      <span>计算结果</span>
      {error?<strong>{error}</strong>:result?.ui?.tone==='error'?<strong>{result.ui.message}</strong>:typeof result?.result.value==='number'?<strong>{result.result.value}</strong>:<strong className="expression-placeholder">输入算式后计算</strong>}
    </div>
    {steps.length>0&&<div className="expression-process">
      <div className="expression-process-heading"><strong>逐步计算</strong><span>共 {steps.length} 步 · 实际执行顺序</span></div>
      <ol className="expression-steps">{steps.map(step=><li key={step.index}><span className="expression-step-index">{String(step.index).padStart(2,'0')}</span><span className="expression-step-equation">{describeExpressionStep(step)}</span><strong>= {step.result}</strong></li>)}</ol>
    </div>}
    {result?.result.status==='success'&&steps.length===0&&<p className="micro">算式直接给出一个数字，无需进行运算。</p>}
  </section>;
}

// @need-ids: REQ_EXPR_INPUT, REQ_EXPR_RESULT, REQ_AVERAGE_ALL
export function ExpressionCalculator({engine,onShowProcess,title='混合运算计算器',inputMode='expression'}:{engine:ExpressionEngine;onShowProcess:()=>void;title?:string;inputMode?:CalculatorMode}){
  const {expression,busy,result,error,calculate,changeExpression}=engine;
  const inputRef=useRef<HTMLInputElement>(null);
  const replace=(next:string,caret:number)=>{
    changeExpression(next);
    requestAnimationFrame(()=>{inputRef.current?.focus();inputRef.current?.setSelectionRange(caret,caret)});
  };
  const insert=(key:string)=>{
    const input=inputRef.current;
    const focused=document.activeElement===input;
    const start=focused?input?.selectionStart??expression.length:expression.length;
    const end=focused?input?.selectionEnd??start:start;
    const complete=result?.result.status==='success'&&typeof result.result.value==='number';
    const atEnd=start===expression.length&&end===expression.length;
    if(complete&&atEnd&&/^[0-9.(]$/.test(key)){replace(key,key.length);return}
    if(complete&&atEnd&&/^[+−×÷]$/.test(key)){
      const next=String(result.result.value)+key;
      replace(next,next.length);return;
    }
    replace(expression.slice(0,start)+key+expression.slice(end),start+key.length);
  };
  const erase=()=>{
    const input=inputRef.current;
    const focused=document.activeElement===input;
    const start=focused?input?.selectionStart??expression.length:expression.length;
    const end=focused?input?.selectionEnd??start:start;
    if(start===end&&start===0)return;
    const removeFrom=start===end?start-1:start;
    replace(expression.slice(0,removeFrom)+expression.slice(end),removeFrom);
  };
  const clear=()=>replace('',0);
  const runCalculation=()=>{onShowProcess();void calculate(expression)};
  const keys=[
    {label:'C',action:clear,kind:'utility',aria:'清除'},
    {label:'⌫',action:erase,kind:'utility',aria:'退格'},
    {label:inputMode==='average'?',':'(',action:()=>insert(inputMode==='average'?',':'('),kind:'utility',aria:inputMode==='average'?'分隔数字':'左括号'},
    {label:inputMode==='average'?'±':')',action:()=>insert(inputMode==='average'?'-':')'),kind:'utility',aria:inputMode==='average'?'负号':'右括号'},
    ...['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','+'].map(label=>({label,action:()=>insert(label),kind:['÷','×','−','+'].includes(label)?'operator':'digit',aria:({'+':'加','−':'减','×':'乘','÷':'除','.':'小数点'} as Record<string,string>)[label]??label})),
  ];
  return <section className="expression-calculator" aria-labelledby="expression-calculator-title">
    <div className="expression-calculator-heading"><div><div className="eyebrow">亲手试一试</div><h2 id="expression-calculator-title">{title}</h2></div><span>支持键盘输入</span></div>
    <form onSubmit={event=>{event.preventDefault();runCalculation()}}>
      <div className="expression-calculator-display">
        <label htmlFor="expression-calculator-input">{inputMode==='average'?'数字列表':'算式'}</label>
        <input ref={inputRef} id="expression-calculator-input" aria-label="计算器算式" value={expression} onChange={event=>changeExpression(event.target.value)} onKeyDown={event=>{if(event.key==='='){event.preventDefault();runCalculation()}else if(event.key==='Escape'){event.preventDefault();clear()}}} placeholder={inputMode==='average'?'例如 1, 2, 3':'输入算式'} spellCheck={false}/>
        <div className={`expression-calculator-output ${error||result?.ui?.tone==='error'?'is-error':''}`} role="status">
          {error?error:result?.ui?.tone==='error'?result.ui.message:typeof result?.result.value==='number'?String(result.result.value):'等待计算'}
        </div>
      </div>
      <div className="expression-calculator-keys">
        {keys.map(key=><button key={key.label} type="button" className={`expression-calculator-key ${key.kind}`} aria-label={key.aria} onMouseDown={event=>event.preventDefault()} onClick={key.action}>{key.label}</button>)}
        <button type="submit" className="expression-calculator-key equals" aria-label="计算结果" disabled={busy}>=</button>
      </div>
    </form>
    <p className="expression-calculator-hint">{inputMode==='average'?'数字用逗号或加号分隔。':'按所选模式计算。'}Enter 或 = 计算，Esc 清空。小数可能有浮点舍入误差。</p>
  </section>;
}


export function CalculatorClient({feature,onRun,openRequest}:FeaturePanelProps){
  const mode=feature.frontend.mode;
  const [suiteMode,setSuiteMode]=useState<CalculatorMode>('expression');
  const modeInputs=useRef<Partial<Record<CalculatorMode,string>>>({expression:initialExpression});
  const report=(run:Run)=>{
    const actual=run.trace??[];
    if(mode==='suite'&&actual.length&&run.result){
      const marker=(nodeId:string,status:'ok'|'rejected'):Step=>({nodeId,input:null,output:null,elapsedMs:0,status,derived:true});
      onRun({...run,trace:[marker('suite-input','ok'),...actual,marker('suite-compute',run.result.status==='success'?'ok':'rejected'),marker('suite-result','ok')]});
    }else onRun(run);
  };
  const expressionEngine=useExpressionEngine(mode==='expression'||mode==='suite',report,mode==='suite'?suiteMode:'expression');
  const changeCalculationMode=(next:CalculatorMode,exampleValue?:string)=>{
    if(next===suiteMode){if(exampleValue!==undefined){expressionEngine.changeExpression(exampleValue);void expressionEngine.calculate(exampleValue)}return}
    modeInputs.current[suiteMode]=expressionEngine.expression;
    const defaults:Record<CalculatorMode,string>={expression:initialExpression,sum:'1+2+3',calculator:'1+2',average:'1, 2, 3'};
    expressionEngine.changeExpression(exampleValue??modeInputs.current[next]??defaults[next]);setSuiteMode(next);onRun({trace:[]});
  };

  useEffect(()=>{
    const next=openRequest?.mode;
    if(next&&['average','expression','sum','calculator'].includes(next))changeCalculationMode(next as CalculatorMode);
  },[openRequest?.sequence]);
  if(mode==='calculator')return <CalculatorPreview onRun={onRun}/>;
  if(mode==='sum')return <SumPreview onRun={onRun}/>;
  if(mode==='expression')return <><ExpressionCalculator engine={expressionEngine} onShowProcess={()=>undefined}/><ExpressionPreview engine={expressionEngine}/></>;
  if(mode!=='suite')return <div className="notice notice-error" role="alert">未登记的计算器模式：{mode}</div>;
  return <div className="suite-calculator"><div className="suite-calculator-heading"><div><div className="eyebrow">真实执行 · 查看过程</div><h2>计算器</h2></div><div className="suite-modes" role="group" aria-label="计算方式">{(['expression','sum','calculator','average'] as const).map(m=><button key={m} aria-pressed={suiteMode===m} onClick={()=>changeCalculationMode(m)}>{m==='expression'?'混合运算':m==='sum'?'多数字求和':m==='average'?'平均值':'两数运算'}</button>)}</div></div>
          <div className="suite-examples"><span>示例</span>{([{label:'1 + 2',mode:'calculator',value:'1+2'},{label:'1 + 2 + 3',mode:'sum',value:'1+2+3'},{label:'1 加到 20',mode:'sum',value:Array.from({length:20},(_,i)=>i+1).join('+')},{label:'20 个数求平均',mode:'average',value:Array.from({length:20},(_,i)=>i+1).join(', ')},{label:'括号与优先级',mode:'expression',value:'12+3×(8-4)÷2'}] as const).map(x=><button key={x.label} onClick={()=>changeCalculationMode(x.mode,x.value)}>{x.label}</button>)}</div>
          <p className="suite-mode-hint">{suiteMode==='sum'?'至少三个数字，用 + 连接；逐项累加。':suiteMode==='calculator'?'输入两个数字和一个运算符。':suiteMode==='average'?'一个或多个数字，用逗号或 + 分隔；展示数量、总和与平均值。':'支持括号及加减乘除，按优先级计算。'}</p>
          <ExpressionCalculator engine={expressionEngine} title={suiteMode==='average'?'平均值':'算式'} inputMode={suiteMode} onShowProcess={()=>undefined}/>
          {suiteMode==='average'&&expressionEngine.result?.result.status==='success'&&<dl className="average-summary"><div><dt>数字数量</dt><dd>{expressionEngine.result.result.count}</dd></div><div><dt>总和</dt><dd>{expressionEngine.result.result.total}</dd></div><div><dt>平均值</dt><dd>{expressionEngine.result.result.value}</dd></div></dl>}
          {expressionEngine.steps.length>0&&<div className="suite-process"><div className="expression-process-heading"><strong>{suiteMode==='sum'?'逐项累加':'计算过程'}</strong><span>共 {expressionEngine.steps.length} 步 · 实际执行顺序</span></div><ol className="expression-steps">{expressionEngine.steps.map(step=><li key={step.index}><span className="expression-step-index">{String(step.index).padStart(2,'0')}</span><span className="expression-step-equation">{describeExpressionStep(step)}</span><strong>= {step.result}</strong></li>)}</ol></div>}
        </div>;
}
function calculatorLayout(graph:Graph,collapsed:Set<string>,seed:Graph):GraphLayout{
  if(graph.feature.id!=='calculator.suite')return {offsets:new Map(),sizes:new Map()};
    const offsets=new Map<string,{x:number;y:number}>();
    const children=graph.nodes.filter(n=>n.parentId==='suite-compute').sort((a,b)=>a.position.y-b.position.y);
    let computeWidth=870,computeHeight=285;
    if(children.length<=4&&children.every(n=>['calculator','sum','expression','average'].includes(n.id)&&collapsed.has(n.id))){
      computeWidth=650;
      for(const n of children){const i=children.indexOf(n);const initial=seed.nodes.find(x=>x.id===n.id)!;const delta={x:initial.position.x-(25+(i%2)*290),y:initial.position.y-(85+Math.floor(i/2)*170)};offsets.set(n.id,delta);computeWidth=Math.max(computeWidth,n.position.x-delta.x+295);computeHeight=Math.max(computeHeight,n.position.y-delta.y+185)}
    }else{
      let offset=0;computeWidth=500;computeHeight=250;
      for(const n of children){offsets.set(n.id,{x:0,y:offset});const has=graph.nodes.some(c=>c.parentId===n.id),folded=has&&collapsed.has(n.id);const h=has&&!folded?(n.size?.height??415):n.kind==='group'?120:116;const w=has&&!folded?(n.size?.width??970):n.kind==='group'?230:176;computeWidth=Math.max(computeWidth,n.position.x+w+65);computeHeight=Math.max(computeHeight,n.position.y-offset+h+65);if(folded)offset+=Math.max(0,(n.size?.height??415)-120)}
    }
    const expanded=!collapsed.has('suite-compute');const groupWidth=expanded?computeWidth:230,groupHeight=expanded?computeHeight:120;
    const targets:Record<string,{x:number;y:number}>={'suite-input':{x:30,y:135},'suite-compute':{x:260,y:85},'suite-result':{x:260+groupWidth+60,y:135}};
    let width=260+groupWidth+300,height=Math.max(285,groupHeight+160);
    for(const n of graph.nodes.filter(x=>x.parentId==='suite')){
      const target=targets[n.id];const initial=seed.nodes.find(x=>x.id===n.id);
      if(target&&initial){const delta={x:initial.position.x-target.x,y:initial.position.y-target.y};offsets.set(n.id,delta);width=Math.max(width,n.position.x-delta.x+(n.id==='suite-compute'?groupWidth:176)+65);height=Math.max(height,n.position.y-delta.y+(n.id==='suite-compute'?groupHeight:116)+65)}
      else {width=Math.max(width,n.position.x+(n.size?.width??176)+65);height=Math.max(height,n.position.y+(n.size?.height??116)+65)}
    }
    return {offsets,sizes:new Map([['suite',{width,height}],['suite-compute',{width:computeWidth,height:computeHeight}]])};
}
const client:FeatureClient={
  Panel:CalculatorClient,
  initialCollapsed:feature=>feature.frontend.mode==='suite'?['suite-compute','calculator','sum','expression','expr-compute','average']:feature.frontend.mode==='expression'?['expr-compute']:[],
  layout:calculatorLayout
};
export default client;
