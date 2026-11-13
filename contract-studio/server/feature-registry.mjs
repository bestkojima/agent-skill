import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import calculator from '../features/calculator/server.mjs';
import feedback from '../features/feedback/server.mjs';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

// Add a reviewed feature bundle here. Neither graph data nor HTTP can add handlers.
export function createFeatureRegistry(bundles) {
  const features=bundles.flatMap(bundle=>bundle.features??[]);
  const capabilities=bundles.flatMap(bundle=>bundle.capabilities??[]);
  const routes=bundles.flatMap(bundle=>bundle.routes??[]);
  const code=bundles.flatMap(bundle=>bundle.code??[]);
  const calls=bundles.flatMap(bundle=>bundle.calls??[]);
  const trials=bundles.flatMap(bundle=>bundle.trials??[]);
  const unique=(items,key,label)=>{
    const seen=new Set();
    for(const item of items){const value=key(item);if(!value||seen.has(value))throw Error(`Duplicate or missing ${label}: ${value}`);seen.add(value);}
  };
  unique(features,item=>item.id,'feature ID');unique(features,item=>item.alias,'feature alias');
  unique(capabilities,item=>item.id,'capability ID');unique(routes,item=>`${item.method} ${item.path}`,'route');unique(code,item=>item.nodeId,'source node');
  const resolveFeature=value=>features.find(feature=>feature.id===value||feature.alias===value);
  for(const feature of features)for(const source of feature.requirementSources??[])if(!resolveFeature(source))throw Error(`Unknown requirement source: ${source}`);
  for(const cap of capabilities){
    if(!routes.some(route=>route.path===cap.runPath&&route.method==='POST')||!routes.some(route=>route.path===cap.testPath&&route.method==='POST'))throw Error(`Missing trusted routes: ${cap.id}`);
    if(cap.frontend&&!resolveFeature(cap.frontend.feature))throw Error(`Unknown frontend feature: ${cap.id}`);
  }
  return {
    features,capabilities,resolveFeature,
    calls,trials,
    implementationFor(node,capability){
      if(!capability)return [];
      const id=capability.nodeIds?.includes(node.id)?node.id:capability.rootNodeId;
      const ref=code.find(item=>item.nodeId===id);
      return ref ? (ref.functions??[{path:ref.file,symbol:ref.symbol}]) : [];
    },
    defaultFeature:features.find(feature=>feature.defaultUi)??features[0],
    defaultTrace:features.find(feature=>feature.defaultTrace)??features[0],
    route:(method,url)=>routes.find(route=>route.method===method&&route.path===url),
    codeReference(nodeId,url){
      for(const bundle of bundles){const override=bundle.codeOverride?.(nodeId,url);if(override!==undefined)return override;}
      return code.find(ref=>ref.nodeId===nodeId);
    }
  };
}

export const featureRegistry=createFeatureRegistry([calculator,feedback]);

export async function featureCatalog(root=projectRoot) {
  return {
    defaultFeature:featureRegistry.defaultFeature.alias,
    features:await Promise.all(featureRegistry.features.map(async feature=>({...structuredClone(feature),graph:JSON.parse(await fs.readFile(path.join(root,feature.graphFile),'utf8'))}))),
    capabilities:structuredClone(featureRegistry.capabilities)
  };
}

export async function featureSource(nodeId,url,root=projectRoot) {
  const ref=featureRegistry.codeReference(nodeId,url);
  if(!ref)return null;
  const absolute=ref.absoluteFile??path.join(root,ref.file);
  const source=await fs.readFile(absolute,'utf8');
  const file=path.relative(root,absolute).replaceAll('\\','/');
  if(ref.wholeFile)return {symbol:ref.symbol,file,excerpt:source.slice(0,6000)};
  const escaped=ref.symbol.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const declaration=new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${escaped}\\s*\\(`).exec(source);
  const start=declaration?.index??-1;
  const next=start<0?-1:source.slice(start+declaration[0].length).search(/\n(?:export\s+)?(?:async\s+)?function\s|\nexport\s/);
  const end=next<0?undefined:start+declaration[0].length+next;
  return {symbol:ref.symbol,file,excerpt:start<0?'Not found':source.slice(start,end).trim().slice(0,4600)};
}
