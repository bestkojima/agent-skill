import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import calculator from '../features/calculator/server.mjs';
import feedback from '../features/feedback/server.mjs';
import { readNeedsIndex } from './needs-index.mjs';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

// Add a reviewed feature bundle here. Neither graph data nor HTTP can add handlers.
export function createFeatureRegistry(bundles) {
  const features=bundles.flatMap(bundle=>bundle.features??[]);
  const capabilities=bundles.flatMap(bundle=>bundle.capabilities??[]);
  const routes=bundles.flatMap(bundle=>bundle.routes??[]);
  const trials=bundles.flatMap(bundle=>bundle.trials??[]);
  const unique=(items,key,label)=>{
    const seen=new Set();
    for(const item of items){const value=key(item);if(!value||seen.has(value))throw Error(`Duplicate or missing ${label}: ${value}`);seen.add(value);}
  };
  unique(features,item=>item.id,'feature ID');unique(features,item=>item.alias,'feature alias');
  unique(capabilities,item=>item.id,'capability ID');unique(routes,item=>`${item.method} ${item.path}`,'route');
  const resolveFeature=value=>features.find(feature=>feature.id===value||feature.alias===value);
  for(const feature of features)for(const source of feature.requirementSources??[])if(!resolveFeature(source))throw Error(`Unknown requirement source: ${source}`);
  for(const cap of capabilities){
    if(!routes.some(route=>route.path===cap.runPath&&route.method==='POST')||!routes.some(route=>route.path===cap.testPath&&route.method==='POST'))throw Error(`Missing trusted routes: ${cap.id}`);
    if(cap.frontend&&!resolveFeature(cap.frontend.feature))throw Error(`Unknown frontend feature: ${cap.id}`);
  }
  return {
    features,capabilities,resolveFeature,
    trials,
    defaultFeature:features.find(feature=>feature.defaultUi)??features[0],
    defaultTrace:features.find(feature=>feature.defaultTrace)??features[0],
    route:(method,url)=>routes.find(route=>route.method===method&&route.path===url),
    sourceOverride(nodeId,url){
      for(const bundle of bundles){const override=bundle.codeOverride?.(nodeId,url);if(override!==undefined)return override;}
      return undefined;
    }
  };
}

export const featureRegistry=createFeatureRegistry([calculator,feedback]);

export async function featureCatalog(root=projectRoot) {
  const [{indexedCapabilities},{readProjectedGraph}]=await Promise.all([import('./capabilities.mjs'),import('./needs-projection.mjs')]);
  return {
    defaultFeature:featureRegistry.defaultFeature.alias,
    features:await Promise.all(featureRegistry.features.map(async feature=>({...structuredClone(feature),graph:await readProjectedGraph(root,feature)}))),
    capabilities:await indexedCapabilities(root)
  };
}

export async function featureSource(nodeId,url,root=projectRoot) {
  const override=featureRegistry.sourceOverride(nodeId,url);
  if(override!==undefined){
    if(!override)return null;
    const source=await fs.readFile(override.absoluteFile,'utf8');
    return {symbol:override.symbol,file:path.relative(root,override.absoluteFile).replaceAll('\\','/'),excerpt:source.slice(0,6000)};
  }
  if(typeof nodeId!=='string'||!nodeId)return null;
  const {index,needs,entities}=await readNeedsIndex(root);
  if(index.state!=='current')return null;
  const {entitySpecIds,nodeNeedId}=await import('./backend-relations.mjs');
  const possibleIds=new Set([nodeId,...featureRegistry.features.map(feature=>nodeNeedId(nodeId,feature))]);
  const specs=Object.values(needs).filter(need=>need.type==='spec'&&(need.node_id===nodeId||possibleIds.has(need.id)));
  const ids=new Set(specs.map(need=>need.id));
  let candidates=entities.filter(entity=>entity.symbol&&entitySpecIds(entity,needs).some(id=>ids.has(id)));
  let relationSource='spec-marker';
  if(!candidates.length){
    // Legacy requirement-only references remain navigable, without claiming a direct node binding.
    const requirements=new Set(specs.flatMap(need=>need.fulfills??[]));
    candidates=entities.filter(entity=>entity.symbol&&!entity.path.startsWith('tests/')&&entity.needIds.some(id=>requirements.has(id)));
    if(candidates.length!==1)return null;
    relationSource='requirement-reference';
  }
  const unique=[...new Map(candidates.map(entity=>[`${entity.path}:${entity.startLine}:${entity.endLine}`,entity])).values()];
  const entity=unique[0];
  const source=await fs.readFile(path.join(root,entity.path),'utf8');
  return {symbol:entity.symbol,file:entity.path,startLine:entity.startLine,endLine:entity.endLine,relationSource,
    excerpt:source.split(/\r?\n/).slice(entity.startLine-1,entity.endLine).join('\n').slice(0,4600),
    references:unique.map(({path,symbol,startLine,endLine})=>({path,symbol,startLine,endLine}))};
}
