// A real TypeScript adapter; compiled on demand by the TypeScript compiler.
declare const process: any;
type Feedback = {title:string;category:string;detail:string};
type Result = {status:'valid';input:Feedback}|{status:'invalid';code:string;message:string};
let text='';
process.stdin.setEncoding('utf8');
process.stdin.on('data',(chunk:string)=>{text+=chunk});
process.stdin.on('end',()=>{
  const value=JSON.parse(text);
  const form:Feedback={title:String(value.title??'').trim(),category:String(value.category??'').trim(),detail:String(value.detail??'').trim()};
  let result:Result;
  if([...form.title].length<3||[...form.title].length>60)result={status:'invalid',code:'INVALID_TITLE',message:'标题需为 3–60 字。'};
  else if(!['feature','bug','other'].includes(form.category))result={status:'invalid',code:'INVALID_CATEGORY',message:'请选择合法分类。'};
  else if([...form.detail].length>500)result={status:'invalid',code:'INVALID_DETAIL',message:'内容不能超过 500 字。'};
  else result={status:'valid',input:form};
  process.stdout.write(JSON.stringify(result)+'\n');
});
