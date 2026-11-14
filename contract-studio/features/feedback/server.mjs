import { createStore, runSubmission, testNode } from '../../server/domain.mjs';
import { adapterSource, supportedAdapters, listAdapters, runAdapter } from '../../server/adapters/index.mjs';
let store=createStore();
const languageFor=body=>{const language=body.language??'javascript';if(!supportedAdapters.some(adapter=>adapter.id===language))throw Error('Unsupported backend adapter');return language;};
const submit=(form,body)=>{const language=languageFor(body);return runSubmission(form,{store,mode:body.mode,validator:async raw=>(await runAdapter(language,raw,{mode:'dry-run'})).output,validatorLabel:language});};
const features=[{id:'feedback.submit',alias:'feedback',title:'反馈工单',rootNodeId:'submit',defaultSelected:'lookup',defaultTrace:true,
  graphFile:'contracts/feedback.json',requirementFile:'contracts/requirements.json',rstFile:'traceability/requirements.rst',
  frontend:{entry:'feedback',feature:'feedback',component:'FeedbackPreview',path:'features/feedback/client.tsx',mode:'feedback'},
  draftKeys:{graph:'contract-studio-adapters-v03',base:'contract-studio-project-graph-base-v1',pending:'contract-studio-project-graph-pending-v1',requirements:'contract-studio-requirement-drafts-v1'}
}];
const capabilities=[
  { id:'feedback.submit', title:'反馈工单', rootNodeId:'submit',
    nodeIds:['submit','form','validate','lookup','save','view'],
    runPath:'/api/submit', testPath:'/api/test', frontend:{entry:'feedback',feature:'feedback',component:'FeedbackPreview',path:'features/feedback/client.tsx',mode:'feedback'},
    testFiles:['tests/domain.test.mjs'] }
];
const routes=[
  {method:'GET',path:'/api/adapters',handle:async()=>({adapters:await listAdapters()})},
  {method:'GET',path:'/api/items',handle:()=>({items:store.items})},
  {method:'POST',path:'/api/submit',handle:body=>submit(body.form,body)},
  {method:'POST',path:'/api/test',handle:body=>{
    if(body.nodeId==='submit'&&body.mode&&body.mode!=='mock')return submit(body.input,body);
    if(body.nodeId==='validate')return runAdapter(body.language??'javascript',body.input,{mode:body.mode}).then(result=>({nodeId:'validate',...result}));
    return testNode(body.nodeId,body.input,body.mode,store);
  }},
  {method:'POST',path:'/api/reset',handle:()=>{store=createStore();return {items:store.items};}}
];
const codeOverride=(nodeId,url)=>{
  if(nodeId!=='validate'||!url.searchParams.has('language'))return undefined;
  const file=adapterSource(url.searchParams.get('language'));
  return file?{symbol:'feedback.validate',absoluteFile:file,wholeFile:true}:null;
};
export default {id:'feedback',features,capabilities,routes,codeOverride};
