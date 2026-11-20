// The Needs index owns test meaning; CodeLinks owns its source location.
// A runtime test name starts with [<need ID>] so reports need no name/file side table.
export function testIdFromName(name) {
  return /^\[([A-Za-z][A-Za-z0-9_.-]*)\](?:\s|$)/.exec(name??'')?.[1]??null;
}

const partId=id=>id.startsWith('PART_')&&/^PART_(?:[A-F0-9]{2})+$/.test(id)
  ? Buffer.from(id.slice(5),'hex').toString('utf8') : id;

export function indexedTestCases(needs,entities) {
  return Object.values(needs).filter(need=>need.type==='test').map(need=>{
    const declarations=entities.filter(entity=>entity.declarations?.some(item=>item.needId===need.id));
    // A native declaration owns the test. References elsewhere can link to it
    // without becoming another executable source location.
    const sources=declarations.length?declarations:entities.filter(entity=>entity.needIds.includes(need.id));
    const files=[...new Set(sources.map(source=>source.path))].sort();
    const markers=declarations.flatMap(entity=>entity.declarations
      .filter(item=>item.needId===need.id).map(item=>({path:entity.path,line:item.line,symbol:entity.symbol,source:entity.source})));
    const sourceState=markers.length>1||files.length>1?'ambiguous':files.length===1?'resolved':'missing';
    const reference=markers.length===1&&markers[0].symbol?markers[0]:null;
    const states=[...new Set(sources.map(source=>source.indexState))];
    const indexState=states.length===1?states[0]:states.length?'mixed':'missing';
    const targets=need.verifies??[];
    const specIds=targets.filter(id=>needs[id]?.type==='spec');
    return {id:need.id,name:need.title,file:files.length===1?files[0]:null,files,sourceState,indexState,specIds,reference,
      verifies:targets.filter(id=>!specIds.includes(id)).map(needId=>{
        const separator=needId.lastIndexOf('.');
        const requirementId=Object.hasOwn(needs,needId)?needId:separator<0?needId:needId.slice(0,separator);
        const part=requirementId===needId?null:needId.slice(separator+1);
        return {requirementId,acceptanceId:part===null?null:partId(part),needId,
          state:needs[requirementId]&&(part===null||needs[requirementId].parts?.[part])?'linked':'missing-acceptance'};
      })};
  });
}
