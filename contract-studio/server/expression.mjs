function problem(position, message) {
  return { status: 'invalid', position, message: '第 ' + position + ' 位：' + message };
}

// @need-ids: REQ_EXPR_INPUT
export function captureExpressionInput(raw) {
  return { status: 'received', draft: raw && typeof raw === 'object' ? raw : {} };
}

// @need-ids: REQ_EXPR_TOKENIZE
export function tokenizeExpression(expression) {
  if (typeof expression !== 'string' || !expression.trim()) return problem(1, '请输入表达式。');
  const tokens = [];
  for (let i = 0; i < expression.length;) {
    const char = expression[i];
    if (/\s/.test(char)) { i++; continue; }
    const position = i + 1;
    if ('+-−*/×÷()'.includes(char)) {
      tokens.push({ type: char === '(' ? 'left' : char === ')' ? 'right' : 'operator',
        value: char === '×' ? '*' : char === '÷' ? '/' : char === '−' ? '-' : char, position });
      i++;
      continue;
    }
    const number = expression.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (!number) return problem(position, '不支持的字符“' + char + '”。');
    const value = Number(number[0]);
    if (!Number.isFinite(value)) return problem(position, '数字超出可表示范围。');
    tokens.push({ type: 'number', value, position });
    i += number[0].length;
  }
  return { status: 'valid', tokens };
}

// @need-ids: REQ_EXPR_PARSE
export function parseExpression(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return problem(1, '请输入表达式。');
  const output = [];
  const operators = [];
  let expectingOperand = true;
  const precedence = op => op === 'u+' || op === 'u-' ? 3 : op === '*' || op === '/' ? 2 : 1;
  for (const token of tokens) {
    if (token.type === 'number') {
      if (!expectingOperand) return problem(token.position, '数字前缺少运算符。');
      output.push(token);
      expectingOperand = false;
    } else if (token.type === 'left') {
      if (!expectingOperand) return problem(token.position, '左括号前缺少运算符。');
      operators.push(token);
    } else if (token.type === 'right') {
      if (expectingOperand) return problem(token.position, '右括号前缺少数字或表达式。');
      while (operators.length && operators.at(-1).type !== 'left') output.push(operators.pop());
      if (!operators.length) return problem(token.position, '右括号没有匹配的左括号。');
      operators.pop();
      expectingOperand = false;
    } else if (token.type === 'operator') {
      if (expectingOperand) {
        if (token.value !== '+' && token.value !== '-') return problem(token.position, '这里需要数字或左括号。');
        // Consecutive unary signs associate right-to-left: --3 is -(-3).
        operators.push({ ...token, value: 'u' + token.value });
      } else {
        while (operators.length && operators.at(-1).type === 'operator' &&
               precedence(operators.at(-1).value) >= precedence(token.value)) output.push(operators.pop());
        operators.push(token);
        expectingOperand = true;
      }
    } else return problem(token.position ?? 1, '无法识别的内容。');
  }
  if (expectingOperand) return problem(tokens.at(-1).position + 1, '表达式末尾缺少数字或右括号。');
  while (operators.length) {
    const token = operators.pop();
    if (token.type === 'left') return problem(token.position, '左括号没有匹配的右括号。');
    output.push(token);
  }
  return { status: 'valid', rpn: output };
}

// @need-ids: REQ_EXPR_EVALUATE
export function evaluateExpression(rpn) {
  const values = [];
  const steps = [];
  for (const token of rpn) {
    if (token.type === 'number') { values.push(token.value); continue; }
    const unary = token.value === 'u+' || token.value === 'u-';
    if (values.length < (unary ? 1 : 2)) return problem(token.position, '运算缺少数字。');
    let operands;
    let result;
    if (unary) {
      const value = values.pop();
      operands = [value];
      result = token.value === 'u-' ? -value : value;
    } else {
      const right = values.pop();
      const left = values.pop();
      operands = [left, right];
      if (token.value === '/' && right === 0) return { ...problem(token.position, '除数不能为零。'), steps };
      if (token.value === '+') result = left + right;
      else if (token.value === '-') result = left - right;
      else if (token.value === '*') result = left * right;
      else if (token.value === '/') result = left / right;
      else return { ...problem(token.position, '不支持的运算符。'), steps };
    }
    if (!Number.isFinite(result)) return { ...problem(token.position, '运算结果超出可表示范围。'), steps };
    steps.push({ index: steps.length + 1, operator: token.value, operands, result });
    values.push(result);
  }
  if (values.length !== 1) return problem(1, '表达式不完整。');
  return { status: 'success', value: values[0], message: '计算结果：' + values[0], steps };
}

// @need-ids: REQ_EXPR_COMPUTE
export async function runExpressionCompute(raw) {
  const trace = [];
  async function stage(nodeId, input, fn) {
    const start = performance.now();
    const output = await fn();
    trace.push({ nodeId, input, output, status: output.status === 'invalid' ? 'rejected' : 'ok',
      elapsedMs: Math.round(performance.now() - start) });
    return output;
  }
  const tokens = await stage('expr-tokenize', raw, () => tokenizeExpression(raw?.expression));
  if (tokens.status === 'invalid') return { result: tokens, trace };
  const parsed = await stage('expr-parse', tokens.tokens, () => parseExpression(tokens.tokens));
  if (parsed.status === 'invalid') return { result: parsed, trace };
  const result = await stage('expr-evaluate', parsed.rpn, () => evaluateExpression(parsed.rpn));
  return { result, trace };
}

// @need-ids: REQ_EXPR_RESULT
export function expressionUi(result) {
  return { tone: result.status === 'success' ? 'success' : 'error', message: result.message };
}

// @need-ids: REQ_EXPR_ALL
export async function runExpression(raw, mode = 'dry-run') {
  if (!['dry-run', 'sandbox'].includes(mode)) throw Error('Unknown mode');
  const startInput = performance.now();
  const collected = captureExpressionInput(raw);
  const trace = [{ nodeId:'expr-input', input:raw, output:collected, status:'ok',
    elapsedMs:Math.round(performance.now() - startInput) }];
  const startCompute = performance.now();
  const computed = await runExpressionCompute(collected.draft);
  trace.push(...computed.trace);
  trace.push({ nodeId:'expr-compute', input:collected.draft, output:computed.result,
    status:computed.result.status === 'invalid' ? 'rejected' : 'ok',
    elapsedMs:Math.round(performance.now() - startCompute) });
  const startResult = performance.now();
  const ui = expressionUi(computed.result);
  trace.push({ nodeId:'expr-result', input:computed.result, output:ui, status:'ok',
    elapsedMs:Math.round(performance.now() - startResult) });
  return { mode, status:computed.result.status === 'success' ? 'completed' : 'rejected',
    result:computed.result, ui, trace };
}

export async function testExpressionNode(nodeId, input, mode = 'mock') {
  const nodes = ['expression', 'expr-input', 'expr-compute', 'expr-tokenize', 'expr-parse', 'expr-evaluate', 'expr-result'];
  if (!nodes.includes(nodeId)) throw Error('Node not bound to an executable function');
  if (!['mock', 'dry-run', 'sandbox'].includes(mode)) throw Error('Unknown mode');
  if (mode === 'mock') return { nodeId, mode, simulated:true, input, output:{status:'mock', fixture:input}, elapsedMs:0 };
  if (nodeId === 'expression') return runExpression(input, mode);
  const start = performance.now();
  let output;
  let trace;
  if (nodeId === 'expr-input') output = captureExpressionInput(input);
  if (nodeId === 'expr-tokenize') output = tokenizeExpression(input?.expression);
  if (nodeId === 'expr-parse') {
    const tokenized = tokenizeExpression(input?.expression);
    output = tokenized.status === 'valid' ? parseExpression(tokenized.tokens) : tokenized;
  }
  if (nodeId === 'expr-compute' || nodeId === 'expr-evaluate') {
    const computed = await runExpressionCompute(input);
    output = computed.result;
    if (nodeId === 'expr-compute') {
      trace = [...computed.trace, { nodeId:'expr-compute', input, output, status:output.status === 'invalid' ? 'rejected' : 'ok',
        elapsedMs:Math.round(performance.now() - start) }];
    }
  }
  if (nodeId === 'expr-result') output = expressionUi(input ?? {});
  return { nodeId, mode, simulated:false, input, output, ...(trace ? {trace} : {}),
    elapsedMs:Math.round(performance.now() - start) };
}
