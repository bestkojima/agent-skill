import type { FeatureCatalog } from './feature-client';
import type { Capability } from './CapabilityPanel';

export function resolveFeature(catalog:FeatureCatalog, requested:string|null, previous:string|null) {
  const exact=catalog.features.find(feature=>feature.alias===requested||feature.id===requested);
  if(exact)return exact;
  const fallback=catalog.features.find(feature=>feature.alias===catalog.defaultFeature)||catalog.features[0];
  const remembered=catalog.features.find(feature=>feature.alias===previous);
  return remembered?catalog.features.find(feature=>feature.frontend.entry===remembered.frontend.entry)??fallback:fallback;
}

export function visibleFeatures(catalog:FeatureCatalog, current:string) {
  const entries=new Set();
  return catalog.features.filter(feature=>{
    const first=!entries.has(feature.frontend.entry);entries.add(feature.frontend.entry);
    return first||feature.alias===current;
  });
}

export function capabilityDestination(catalog:FeatureCatalog, capability:Capability) {
  const target=capability.frontend;
  if(!target)return undefined;
  return catalog.features.find(feature=>feature.alias===target.feature&&feature.frontend.entry===target.entry)
    ??catalog.features.find(feature=>feature.frontend.entry===target.entry);
}
