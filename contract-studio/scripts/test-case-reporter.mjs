// Used alongside TAP: only Node's completed test events become per-case evidence.
export default async function* testCaseReporter(source) {
  for await (const { type, data } of source) {
    if (!['test:pass', 'test:fail'].includes(type) || data.details?.type === 'suite') continue;
    const skipped = Boolean(data.skip || data.todo);
    const error = data.details?.error;
    yield JSON.stringify({
      name: data.name, file: data.file, line: data.line,
      state: skipped ? 'skipped' : type === 'test:pass' ? 'passed' : 'failed',
      durationMs: data.details?.duration_ms,
      message: skipped ? String(data.skip || data.todo) : error?.cause?.message || error?.message,
    }) + '\n';
  }
}
