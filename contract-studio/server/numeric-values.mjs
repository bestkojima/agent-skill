// Shared numeric-list rules; each feature keeps its own minimum count.
// @need-ids: REQ_SUM_VALIDATE, REQ_AVERAGE_VALIDATE
export function parseFiniteValues(rawValues) {
  const values = [];
  for (let i = 0; i < rawValues.length; i++) {
    const value = rawValues[i];
    if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
      return { status: 'invalid', message: `第 ${i + 1} 项为空或不是有效数字。` };
    }
    const text = String(value).trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
      return { status: 'invalid', message: `第 ${i + 1} 项不是有效数字。` };
    }
    const number = Number(text);
    if (!Number.isFinite(number)) return { status: 'invalid', message: `第 ${i + 1} 项超出可表示的数值范围。` };
    values.push(number);
  }
  return { status: 'valid', input: { values } };
}

// Input values have already passed the feature's numeric and count validation.
// @need-ids: REQ_SUM_ACCUMULATE, REQ_AVERAGE_ACCUMULATE
export function accumulateValues(values) {
  let total = 0;
  const steps = [];
  for (const [i, value] of values.entries()) {
    const previous = total;
    const next = previous + value;
    if (!Number.isFinite(next)) {
      return { status: 'invalid', message: `累加第 ${i + 1} 项后结果超出可表示的数值范围。`, steps };
    }
    total = next;
    steps.push({ index: i + 1, value, previous, total });
  }
  return { status: 'success', total, steps };
}
