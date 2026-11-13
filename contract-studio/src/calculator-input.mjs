// Build requests from the one calculator input without evaluating expressions in the browser.
const numberPattern = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
const sumPattern = new RegExp(`^\\s*${numberPattern}(?:\\s*\\+\\s*${numberPattern})*\\s*$`);
const twoNumberPattern = new RegExp(`^\\s*(${numberPattern})\\s*([+*/-])\\s*(${numberPattern})\\s*$`);

export function prepareCalculatorRequest(mode, expression) {
  if (mode === 'expression') return { path: '/api/expression', body: { expression } };
  const normalized = expression.replaceAll('−', '-');
  if (mode === 'average') {
    // Keep empty/invalid entries so the backend can explain the actual failing input.
    const text = normalized.trim();
    const values = !text ? [] : /[,，;；\n]/.test(text)
      ? text.split(/[,，;；\n]/).map(value => value.trim())
      : sumPattern.test(text)
        ? text.match(new RegExp(numberPattern, 'g')) ?? []
        : text.split(/\s+/);
    return { path: '/api/average', body: { values } };
  }
  if (mode === 'sum') {
    if (!sumPattern.test(normalized)) throw Error('多数字求和只接受用加号连接的数字，例如 1+2+3。');
    return { path: '/api/sum', body: { values: normalized.match(new RegExp(numberPattern, 'g')) ?? [] } };
  }
  if (mode === 'calculator') {
    const parts = normalized.replaceAll('×', '*').replaceAll('÷', '/').match(twoNumberPattern);
    if (!parts) throw Error('两数运算请输入两个数字与一个运算符，例如 12÷3。');
    return { path: '/api/calculator', body: { left: parts[1], operator: parts[2], right: parts[3] } };
  }
  throw Error('未知的计算方式。');
}

// Sum API returns accumulation records. Adapt only their representation, not their values.
export function normalizeCalculatorResult(mode, run) {
  if (mode !== 'sum') return run;
  return {
    ...run,
    result: {
      ...run.result,
      steps: run.result.steps?.map(s => ({ index: s.index, operator: '+', operands: [s.previous, s.value], result: s.total }))
    }
  };
}
