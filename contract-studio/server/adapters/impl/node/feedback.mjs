let input='';for await (const chunk of process.stdin) input+=chunk;
const value=JSON.parse(input);
const form={title:String(value.title??'').trim(),category:String(value.category??'').trim(),detail:String(value.detail??'').trim()};
let out;if([...form.title].length<3||[...form.title].length>60)out={status:'invalid',code:'INVALID_TITLE',message:'标题需为 3–60 字。'};
else if(!['feature','bug','other'].includes(form.category))out={status:'invalid',code:'INVALID_CATEGORY',message:'请选择合法分类。'};
else if([...form.detail].length>500)out={status:'invalid',code:'INVALID_DETAIL',message:'内容不能超过 500 字。'};
else out={status:'valid',input:form};
process.stdout.write(JSON.stringify(out)+'\n');
