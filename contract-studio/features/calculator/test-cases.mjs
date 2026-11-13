// Names identify real node:test cases; verifies links only assertions made by that case.
export const averageTestCases = [
  {
    id: 'TEST_AVG_20',
    name: '平均值：1 至 20 返回总和 210、数量 20、均值 10.5 和真实 21 步',
    file: 'tests/average.test.mjs',
    verifies: [
      { requirementId: 'REQ_AVERAGE_ALL', acceptanceId: 'AVG_20' },
      { requirementId: 'REQ_AVERAGE_COMPUTE', acceptanceId: 'AVG_DIVIDE' },
    ],
  },
  {
    id: 'TEST_AVG_VALUES',
    name: '平均值支持单个数字、负数、小数、零和科学计数法',
    file: 'tests/average.test.mjs',
    verifies: ['AVG_SINGLE', 'AVG_SIGNED', 'AVG_DECIMAL'].map(acceptanceId => ({
      requirementId: 'REQ_AVERAGE_ALL', acceptanceId,
    })),
  },
  {
    id: 'TEST_AVG_INVALID',
    name: '平均值拒绝空输入、空项、非法值与非有限值，不丢弃任何输入项',
    file: 'tests/average.test.mjs',
    verifies: [{ requirementId: 'REQ_AVERAGE_VALIDATE', acceptanceId: 'AVG_INVALID' }],
  },
  {
    id: 'TEST_AVG_OVERFLOW',
    name: '平均值累加溢出保留已发生的步骤，跳过除法且不返回成功数值',
    file: 'tests/average.test.mjs',
    verifies: [{ requirementId: 'REQ_AVERAGE_ACCUMULATE', acceptanceId: 'AVG_OVERFLOW' }],
  },
];
