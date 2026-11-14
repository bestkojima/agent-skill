:orphan:

节点字段投影
============

.. 由契约源生成的 needextend 字段；请编辑契约源。

.. needextend:: FUNC_SUITE_7375697465
   :feature_id: calculator.suite
   :node_id: suite
   :contract_source: contracts/calculator-suite.json
   :node_properties: {"kind":"group","description":"输入计算内容，选择计算方式并查看计算过程和结果。","input":"数字或四则表达式","output":"计算结果、执行步骤或错误","errors":[],"fixture":{}}
   :node_edges: []

.. needextend:: FUNC_SUITE_73756974652D696E707574
   :feature_id: calculator.suite
   :node_id: suite-input
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_7375697465
   :node_properties: {"kind":"ui","description":"输入数字和运算符，或选择包含多个数字的演示算式。","input":"用户输入","output":"计算输入","errors":[],"fixture":{},"importance":"normal"}
   :node_edges: [{"id":"suite-e1","source":"suite-input","target":"suite-compute","sourceHandle":"ok","targetHandle":"in","label":"计算输入"}]

.. needextend:: FUNC_SUITE_73756974652D636F6D70757465
   :feature_id: calculator.suite
   :node_id: suite-compute
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_7375697465
   :node_properties: {"kind":"group","description":"根据所选计算能力处理输入，返回实际计算过程及结果或错误。","input":"计算输入","output":"计算结果和步骤 / 错误","errors":[],"fixture":{},"importance":"core"}
   :node_edges: [{"id":"suite-e2","source":"suite-compute","target":"suite-result","sourceHandle":"ok","targetHandle":"in","label":"结果"},{"id":"suite-e3","source":"suite-compute","target":"suite-result","sourceHandle":"fail","targetHandle":"in","label":"错误"}]

.. needextend:: FUNC_SUITE_73756974652D726573756C74
   :feature_id: calculator.suite
   :node_id: suite-result
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_7375697465
   :node_properties: {"kind":"ui","description":"展示本次计算的结果、执行步骤或错误。","input":"计算结果和步骤 / 错误","output":"可见结果与过程","errors":[],"fixture":{},"importance":"normal"}
   :node_edges: []

.. needextend:: FUNC_SUITE_63616C63756C61746F72
   :feature_id: calculator.suite
   :node_id: calculator
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_73756974652D636F6D70757465
   :node_properties: {"kind":"group","description":"输入两个数字，执行四则运算并显示结果。","input":"两个数和运算符","output":"计算结果 / 错误提示","errors":["INVALID_INPUT","DIVISION_BY_ZERO"],"fixture":{"left":"12","right":"3","operator":"/"},"capabilityId":"calculator.calculate"}
   :node_edges: []

.. needextend:: FUNC_SUITE_63616C632D696E707574
   :feature_id: calculator.suite
   :node_id: calc-input
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_63616C63756C61746F72
   :node_properties: {"kind":"ui","description":"收集两个输入数字和所选运算符。","input":"用户输入","output":"CalculatorDraft","errors":[],"fixture":{"left":"12","right":"3","operator":"/"},"capabilityId":"calculator.calculate"}
   :node_edges: [{"id":"calc-e1","source":"calc-input","target":"calc-validate","sourceHandle":"ok","targetHandle":"in","label":"提交"}]

.. needextend:: FUNC_SUITE_63616C632D76616C6964617465
   :feature_id: calculator.suite
   :node_id: calc-validate
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_63616C63756C61746F72
   :node_properties: {"kind":"logic","description":"检查数字与运算符；除数为零时拒绝计算。","input":"CalculatorDraft","output":"CalculatorInput / 错误","errors":["INVALID_INPUT","DIVISION_BY_ZERO"],"fixture":{"left":"12","right":"3","operator":"/"},"capabilityId":"calculator.calculate","importance":"key"}
   :node_edges: [{"id":"calc-e2","source":"calc-validate","target":"calc-compute","sourceHandle":"ok","targetHandle":"in","label":"有效"},{"id":"calc-e3","source":"calc-validate","target":"calc-result","sourceHandle":"fail","targetHandle":"in","label":"输入错误"}]

.. needextend:: FUNC_SUITE_63616C632D636F6D70757465
   :feature_id: calculator.suite
   :node_id: calc-compute
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_63616C63756C61746F72
   :node_properties: {"kind":"logic","description":"根据运算符执行加减乘除，并检查结果范围。","input":"CalculatorInput","output":"计算结果 / 范围错误","errors":["RESULT_OUT_OF_RANGE"],"fixture":{"left":"12","right":"3","operator":"/"},"capabilityId":"calculator.calculate"}
   :node_edges: [{"id":"calc-e4","source":"calc-compute","target":"calc-result","sourceHandle":"ok","targetHandle":"in","label":"结果"},{"id":"calc-e5","source":"calc-compute","target":"calc-result","sourceHandle":"fail","targetHandle":"in","label":"超出范围"}]

.. needextend:: FUNC_SUITE_63616C632D726573756C74
   :feature_id: calculator.suite
   :node_id: calc-result
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_63616C63756C61746F72
   :node_properties: {"kind":"ui","description":"展示计算结果或用户可理解的错误原因。","input":"计算结果 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":4,"message":"计算结果：4"},"capabilityId":"calculator.calculate"}
   :node_edges: []

.. needextend:: FUNC_SUITE_73756D
   :feature_id: calculator.suite
   :node_id: sum
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_73756974652D636F6D70757465
   :node_properties: {"kind":"group","description":"输入至少 3 个数字，按顺序累加并显示每一步。","input":"至少 3 个数字","output":"总和与逐项累加步骤 / 错误提示","errors":["INVALID_INPUT","RESULT_OUT_OF_RANGE"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"capabilityId":"sum.calculate"}
   :node_edges: []

.. needextend:: FUNC_SUITE_73756D2D696E707574
   :feature_id: calculator.suite
   :node_id: sum-input
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_73756D
   :node_properties: {"kind":"ui","description":"收集用户输入的多个数字，保留输入顺序。","input":"用户输入","output":"SumDraft","errors":[],"fixture":{"values":[1,2,3]},"capabilityId":"sum.calculate"}
   :node_edges: [{"id":"sum-e1","source":"sum-input","target":"sum-validate","sourceHandle":"ok","targetHandle":"in","label":"提交"}]

.. needextend:: FUNC_SUITE_73756D2D76616C6964617465
   :feature_id: calculator.suite
   :node_id: sum-validate
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_73756D
   :node_properties: {"kind":"logic","description":"至少输入三个有效有限数字，并指出无效项。","input":"SumDraft","output":"SumInput / 错误","errors":["INVALID_INPUT"],"fixture":{"values":[1,2,3]},"capabilityId":"sum.calculate","importance":"key"}
   :node_edges: [{"id":"sum-e2","source":"sum-validate","target":"sum-accumulate","sourceHandle":"ok","targetHandle":"in","label":"有效"},{"id":"sum-e3","source":"sum-validate","target":"sum-result","sourceHandle":"fail","targetHandle":"in","label":"输入错误"}]

.. needextend:: FUNC_SUITE_73756D2D616363756D756C617465
   :feature_id: calculator.suite
   :node_id: sum-accumulate
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_73756D
   :node_properties: {"kind":"logic","description":"按输入顺序逐项累加，记录本次加数、原总和与新总和。","input":"SumInput","output":"总和与逐项步骤 / 范围错误","errors":["RESULT_OUT_OF_RANGE"],"fixture":{"values":[1,2,3]},"capabilityId":"sum.calculate"}
   :node_edges: [{"id":"sum-e4","source":"sum-accumulate","target":"sum-result","sourceHandle":"ok","targetHandle":"in","label":"总和"},{"id":"sum-e5","source":"sum-accumulate","target":"sum-result","sourceHandle":"fail","targetHandle":"in","label":"超出范围"}]

.. needextend:: FUNC_SUITE_73756D2D726573756C74
   :feature_id: calculator.suite
   :node_id: sum-result
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_73756D
   :node_properties: {"kind":"ui","description":"展示总和、每一步累加过程，或清楚说明错误。","input":"总和与步骤 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":6,"message":"求和结果：6","steps":[{"index":1,"value":1,"previous":0,"total":1},{"index":2,"value":2,"previous":1,"total":3},{"index":3,"value":3,"previous":3,"total":6}]},"capabilityId":"sum.calculate"}
   :node_edges: []

.. needextend:: FUNC_SUITE_65787072657373696F6E
   :feature_id: calculator.suite
   :node_id: expression
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_73756974652D636F6D70757465
   :node_properties: {"kind":"group","description":"输入表达式，展开计算过程，查看真实计算顺序及结果。","input":"四则表达式","output":"计算步骤和结果 / 错误提示","errors":["INVALID_EXPRESSION","DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"capabilityId":"expression.calculate"}
   :node_edges: []

.. needextend:: FUNC_SUITE_657870722D696E707574
   :feature_id: calculator.suite
   :node_id: expr-input
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_65787072657373696F6E
   :node_properties: {"kind":"ui","description":"输入数字、加减乘除运算符和括号。","input":"用户输入","output":"ExpressionDraft","errors":[],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"capabilityId":"expression.calculate"}
   :node_edges: [{"id":"expr-e1","source":"expr-input","target":"expr-compute","sourceHandle":"ok","targetHandle":"in","label":"表达式"}]

.. needextend:: FUNC_SUITE_657870722D636F6D70757465
   :feature_id: calculator.suite
   :node_id: expr-compute
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_65787072657373696F6E
   :node_properties: {"kind":"group","description":"依次识别、解析并求值；任一步失败时将错误传给结果节点。","input":"ExpressionDraft","output":"数值与实际计算步骤 / 错误","errors":["INVALID_EXPRESSION","DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"capabilityId":"expression.calculate"}
   :node_edges: [{"id":"expr-e2","source":"expr-compute","target":"expr-result","sourceHandle":"ok","targetHandle":"in","label":"结果"},{"id":"expr-e3","source":"expr-compute","target":"expr-result","sourceHandle":"fail","targetHandle":"in","label":"错误"}]

.. needextend:: FUNC_SUITE_657870722D746F6B656E697A65
   :feature_id: calculator.suite
   :node_id: expr-tokenize
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_657870722D636F6D70757465
   :node_properties: {"kind":"logic","description":"识别数字、括号和四则运算符，标记错误位置。","input":"表达式文本","output":"Tokens / 错误","errors":["INVALID_CHARACTER","NUMBER_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"capabilityId":"expression.calculate"}
   :node_edges: [{"id":"expr-e4","source":"expr-tokenize","target":"expr-parse","sourceHandle":"ok","targetHandle":"in","label":"符号"}]

.. needextend:: FUNC_SUITE_657870722D7061727365
   :feature_id: calculator.suite
   :node_id: expr-parse
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_657870722D636F6D70757465
   :node_properties: {"kind":"logic","description":"处理括号、一元正负和优先级，生成待求值序列。","input":"Tokens","output":"运算顺序 / 语法错误","errors":["INVALID_SYNTAX","UNMATCHED_PARENTHESIS"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"capabilityId":"expression.calculate","importance":"key"}
   :node_edges: [{"id":"expr-e5","source":"expr-parse","target":"expr-evaluate","sourceHandle":"ok","targetHandle":"in","label":"运算顺序"}]

.. needextend:: FUNC_SUITE_657870722D6576616C75617465
   :feature_id: calculator.suite
   :node_id: expr-evaluate
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_657870722D636F6D70757465
   :node_properties: {"kind":"logic","description":"按照真实运算顺序求值并记录每一步；拒绝除零和溢出。","input":"运算顺序","output":"结果与计算步骤 / 错误","errors":["DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"capabilityId":"expression.calculate"}
   :node_edges: []

.. needextend:: FUNC_SUITE_657870722D726573756C74
   :feature_id: calculator.suite
   :node_id: expr-result
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_65787072657373696F6E
   :node_properties: {"kind":"ui","description":"展示数值与真实运算过程，或显示带位置的错误信息。","input":"计算步骤和结果 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":18,"message":"计算结果：18","steps":[]},"capabilityId":"expression.calculate"}
   :node_edges: []

.. needextend:: FUNC_SUITE_61766572616765
   :feature_id: calculator.suite
   :node_id: average
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_73756974652D636F6D70757465
   :node_properties: {"input":"一个或多个有限数字","output":"数量、总和、平均值与步骤 / 错误","errors":["EMPTY_INPUT","INVALID_NUMBER","NUMERIC_OVERFLOW"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"capabilityId":"average.calculate","kind":"group","description":"计算一个或多个数字的算术平均值，展示数量、总和与真实过程。","processing":"校验数字，顺序累加并计数，再将总和除以数量。","acceptance":"1 至 20 的数量为 20，总和为 210，平均值为 10.5；显示 20 次累加和一次除法。","inputSchema":{"type":"object","required":["values"],"properties":{"values":{"type":"array","minItems":1,"items":{"type":["number","string"]}}}},"outputSchema":{"type":"object","required":["mode","status","result","ui","trace","observedCalls"],"properties":{"mode":{"enum":["dry-run","sandbox"]},"status":{"enum":["completed","rejected"]},"result":{"oneOf":[{"type":"object","required":["status","value","count","total","steps"],"properties":{"status":{"const":"success"},"count":{"type":"integer","minimum":1},"total":{"type":"number"},"steps":{"type":"array","items":{"type":"object"}},"message":{"type":"string"},"value":{"type":"number"}}},{"type":"object","required":["status","code","message"],"properties":{"status":{"const":"invalid"},"code":{"type":"string"},"message":{"type":"string"},"steps":{"type":"array","items":{"type":"object"}}}}]},"ui":{"type":"object"},"trace":{"type":"array"},"observedCalls":{"type":"array"}}},"importance":"core"}
   :node_edges: []

.. needextend:: FUNC_SUITE_6176672D76616C6964617465
   :feature_id: calculator.suite
   :node_id: avg-validate
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_61766572616765
   :node_properties: {"input":"原始 values 列表（数字或数字字符串，至少一项）","output":"status=valid 与 input.values / status=invalid 与 code、message","errors":["EMPTY_INPUT","INVALID_NUMBER"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"capabilityId":"average.calculate","kind":"logic","description":"接受至少一个有限数字，明确指出空项、非法项和越界数字。","processing":"保留输入顺序与项位置；允许负数、小数、零和科学计数。","importance":"key","inputSchema":{"type":"object","required":["values"],"properties":{"values":{"type":"array","minItems":1,"items":{"type":["number","string"]}}}},"outputSchema":{"oneOf":[{"type":"object","required":["status","input"],"properties":{"status":{"const":"valid"},"input":{"type":"object","required":["values"],"properties":{"values":{"type":"array","minItems":1,"items":{"type":"number"}}}}}},{"type":"object","required":["status","code","message"],"properties":{"status":{"const":"invalid"},"code":{"type":"string"},"message":{"type":"string"},"steps":{"type":"array","items":{"type":"object"}}}}]}}
   :node_edges: [{"id":"avg-e1","source":"avg-validate","target":"avg-accumulate","sourceHandle":"ok","targetHandle":"in","label":"有效数字"}]

.. needextend:: FUNC_SUITE_6176672D616363756D756C617465
   :feature_id: calculator.suite
   :node_id: avg-accumulate
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_61766572616765
   :node_properties: {"input":"校验后的 input.values（非空有限数字列表）","output":"status、count、total、steps / 错误与已完成步骤","errors":["NUMERIC_OVERFLOW"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"capabilityId":"average.calculate","kind":"logic","description":"按顺序逐项累加，记录每次加法和总数量。","processing":"从零开始累加；中间结果溢出则保留已经完成的步骤并停止。","importance":"key","inputSchema":{"type":"object","required":["values"],"properties":{"values":{"type":"array","minItems":1,"items":{"type":"number"}}}},"outputSchema":{"oneOf":[{"type":"object","required":["status","count","total","steps"],"properties":{"status":{"const":"success"},"count":{"type":"integer","minimum":1},"total":{"type":"number"},"steps":{"type":"array","items":{"type":"object"}},"message":{"type":"string"}}},{"type":"object","required":["status","code","message"],"properties":{"status":{"const":"invalid"},"code":{"type":"string"},"message":{"type":"string"},"steps":{"type":"array","items":{"type":"object"}}}}]}}
   :node_edges: [{"id":"avg-e2","source":"avg-accumulate","target":"avg-compute","sourceHandle":"ok","targetHandle":"in","label":"总和与数量"}]

.. needextend:: FUNC_SUITE_6176672D636F6D70757465
   :feature_id: calculator.suite
   :node_id: avg-compute
   :contract_source: contracts/calculator-suite.json
   :parent_spec: FUNC_SUITE_61766572616765
   :node_properties: {"input":"累加结果 count、total、steps（count 为正整数）","output":"status、value、count、total、steps / 错误与已完成步骤","errors":["NUMERIC_OVERFLOW"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"capabilityId":"average.calculate","kind":"logic","description":"将实际总和除以数量，返回均值与最终除法步骤。","processing":"总和 ÷ 数量，使用 JavaScript 浮点数语义。","importance":"core","inputSchema":{"type":"object","required":["count","total","steps"],"properties":{"count":{"type":"integer","minimum":1},"total":{"type":"number"},"steps":{"type":"array","items":{"type":"object"}}}},"outputSchema":{"oneOf":[{"type":"object","required":["status","value","count","total","steps"],"properties":{"status":{"const":"success"},"count":{"type":"integer","minimum":1},"total":{"type":"number"},"steps":{"type":"array","items":{"type":"object"}},"message":{"type":"string"},"value":{"type":"number"}}},{"type":"object","required":["status","code","message"],"properties":{"status":{"const":"invalid"},"code":{"type":"string"},"message":{"type":"string"},"steps":{"type":"array","items":{"type":"object"}}}}]}}
   :node_edges: []

.. needextend:: FUNC_63616C63756C61746F72
   :feature_id: calculator.calculate
   :node_id: calculator
   :contract_source: contracts/calculator.json
   :node_properties: {"kind":"group","description":"输入两个数字，执行四则运算并显示结果。","input":"两个数和运算符","output":"计算结果 / 错误提示","errors":["INVALID_INPUT","DIVISION_BY_ZERO"],"fixture":{"left":"12","right":"3","operator":"/"}}
   :node_edges: []

.. needextend:: FUNC_63616C632D696E707574
   :feature_id: calculator.calculate
   :node_id: calc-input
   :contract_source: contracts/calculator.json
   :parent_spec: FUNC_63616C63756C61746F72
   :node_properties: {"kind":"ui","description":"收集两个输入数字和所选运算符。","input":"用户输入","output":"CalculatorDraft","errors":[],"fixture":{"left":"12","right":"3","operator":"/"}}
   :node_edges: [{"id":"calc-e1","source":"calc-input","target":"calc-validate","sourceHandle":"ok","targetHandle":"in","label":"提交"}]

.. needextend:: FUNC_63616C632D76616C6964617465
   :feature_id: calculator.calculate
   :node_id: calc-validate
   :contract_source: contracts/calculator.json
   :parent_spec: FUNC_63616C63756C61746F72
   :node_properties: {"kind":"logic","description":"检查数字与运算符；除数为零时拒绝计算。","input":"CalculatorDraft","output":"CalculatorInput / 错误","errors":["INVALID_INPUT","DIVISION_BY_ZERO"],"fixture":{"left":"12","right":"3","operator":"/"}}
   :node_edges: [{"id":"calc-e2","source":"calc-validate","target":"calc-compute","sourceHandle":"ok","targetHandle":"in","label":"有效"},{"id":"calc-e3","source":"calc-validate","target":"calc-result","sourceHandle":"fail","targetHandle":"in","label":"输入错误"}]

.. needextend:: FUNC_63616C632D636F6D70757465
   :feature_id: calculator.calculate
   :node_id: calc-compute
   :contract_source: contracts/calculator.json
   :parent_spec: FUNC_63616C63756C61746F72
   :node_properties: {"kind":"logic","description":"根据运算符执行加减乘除，并检查结果范围。","input":"CalculatorInput","output":"计算结果 / 范围错误","errors":["RESULT_OUT_OF_RANGE"],"fixture":{"left":"12","right":"3","operator":"/"}}
   :node_edges: [{"id":"calc-e4","source":"calc-compute","target":"calc-result","sourceHandle":"ok","targetHandle":"in","label":"结果"},{"id":"calc-e5","source":"calc-compute","target":"calc-result","sourceHandle":"fail","targetHandle":"in","label":"超出范围"}]

.. needextend:: FUNC_63616C632D726573756C74
   :feature_id: calculator.calculate
   :node_id: calc-result
   :contract_source: contracts/calculator.json
   :parent_spec: FUNC_63616C63756C61746F72
   :node_properties: {"kind":"ui","description":"展示计算结果或用户可理解的错误原因。","input":"计算结果 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":4,"message":"计算结果：4"}}
   :node_edges: []

.. needextend:: FUNC_73756D
   :feature_id: sum.calculate
   :node_id: sum
   :contract_source: contracts/sum.json
   :node_properties: {"kind":"group","description":"输入至少 3 个数字，按顺序累加并显示每一步。","input":"至少 3 个数字","output":"总和与逐项累加步骤 / 错误提示","errors":["INVALID_INPUT","RESULT_OUT_OF_RANGE"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]}}
   :node_edges: []

.. needextend:: FUNC_73756D2D696E707574
   :feature_id: sum.calculate
   :node_id: sum-input
   :contract_source: contracts/sum.json
   :parent_spec: FUNC_73756D
   :node_properties: {"kind":"ui","description":"收集用户输入的多个数字，保留输入顺序。","input":"用户输入","output":"SumDraft","errors":[],"fixture":{"values":[1,2,3]}}
   :node_edges: [{"id":"sum-e1","source":"sum-input","target":"sum-validate","sourceHandle":"ok","targetHandle":"in","label":"提交"}]

.. needextend:: FUNC_73756D2D76616C6964617465
   :feature_id: sum.calculate
   :node_id: sum-validate
   :contract_source: contracts/sum.json
   :parent_spec: FUNC_73756D
   :node_properties: {"kind":"logic","description":"至少输入三个有效有限数字，并指出无效项。","input":"SumDraft","output":"SumInput / 错误","errors":["INVALID_INPUT"],"fixture":{"values":[1,2,3]}}
   :node_edges: [{"id":"sum-e2","source":"sum-validate","target":"sum-accumulate","sourceHandle":"ok","targetHandle":"in","label":"有效"},{"id":"sum-e3","source":"sum-validate","target":"sum-result","sourceHandle":"fail","targetHandle":"in","label":"输入错误"}]

.. needextend:: FUNC_73756D2D616363756D756C617465
   :feature_id: sum.calculate
   :node_id: sum-accumulate
   :contract_source: contracts/sum.json
   :parent_spec: FUNC_73756D
   :node_properties: {"kind":"logic","description":"按输入顺序逐项累加，记录本次加数、原总和与新总和。","input":"SumInput","output":"总和与逐项步骤 / 范围错误","errors":["RESULT_OUT_OF_RANGE"],"fixture":{"values":[1,2,3]}}
   :node_edges: [{"id":"sum-e4","source":"sum-accumulate","target":"sum-result","sourceHandle":"ok","targetHandle":"in","label":"总和"},{"id":"sum-e5","source":"sum-accumulate","target":"sum-result","sourceHandle":"fail","targetHandle":"in","label":"超出范围"}]

.. needextend:: FUNC_73756D2D726573756C74
   :feature_id: sum.calculate
   :node_id: sum-result
   :contract_source: contracts/sum.json
   :parent_spec: FUNC_73756D
   :node_properties: {"kind":"ui","description":"展示总和、每一步累加过程，或清楚说明错误。","input":"总和与步骤 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":6,"message":"求和结果：6","steps":[{"index":1,"value":1,"previous":0,"total":1},{"index":2,"value":2,"previous":1,"total":3},{"index":3,"value":3,"previous":3,"total":6}]}}
   :node_edges: []

.. needextend:: FUNC_65787072657373696F6E
   :feature_id: expression.calculate
   :node_id: expression
   :contract_source: contracts/expression.json
   :node_properties: {"kind":"group","description":"输入表达式，展开计算过程，查看真实计算顺序及结果。","input":"四则表达式","output":"计算步骤和结果 / 错误提示","errors":["INVALID_EXPRESSION","DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"}}
   :node_edges: []

.. needextend:: FUNC_657870722D696E707574
   :feature_id: expression.calculate
   :node_id: expr-input
   :contract_source: contracts/expression.json
   :parent_spec: FUNC_65787072657373696F6E
   :node_properties: {"kind":"ui","description":"输入数字、加减乘除运算符和括号。","input":"用户输入","output":"ExpressionDraft","errors":[],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"}}
   :node_edges: [{"id":"expr-e1","source":"expr-input","target":"expr-compute","sourceHandle":"ok","targetHandle":"in","label":"表达式"}]

.. needextend:: FUNC_657870722D636F6D70757465
   :feature_id: expression.calculate
   :node_id: expr-compute
   :contract_source: contracts/expression.json
   :parent_spec: FUNC_65787072657373696F6E
   :node_properties: {"kind":"group","description":"依次识别、解析并求值；任一步失败时将错误传给结果节点。","input":"ExpressionDraft","output":"数值与实际计算步骤 / 错误","errors":["INVALID_EXPRESSION","DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"}}
   :node_edges: [{"id":"expr-e2","source":"expr-compute","target":"expr-result","sourceHandle":"ok","targetHandle":"in","label":"结果"},{"id":"expr-e3","source":"expr-compute","target":"expr-result","sourceHandle":"fail","targetHandle":"in","label":"错误"}]

.. needextend:: FUNC_657870722D746F6B656E697A65
   :feature_id: expression.calculate
   :node_id: expr-tokenize
   :contract_source: contracts/expression.json
   :parent_spec: FUNC_657870722D636F6D70757465
   :node_properties: {"kind":"logic","description":"识别数字、括号和四则运算符，标记错误位置。","input":"表达式文本","output":"Tokens / 错误","errors":["INVALID_CHARACTER","NUMBER_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"}}
   :node_edges: [{"id":"expr-e4","source":"expr-tokenize","target":"expr-parse","sourceHandle":"ok","targetHandle":"in","label":"符号"}]

.. needextend:: FUNC_657870722D7061727365
   :feature_id: expression.calculate
   :node_id: expr-parse
   :contract_source: contracts/expression.json
   :parent_spec: FUNC_657870722D636F6D70757465
   :node_properties: {"kind":"logic","description":"处理括号、一元正负和优先级，生成待求值序列。","input":"Tokens","output":"运算顺序 / 语法错误","errors":["INVALID_SYNTAX","UNMATCHED_PARENTHESIS"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"}}
   :node_edges: [{"id":"expr-e5","source":"expr-parse","target":"expr-evaluate","sourceHandle":"ok","targetHandle":"in","label":"运算顺序"}]

.. needextend:: FUNC_657870722D6576616C75617465
   :feature_id: expression.calculate
   :node_id: expr-evaluate
   :contract_source: contracts/expression.json
   :parent_spec: FUNC_657870722D636F6D70757465
   :node_properties: {"kind":"logic","description":"按照真实运算顺序求值并记录每一步；拒绝除零和溢出。","input":"运算顺序","output":"结果与计算步骤 / 错误","errors":["DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"}}
   :node_edges: []

.. needextend:: FUNC_657870722D726573756C74
   :feature_id: expression.calculate
   :node_id: expr-result
   :contract_source: contracts/expression.json
   :parent_spec: FUNC_65787072657373696F6E
   :node_properties: {"kind":"ui","description":"展示数值与真实运算过程，或显示带位置的错误信息。","input":"计算步骤和结果 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":18,"message":"计算结果：18","steps":[]}}
   :node_edges: []

.. needextend:: FUNC_7375626D6974
   :feature_id: feedback.submit
   :node_id: submit
   :contract_source: contracts/feedback.json
   :node_properties: {"kind":"group","description":"折叠时只看业务能力，展开看到内部处理。","input":"用户反馈","output":"反馈列表更新 / 错误提示","errors":["INVALID","DUPLICATE"],"fixture":{}}
   :node_edges: []

.. needextend:: FUNC_666F726D
   :feature_id: feedback.submit
   :node_id: form
   :contract_source: contracts/feedback.json
   :parent_spec: FUNC_7375626D6974
   :node_properties: {"kind":"ui","description":"React 从真实表单采集标题、分类和内容。","input":"表单字段","output":"FeedbackDraft","errors":[],"fixture":{"title":"建议增加夜间模式","category":"feature","detail":"阅读时希望减少亮度"}}
   :node_edges: [{"id":"e1","source":"form","target":"validate","sourceHandle":"ok","targetHandle":"in","label":"提交"}]

.. needextend:: FUNC_76616C6964617465
   :feature_id: feedback.submit
   :node_id: validate
   :contract_source: contracts/feedback.json
   :parent_spec: FUNC_7375626D6974
   :node_properties: {"kind":"logic","description":"验证标题长度、类别和内容长度。","input":"FeedbackDraft","output":"FeedbackInput","errors":["INVALID_TITLE","INVALID_CATEGORY","INVALID_DETAIL"],"fixture":{"title":"建议增加夜间模式","category":"feature","detail":"阅读时希望减少亮度"},"adapter":{"capability":"feedback.validate","default":"javascript","transport":"stdin-json / stdout-json"}}
   :node_edges: [{"id":"e2","source":"validate","target":"lookup","sourceHandle":"ok","targetHandle":"in","label":"合法"},{"id":"e3","source":"validate","target":"view","sourceHandle":"fail","targetHandle":"in","label":"非法"}]

.. needextend:: FUNC_6C6F6F6B7570
   :feature_id: feedback.submit
   :node_id: lookup
   :contract_source: contracts/feedback.json
   :parent_spec: FUNC_7375626D6974
   :node_properties: {"kind":"async","description":"模拟真实异步数据库读取，检查相同类别和标题。","input":"FeedbackInput","output":"DuplicateCheck","errors":["DUPLICATE"],"fixture":{"title":"建议增加夜间模式","category":"feature","detail":"阅读时希望减少亮度"}}
   :node_edges: [{"id":"e4","source":"lookup","target":"save","sourceHandle":"ok","targetHandle":"in","label":"未重复"},{"id":"e5","source":"lookup","target":"view","sourceHandle":"fail","targetHandle":"in","label":"重复"}]

.. needextend:: FUNC_73617665
   :feature_id: feedback.submit
   :node_id: save
   :contract_source: contracts/feedback.json
   :parent_spec: FUNC_7375626D6974
   :node_properties: {"kind":"action","description":"Dry-run 只展示拟写入数据；Sandbox 写入当前进程内存。","input":"FeedbackInput","output":"SavedFeedback / SavePlan","errors":[],"fixture":{"title":"新增键盘快捷键","category":"feature","detail":"支持 Ctrl+Enter 提交"}}
   :node_edges: [{"id":"e6","source":"save","target":"view","sourceHandle":"ok","targetHandle":"in","label":"结果"}]

.. needextend:: FUNC_76696577
   :feature_id: feedback.submit
   :node_id: view
   :contract_source: contracts/feedback.json
   :parent_spec: FUNC_7375626D6974
   :node_properties: {"kind":"ui","description":"向 React 返回成功、预览或失败状态，刷新右侧的反馈列表。","input":"SubmissionResult","output":"UIState","errors":[],"fixture":{"status":"saved","item":{"id":"F-8","title":"新增键盘快捷键"}}}
   :node_edges: []
