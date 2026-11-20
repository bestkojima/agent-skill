import { featureRegistry } from '../server/feature-registry.ts';

// Register the legacy source pair for the fixture, then restore the real view
// before another test calls the calculator's HTTP endpoints.
export function useLegacyContractFixture(t) {
  const feature=featureRegistry.defaultTrace;
  const {requirementsSource,publishedTests}=feature;
  feature.requirementFile='project/calculator/requirements.json';
  feature.rstFile='traceability/python-calculator-view.rst';
  delete feature.requirementsSource;
  delete feature.publishedTests;
  t.after(()=>{
    delete feature.requirementFile;
    delete feature.rstFile;
    Object.assign(feature,{requirementsSource,publishedTests});
  });
}
