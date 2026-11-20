import { exportNeeds } from '../server/traceability.mjs';
await exportNeeds();
await exportNeeds(undefined, 'calculator.suite');
console.log('Sphinx-Needs 视图已从需求和已保存的功能图同步。');
