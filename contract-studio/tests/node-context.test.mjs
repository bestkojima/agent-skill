import test from 'node:test';
import assert from 'node:assert/strict';
import { describeNodeContext } from '../src/node-context.mjs';

const node = (id, title, parentId = null, extra = {}) => ({
  id, title, parentId, kind: 'logic', description: `${title}职责`, input: `${title}输入`, output: `${title}输出`, ...extra
});
const fixture = () => ({
  nodes: [
    node('input', '收集数字'), node('average', '平均值', null, { kind: 'group' }),
    node('result', '展示结果'), node('error', '展示错误'),
    node('validate', '校验数字', 'average', { outputSchema: { type: 'array', items: { type: 'number' } } }),
    node('calculate', '累加并求均值', 'average', { kind: 'group' }),
    node('nested', '深层辅助实现', 'calculate'), node('unrelated', '无关功能')
  ],
  edges: [
    { id: 'input-average', source: 'input', target: 'average', sourceHandle: 'values', targetHandle: 'in', label: '数字已输入' },
    { id: 'average-result', source: 'average', target: 'result', sourceHandle: 'ok', targetHandle: 'value', label: '计算成功' },
    { id: 'average-error', source: 'average', target: 'error', sourceHandle: 'fail', targetHandle: 'message', label: '校验或计算失败' },
    { id: 'validated-calculate', source: 'validate', target: 'calculate', label: '校验通过' },
    { id: 'unrelated-result', source: 'unrelated', target: 'result', label: '无关连线' }
  ]
});

test('节点文档包含直接前后驱、分支端口标签及直接子节点接口，范围不扩成全图', () => {
  const text = describeNodeContext(fixture(), 'average');
  assert.match(text, /直接输入依赖/);
  assert.match(text, /input · 收集数字 \[values\] → average · 平均值 \[in\]/);
  assert.match(text, /输入：收集数字输入\n输出：收集数字输出/);
  assert.match(text, /average · 平均值 \[ok\] → result · 展示结果 \[value\]/);
  assert.match(text, /average · 平均值 \[fail\] → error · 展示错误 \[message\]/);
  assert.match(text, /条件 \/ 标签：校验或计算失败/);
  assert.match(text, /直接子节点契约/);
  assert.match(text, /validate · 校验数字\n职责：校验数字职责\n输入：校验数字输入/);
  assert.match(text, /"type": "array"/);
  assert.match(text, /calculate · 累加并求均值/);
  assert.match(text, /子节点之间的关系/);
  assert.match(text, /validate · 校验数字 \[ok\] → calculate · 累加并求均值 \[in\]/);
  assert.doesNotMatch(text, /深层辅助实现|无关功能|无关连线/);
});

test('从当前图生成新快照，节点契约和边条件变化不会沿用旧内容', () => {
  const graph = fixture();
  const before = describeNodeContext(graph, 'average');
  graph.nodes.find(item => item.id === 'input').output = '已归一化数字数组';
  graph.nodes.find(item => item.id === 'validate').description = '检查非空列表与有限数值';
  graph.edges.find(edge => edge.id === 'average-error').label = '出现非有限值';
  graph.edges = graph.edges.filter(edge => edge.id !== 'average-result');
  const after = describeNodeContext(graph, 'average');
  assert.match(after, /输出：已归一化数字数组/);
  assert.match(after, /职责：检查非空列表与有限数值/);
  assert.match(after, /条件 \/ 标签：出现非有限值/);
  assert.doesNotMatch(after, /输出：收集数字输出|职责：校验数字职责|计算成功|result · 展示结果/);
  assert.match(before, /输出：收集数字输出/);
  assert.doesNotMatch(before, /已归一化数字数组/);
});

test('叶节点仅包含其直接依赖，空功能组准确呈现未定义关系', () => {
  const graph = fixture();
  const leaf = describeNodeContext(graph, 'validate');
  assert.match(leaf, /无直接输入连线/);
  assert.match(leaf, /calculate · 累加并求均值/);
  assert.doesNotMatch(leaf, /直接子节点契约|深层辅助实现|收集数字/);
  assert.match(describeNodeContext({ nodes: [node('empty', '待设计功能', null, { kind: 'group' })], edges: [] }, 'empty'), /尚无直接子节点/);
});
