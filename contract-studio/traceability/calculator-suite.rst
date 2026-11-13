需求与功能图
============

.. 由 contracts/calculator-suite.requirements.json 和 contracts/calculator-suite.json 生成；请修改源文件或使用工作台，不要直接编辑。

需求条目
--------

.. req:: 计算平均值并展示真实过程
   :id: REQ_AVERAGE_ALL
   :status: confirmed

   用户在统一计算器输入一个或多个数字，查看数量、总和、算术平均值，以及逐项累加和最终除法过程。

   验收条件：

   * :need_part:`(AVG_20) 输入 1 至 20；预期 数量 20，总和 210，平均值 10.5；观察 显示 20 次累加及最终 210 ÷ 20 的过程`
   * :need_part:`(AVG_SINGLE) 输入 7；预期 数量 1，总和 7，平均值 7`
   * :need_part:`(AVG_SIGNED) 输入 -2, 0, 5；预期 平均值 1`
   * :need_part:`(AVG_DECIMAL) 输入 0.5, 1.5；预期 平均值 1`

.. req:: 校验平均值输入
   :id: REQ_AVERAGE_VALIDATE
   :status: confirmed

   至少提供一个有效有限数字；支持负数、小数、零和科学计数。空列表、空项、非法值、非有限值须明确拒绝，不跳过坏值。

   验收条件：

   * :need_part:`(AVG_INVALID) 输入 空列表、空项、abc 或 1e999；预期 返回明确错误，不显示伪造的成功均值`

.. req:: 顺序累加并计数
   :id: REQ_AVERAGE_ACCUMULATE
   :status: confirmed

   按输入顺序累加，记录真实加法步骤及数量；中间结果超出有限数值范围时停止并保留已完成步骤。

   验收条件：

   * :need_part:`(AVG_OVERFLOW) 输入 1e308, 1e308；预期 累加溢出，保留首个完成步骤`

.. req:: 用总和除以数量计算均值
   :id: REQ_AVERAGE_COMPUTE
   :status: confirmed

   以实际总和除以正的数字数量，返回 JavaScript 浮点数均值和最终除法步骤。

   验收条件：

   * :need_part:`(AVG_DIVIDE) 输入 总和 210，数量 20；预期 均值 10.5，最终步骤为 210 ÷ 20 = 10.5`

项目功能图
----------

仅包含 contracts/calculator-suite.json 已持久的图；浏览器画布草稿不会自动写入此文件。

.. 持久图完整快照，仅用于过期检测；来源仍以 JSON 文件为准。
   {"version":2,"feature":{"id":"calculator.suite","title":"计算器","goal":"支持两数四则、多数字求和、混合表达式和平均值，展示真实计算过程与需求、代码和测试关联"},"nodes":[{"id":"suite","parentId":null,"title":"计算器","kind":"group","description":"输入计算内容，选择计算方式并查看计算过程和结果。","position":{"x":30,"y":40},"size":{"width":1810,"height":2240},"input":"数字或四则表达式","output":"计算结果、执行步骤或错误","errors":[],"fixture":{},"code":"","test":""},{"id":"suite-input","parentId":"suite","title":"输入","kind":"ui","description":"输入数字和运算符，或选择包含多个数字的演示算式。","position":{"x":20,"y":470},"input":"用户输入","output":"计算输入","errors":[],"fixture":{},"code":"","test":"","importance":"normal"},{"id":"suite-compute","parentId":"suite","title":"计算","kind":"group","description":"根据所选计算能力处理输入，返回实际计算过程及结果或错误。","position":{"x":250,"y":90},"size":{"width":1300,"height":2040},"input":"计算输入","output":"计算结果和步骤 / 错误","errors":[],"fixture":{},"code":"","test":"","importance":"core"},{"id":"suite-result","parentId":"suite","title":"结果","kind":"ui","description":"展示本次计算的结果、执行步骤或错误。","position":{"x":1580,"y":470},"input":"计算结果和步骤 / 错误","output":"可见结果与过程","errors":[],"fixture":{},"code":"","test":"","importance":"normal"},{"id":"calculator","parentId":"suite-compute","title":"两数四则运算","kind":"group","description":"输入两个数字，执行四则运算并显示结果。","position":{"x":25,"y":80},"size":{"width":970,"height":415},"input":"两个数和运算符","output":"计算结果 / 错误提示","errors":["INVALID_INPUT","DIVISION_BY_ZERO"],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#runCalculation","test":"tests/calculator.test.mjs","capabilityId":"calculator.calculate"},{"id":"calc-input","parentId":"calculator","title":"输入数字","kind":"ui","description":"收集两个输入数字和所选运算符。","position":{"x":35,"y":98},"input":"用户输入","output":"CalculatorDraft","errors":[],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#captureCalculatorInput","test":"tests/calculator.test.mjs","capabilityId":"calculator.calculate"},{"id":"calc-validate","parentId":"calculator","title":"校验输入","kind":"logic","description":"检查数字与运算符；除数为零时拒绝计算。","position":{"x":230,"y":98},"input":"CalculatorDraft","output":"CalculatorInput / 错误","errors":["INVALID_INPUT","DIVISION_BY_ZERO"],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#validateCalculatorInput","test":"tests/calculator.test.mjs","capabilityId":"calculator.calculate","importance":"key"},{"id":"calc-compute","parentId":"calculator","title":"四则运算","kind":"logic","description":"根据运算符执行加减乘除，并检查结果范围。","position":{"x":425,"y":98},"input":"CalculatorInput","output":"计算结果 / 范围错误","errors":["RESULT_OUT_OF_RANGE"],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#computeCalculator","test":"tests/calculator.test.mjs","capabilityId":"calculator.calculate"},{"id":"calc-result","parentId":"calculator","title":"展示结果","kind":"ui","description":"展示计算结果或用户可理解的错误原因。","position":{"x":620,"y":273},"input":"计算结果 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":4,"message":"计算结果：4"},"code":"server/calculator.mjs#calculatorUi","test":"tests/calculator.test.mjs","capabilityId":"calculator.calculate"},{"id":"sum","parentId":"suite-compute","title":"多数字求和","kind":"group","description":"输入至少 3 个数字，按顺序累加并显示每一步。","position":{"x":25,"y":600},"size":{"width":970,"height":415},"input":"至少 3 个数字","output":"总和与逐项累加步骤 / 错误提示","errors":["INVALID_INPUT","RESULT_OUT_OF_RANGE"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"code":"server/sum.mjs#runSum","test":"tests/sum.test.mjs","capabilityId":"sum.calculate"},{"id":"sum-input","parentId":"sum","title":"输入数字","kind":"ui","description":"收集用户输入的多个数字，保留输入顺序。","position":{"x":35,"y":98},"input":"用户输入","output":"SumDraft","errors":[],"fixture":{"values":[1,2,3]},"code":"server/sum.mjs#captureSumInput","test":"tests/sum.test.mjs","capabilityId":"sum.calculate"},{"id":"sum-validate","parentId":"sum","title":"校验数字","kind":"logic","description":"至少输入三个有效有限数字，并指出无效项。","position":{"x":230,"y":98},"input":"SumDraft","output":"SumInput / 错误","errors":["INVALID_INPUT"],"fixture":{"values":[1,2,3]},"code":"server/sum.mjs#validateSumInput","test":"tests/sum.test.mjs","capabilityId":"sum.calculate","importance":"key"},{"id":"sum-accumulate","parentId":"sum","title":"逐项累加","kind":"logic","description":"按输入顺序逐项累加，记录本次加数、原总和与新总和。","position":{"x":425,"y":98},"input":"SumInput","output":"总和与逐项步骤 / 范围错误","errors":["RESULT_OUT_OF_RANGE"],"fixture":{"values":[1,2,3]},"code":"server/sum.mjs#accumulateSum","test":"tests/sum.test.mjs","capabilityId":"sum.calculate"},{"id":"sum-result","parentId":"sum","title":"展示结果","kind":"ui","description":"展示总和、每一步累加过程，或清楚说明错误。","position":{"x":620,"y":273},"input":"总和与步骤 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":6,"message":"求和结果：6","steps":[{"index":1,"value":1,"previous":0,"total":1},{"index":2,"value":2,"previous":1,"total":3},{"index":3,"value":3,"previous":3,"total":6}]},"code":"server/sum.mjs#sumUi","test":"tests/sum.test.mjs","capabilityId":"sum.calculate"},{"id":"expression","parentId":"suite-compute","title":"混合四则运算","kind":"group","description":"输入表达式，展开计算过程，查看真实计算顺序及结果。","position":{"x":25,"y":1120},"size":{"width":1240,"height":435},"input":"四则表达式","output":"计算步骤和结果 / 错误提示","errors":["INVALID_EXPRESSION","DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#runExpression","test":"tests/expression.test.mjs","capabilityId":"expression.calculate"},{"id":"expr-input","parentId":"expression","title":"输入表达式","kind":"ui","description":"输入数字、加减乘除运算符和括号。","position":{"x":35,"y":145},"input":"用户输入","output":"ExpressionDraft","errors":[],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#captureExpressionInput","test":"tests/expression.test.mjs","capabilityId":"expression.calculate"},{"id":"expr-compute","parentId":"expression","title":"计算","kind":"group","description":"依次识别、解析并求值；任一步失败时将错误传给结果节点。","position":{"x":260,"y":95},"size":{"width":665,"height":245},"input":"ExpressionDraft","output":"数值与实际计算步骤 / 错误","errors":["INVALID_EXPRESSION","DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#runExpressionCompute","test":"tests/expression.test.mjs","capabilityId":"expression.calculate"},{"id":"expr-tokenize","parentId":"expr-compute","title":"识别数字与符号","kind":"logic","description":"识别数字、括号和四则运算符，标记错误位置。","position":{"x":20,"y":83},"input":"表达式文本","output":"Tokens / 错误","errors":["INVALID_CHARACTER","NUMBER_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#tokenizeExpression","test":"tests/expression.test.mjs","capabilityId":"expression.calculate"},{"id":"expr-parse","parentId":"expr-compute","title":"处理优先级","kind":"logic","description":"处理括号、一元正负和优先级，生成待求值序列。","position":{"x":235,"y":83},"input":"Tokens","output":"运算顺序 / 语法错误","errors":["INVALID_SYNTAX","UNMATCHED_PARENTHESIS"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#parseExpression","test":"tests/expression.test.mjs","capabilityId":"expression.calculate","importance":"key"},{"id":"expr-evaluate","parentId":"expr-compute","title":"逐步求值","kind":"logic","description":"按照真实运算顺序求值并记录每一步；拒绝除零和溢出。","position":{"x":450,"y":83},"input":"运算顺序","output":"结果与计算步骤 / 错误","errors":["DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#evaluateExpression","test":"tests/expression.test.mjs","capabilityId":"expression.calculate"},{"id":"expr-result","parentId":"expression","title":"展示结果","kind":"ui","description":"展示数值与真实运算过程，或显示带位置的错误信息。","position":{"x":995,"y":145},"input":"计算步骤和结果 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":18,"message":"计算结果：18","steps":[]},"code":"server/expression.mjs#expressionUi","test":"tests/expression.test.mjs","capabilityId":"expression.calculate"},{"input":"一个或多个有限数字","output":"数量、总和、平均值与步骤 / 错误","errors":["EMPTY_INPUT","INVALID_NUMBER","NUMERIC_OVERFLOW"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"test":"tests/average.test.mjs","capabilityId":"average.calculate","id":"average","parentId":"suite-compute","title":"平均值","kind":"group","description":"计算一个或多个数字的算术平均值，展示数量、总和与真实过程。","position":{"x":25,"y":1680},"size":{"width":1050,"height":300},"processing":"校验数字，顺序累加并计数，再将总和除以数量。","acceptance":"1 至 20 的数量为 20，总和为 210，平均值为 10.5；显示 20 次累加和一次除法。","code":"server/average.mjs#runAverage","inputSchema":{"type":"object","required":["values"],"properties":{"values":{"type":"array","minItems":1,"items":{"type":["number","string"]}}}},"outputSchema":{"type":"object","required":["mode","status","result","ui","trace","observedCalls"],"properties":{"mode":{"enum":["dry-run","sandbox"]},"status":{"enum":["completed","rejected"]},"result":{"oneOf":[{"type":"object","required":["status","value","count","total","steps"],"properties":{"status":{"const":"success"},"count":{"type":"integer","minimum":1},"total":{"type":"number"},"steps":{"type":"array","items":{"type":"object"}},"message":{"type":"string"},"value":{"type":"number"}}},{"type":"object","required":["status","code","message"],"properties":{"status":{"const":"invalid"},"code":{"type":"string"},"message":{"type":"string"},"steps":{"type":"array","items":{"type":"object"}}}}]},"ui":{"type":"object"},"trace":{"type":"array"},"observedCalls":{"type":"array"}}},"importance":"core"},{"input":"原始 values 列表（数字或数字字符串，至少一项）","output":"status=valid 与 input.values / status=invalid 与 code、message","errors":["EMPTY_INPUT","INVALID_NUMBER"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"test":"tests/average.test.mjs","capabilityId":"average.calculate","id":"avg-validate","parentId":"average","title":"校验数字","kind":"logic","description":"接受至少一个有限数字，明确指出空项、非法项和越界数字。","position":{"x":30,"y":100},"processing":"保留输入顺序与项位置；允许负数、小数、零和科学计数。","code":"server/average.mjs#validateAverageInput","importance":"key","inputSchema":{"type":"object","required":["values"],"properties":{"values":{"type":"array","minItems":1,"items":{"type":["number","string"]}}}},"outputSchema":{"oneOf":[{"type":"object","required":["status","input"],"properties":{"status":{"const":"valid"},"input":{"type":"object","required":["values"],"properties":{"values":{"type":"array","minItems":1,"items":{"type":"number"}}}}}},{"type":"object","required":["status","code","message"],"properties":{"status":{"const":"invalid"},"code":{"type":"string"},"message":{"type":"string"},"steps":{"type":"array","items":{"type":"object"}}}}]}},{"input":"校验后的 input.values（非空有限数字列表）","output":"status、count、total、steps / 错误与已完成步骤","errors":["NUMERIC_OVERFLOW"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"test":"tests/average.test.mjs","capabilityId":"average.calculate","id":"avg-accumulate","parentId":"average","title":"累加与计数","kind":"logic","description":"按顺序逐项累加，记录每次加法和总数量。","position":{"x":360,"y":100},"processing":"从零开始累加；中间结果溢出则保留已经完成的步骤并停止。","code":"server/average.mjs#accumulateAverage","importance":"key","inputSchema":{"type":"object","required":["values"],"properties":{"values":{"type":"array","minItems":1,"items":{"type":"number"}}}},"outputSchema":{"oneOf":[{"type":"object","required":["status","count","total","steps"],"properties":{"status":{"const":"success"},"count":{"type":"integer","minimum":1},"total":{"type":"number"},"steps":{"type":"array","items":{"type":"object"}},"message":{"type":"string"}}},{"type":"object","required":["status","code","message"],"properties":{"status":{"const":"invalid"},"code":{"type":"string"},"message":{"type":"string"},"steps":{"type":"array","items":{"type":"object"}}}}]}},{"input":"累加结果 count、total、steps（count 为正整数）","output":"status、value、count、total、steps / 错误与已完成步骤","errors":["NUMERIC_OVERFLOW"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"test":"tests/average.test.mjs","capabilityId":"average.calculate","id":"avg-compute","parentId":"average","title":"计算平均值","kind":"logic","description":"将实际总和除以数量，返回均值与最终除法步骤。","position":{"x":690,"y":100},"processing":"总和 ÷ 数量，使用 JavaScript 浮点数语义。","code":"server/average.mjs#computeAverage","importance":"core","inputSchema":{"type":"object","required":["count","total","steps"],"properties":{"count":{"type":"integer","minimum":1},"total":{"type":"number"},"steps":{"type":"array","items":{"type":"object"}}}},"outputSchema":{"oneOf":[{"type":"object","required":["status","value","count","total","steps"],"properties":{"status":{"const":"success"},"count":{"type":"integer","minimum":1},"total":{"type":"number"},"steps":{"type":"array","items":{"type":"object"}},"message":{"type":"string"},"value":{"type":"number"}}},{"type":"object","required":["status","code","message"],"properties":{"status":{"const":"invalid"},"code":{"type":"string"},"message":{"type":"string"},"steps":{"type":"array","items":{"type":"object"}}}}]}}],"edges":[{"id":"suite-e1","source":"suite-input","target":"suite-compute","sourceHandle":"ok","targetHandle":"in","label":"计算输入"},{"id":"suite-e2","source":"suite-compute","target":"suite-result","sourceHandle":"ok","targetHandle":"in","label":"结果"},{"id":"suite-e3","source":"suite-compute","target":"suite-result","sourceHandle":"fail","targetHandle":"in","label":"错误"},{"id":"calc-e1","source":"calc-input","target":"calc-validate","sourceHandle":"ok","targetHandle":"in","label":"提交"},{"id":"calc-e2","source":"calc-validate","target":"calc-compute","sourceHandle":"ok","targetHandle":"in","label":"有效"},{"id":"calc-e3","source":"calc-validate","target":"calc-result","sourceHandle":"fail","targetHandle":"in","label":"输入错误"},{"id":"calc-e4","source":"calc-compute","target":"calc-result","sourceHandle":"ok","targetHandle":"in","label":"结果"},{"id":"calc-e5","source":"calc-compute","target":"calc-result","sourceHandle":"fail","targetHandle":"in","label":"超出范围"},{"id":"sum-e1","source":"sum-input","target":"sum-validate","sourceHandle":"ok","targetHandle":"in","label":"提交"},{"id":"sum-e2","source":"sum-validate","target":"sum-accumulate","sourceHandle":"ok","targetHandle":"in","label":"有效"},{"id":"sum-e3","source":"sum-validate","target":"sum-result","sourceHandle":"fail","targetHandle":"in","label":"输入错误"},{"id":"sum-e4","source":"sum-accumulate","target":"sum-result","sourceHandle":"ok","targetHandle":"in","label":"总和"},{"id":"sum-e5","source":"sum-accumulate","target":"sum-result","sourceHandle":"fail","targetHandle":"in","label":"超出范围"},{"id":"expr-e1","source":"expr-input","target":"expr-compute","sourceHandle":"ok","targetHandle":"in","label":"表达式"},{"id":"expr-e2","source":"expr-compute","target":"expr-result","sourceHandle":"ok","targetHandle":"in","label":"结果"},{"id":"expr-e3","source":"expr-compute","target":"expr-result","sourceHandle":"fail","targetHandle":"in","label":"错误"},{"id":"expr-e4","source":"expr-tokenize","target":"expr-parse","sourceHandle":"ok","targetHandle":"in","label":"符号"},{"id":"expr-e5","source":"expr-parse","target":"expr-evaluate","sourceHandle":"ok","targetHandle":"in","label":"运算顺序"},{"id":"avg-e1","source":"avg-validate","target":"avg-accumulate","sourceHandle":"ok","targetHandle":"in","label":"有效数字"},{"id":"avg-e2","source":"avg-accumulate","target":"avg-compute","sourceHandle":"ok","targetHandle":"in","label":"总和与数量"}]}

.. spec:: 计算器
   :id: FUNC_SUITE_7375697465
   :contains: FUNC_SUITE_73756974652D696E707574, FUNC_SUITE_73756974652D636F6D70757465, FUNC_SUITE_73756974652D726573756C74

   功能节点原始字段::

      {"id":"suite","parentId":null,"title":"计算器","kind":"group","description":"输入计算内容，选择计算方式并查看计算过程和结果。","position":{"x":30,"y":40},"size":{"width":1810,"height":2240},"input":"数字或四则表达式","output":"计算结果、执行步骤或错误","errors":[],"fixture":{},"code":"","test":""}

.. spec:: 输入
   :id: FUNC_SUITE_73756974652D696E707574
   :importance: normal
   :flows_to: FUNC_SUITE_73756974652D636F6D70757465

   功能节点原始字段::

      {"id":"suite-input","parentId":"suite","title":"输入","kind":"ui","description":"输入数字和运算符，或选择包含多个数字的演示算式。","position":{"x":20,"y":470},"input":"用户输入","output":"计算输入","errors":[],"fixture":{},"code":"","test":"","importance":"normal"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"suite-e1","source":"suite-input","target":"suite-compute","sourceHandle":"ok","targetHandle":"in","label":"计算输入"}

.. spec:: 计算
   :id: FUNC_SUITE_73756974652D636F6D70757465
   :importance: core
   :contains: FUNC_SUITE_63616C63756C61746F72, FUNC_SUITE_73756D, FUNC_SUITE_65787072657373696F6E, FUNC_SUITE_61766572616765
   :flows_to: FUNC_SUITE_73756974652D726573756C74

   功能节点原始字段::

      {"id":"suite-compute","parentId":"suite","title":"计算","kind":"group","description":"根据所选计算能力处理输入，返回实际计算过程及结果或错误。","position":{"x":250,"y":90},"size":{"width":1300,"height":2040},"input":"计算输入","output":"计算结果和步骤 / 错误","errors":[],"fixture":{},"code":"","test":"","importance":"core"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"suite-e2","source":"suite-compute","target":"suite-result","sourceHandle":"ok","targetHandle":"in","label":"结果"}
      {"id":"suite-e3","source":"suite-compute","target":"suite-result","sourceHandle":"fail","targetHandle":"in","label":"错误"}

.. spec:: 结果
   :id: FUNC_SUITE_73756974652D726573756C74
   :importance: normal

   功能节点原始字段::

      {"id":"suite-result","parentId":"suite","title":"结果","kind":"ui","description":"展示本次计算的结果、执行步骤或错误。","position":{"x":1580,"y":470},"input":"计算结果和步骤 / 错误","output":"可见结果与过程","errors":[],"fixture":{},"code":"","test":"","importance":"normal"}

.. spec:: 两数四则运算
   :id: FUNC_SUITE_63616C63756C61746F72
   :fulfills: REQ_CALC_ALL
   :contains: FUNC_SUITE_63616C632D696E707574, FUNC_SUITE_63616C632D76616C6964617465, FUNC_SUITE_63616C632D636F6D70757465, FUNC_SUITE_63616C632D726573756C74

   功能节点原始字段::

      {"id":"calculator","parentId":"suite-compute","title":"两数四则运算","kind":"group","description":"输入两个数字，执行四则运算并显示结果。","position":{"x":25,"y":80},"size":{"width":970,"height":415},"input":"两个数和运算符","output":"计算结果 / 错误提示","errors":["INVALID_INPUT","DIVISION_BY_ZERO"],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#runCalculation","test":"tests/calculator.test.mjs","capabilityId":"calculator.calculate"}

.. spec:: 输入数字
   :id: FUNC_SUITE_63616C632D696E707574
   :fulfills: REQ_CALC_INPUT
   :flows_to: FUNC_SUITE_63616C632D76616C6964617465

   功能节点原始字段::

      {"id":"calc-input","parentId":"calculator","title":"输入数字","kind":"ui","description":"收集两个输入数字和所选运算符。","position":{"x":35,"y":98},"input":"用户输入","output":"CalculatorDraft","errors":[],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#captureCalculatorInput","test":"tests/calculator.test.mjs","capabilityId":"calculator.calculate"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"calc-e1","source":"calc-input","target":"calc-validate","sourceHandle":"ok","targetHandle":"in","label":"提交"}

.. spec:: 校验输入
   :id: FUNC_SUITE_63616C632D76616C6964617465
   :importance: key
   :fulfills: REQ_CALC_VALIDATE
   :flows_to: FUNC_SUITE_63616C632D636F6D70757465, FUNC_SUITE_63616C632D726573756C74

   功能节点原始字段::

      {"id":"calc-validate","parentId":"calculator","title":"校验输入","kind":"logic","description":"检查数字与运算符；除数为零时拒绝计算。","position":{"x":230,"y":98},"input":"CalculatorDraft","output":"CalculatorInput / 错误","errors":["INVALID_INPUT","DIVISION_BY_ZERO"],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#validateCalculatorInput","test":"tests/calculator.test.mjs","capabilityId":"calculator.calculate","importance":"key"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"calc-e2","source":"calc-validate","target":"calc-compute","sourceHandle":"ok","targetHandle":"in","label":"有效"}
      {"id":"calc-e3","source":"calc-validate","target":"calc-result","sourceHandle":"fail","targetHandle":"in","label":"输入错误"}

.. spec:: 四则运算
   :id: FUNC_SUITE_63616C632D636F6D70757465
   :fulfills: REQ_CALC_COMPUTE
   :flows_to: FUNC_SUITE_63616C632D726573756C74

   功能节点原始字段::

      {"id":"calc-compute","parentId":"calculator","title":"四则运算","kind":"logic","description":"根据运算符执行加减乘除，并检查结果范围。","position":{"x":425,"y":98},"input":"CalculatorInput","output":"计算结果 / 范围错误","errors":["RESULT_OUT_OF_RANGE"],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#computeCalculator","test":"tests/calculator.test.mjs","capabilityId":"calculator.calculate"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"calc-e4","source":"calc-compute","target":"calc-result","sourceHandle":"ok","targetHandle":"in","label":"结果"}
      {"id":"calc-e5","source":"calc-compute","target":"calc-result","sourceHandle":"fail","targetHandle":"in","label":"超出范围"}

.. spec:: 展示结果
   :id: FUNC_SUITE_63616C632D726573756C74
   :fulfills: REQ_CALC_RESULT

   功能节点原始字段::

      {"id":"calc-result","parentId":"calculator","title":"展示结果","kind":"ui","description":"展示计算结果或用户可理解的错误原因。","position":{"x":620,"y":273},"input":"计算结果 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":4,"message":"计算结果：4"},"code":"server/calculator.mjs#calculatorUi","test":"tests/calculator.test.mjs","capabilityId":"calculator.calculate"}

.. spec:: 多数字求和
   :id: FUNC_SUITE_73756D
   :fulfills: REQ_SUM_ALL
   :contains: FUNC_SUITE_73756D2D696E707574, FUNC_SUITE_73756D2D76616C6964617465, FUNC_SUITE_73756D2D616363756D756C617465, FUNC_SUITE_73756D2D726573756C74

   功能节点原始字段::

      {"id":"sum","parentId":"suite-compute","title":"多数字求和","kind":"group","description":"输入至少 3 个数字，按顺序累加并显示每一步。","position":{"x":25,"y":600},"size":{"width":970,"height":415},"input":"至少 3 个数字","output":"总和与逐项累加步骤 / 错误提示","errors":["INVALID_INPUT","RESULT_OUT_OF_RANGE"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"code":"server/sum.mjs#runSum","test":"tests/sum.test.mjs","capabilityId":"sum.calculate"}

.. spec:: 输入数字
   :id: FUNC_SUITE_73756D2D696E707574
   :fulfills: REQ_SUM_INPUT
   :flows_to: FUNC_SUITE_73756D2D76616C6964617465

   功能节点原始字段::

      {"id":"sum-input","parentId":"sum","title":"输入数字","kind":"ui","description":"收集用户输入的多个数字，保留输入顺序。","position":{"x":35,"y":98},"input":"用户输入","output":"SumDraft","errors":[],"fixture":{"values":[1,2,3]},"code":"server/sum.mjs#captureSumInput","test":"tests/sum.test.mjs","capabilityId":"sum.calculate"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"sum-e1","source":"sum-input","target":"sum-validate","sourceHandle":"ok","targetHandle":"in","label":"提交"}

.. spec:: 校验数字
   :id: FUNC_SUITE_73756D2D76616C6964617465
   :importance: key
   :fulfills: REQ_SUM_VALIDATE
   :flows_to: FUNC_SUITE_73756D2D616363756D756C617465, FUNC_SUITE_73756D2D726573756C74

   功能节点原始字段::

      {"id":"sum-validate","parentId":"sum","title":"校验数字","kind":"logic","description":"至少输入三个有效有限数字，并指出无效项。","position":{"x":230,"y":98},"input":"SumDraft","output":"SumInput / 错误","errors":["INVALID_INPUT"],"fixture":{"values":[1,2,3]},"code":"server/sum.mjs#validateSumInput","test":"tests/sum.test.mjs","capabilityId":"sum.calculate","importance":"key"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"sum-e2","source":"sum-validate","target":"sum-accumulate","sourceHandle":"ok","targetHandle":"in","label":"有效"}
      {"id":"sum-e3","source":"sum-validate","target":"sum-result","sourceHandle":"fail","targetHandle":"in","label":"输入错误"}

.. spec:: 逐项累加
   :id: FUNC_SUITE_73756D2D616363756D756C617465
   :fulfills: REQ_SUM_ACCUMULATE
   :flows_to: FUNC_SUITE_73756D2D726573756C74

   功能节点原始字段::

      {"id":"sum-accumulate","parentId":"sum","title":"逐项累加","kind":"logic","description":"按输入顺序逐项累加，记录本次加数、原总和与新总和。","position":{"x":425,"y":98},"input":"SumInput","output":"总和与逐项步骤 / 范围错误","errors":["RESULT_OUT_OF_RANGE"],"fixture":{"values":[1,2,3]},"code":"server/sum.mjs#accumulateSum","test":"tests/sum.test.mjs","capabilityId":"sum.calculate"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"sum-e4","source":"sum-accumulate","target":"sum-result","sourceHandle":"ok","targetHandle":"in","label":"总和"}
      {"id":"sum-e5","source":"sum-accumulate","target":"sum-result","sourceHandle":"fail","targetHandle":"in","label":"超出范围"}

.. spec:: 展示结果
   :id: FUNC_SUITE_73756D2D726573756C74
   :fulfills: REQ_SUM_RESULT

   功能节点原始字段::

      {"id":"sum-result","parentId":"sum","title":"展示结果","kind":"ui","description":"展示总和、每一步累加过程，或清楚说明错误。","position":{"x":620,"y":273},"input":"总和与步骤 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":6,"message":"求和结果：6","steps":[{"index":1,"value":1,"previous":0,"total":1},{"index":2,"value":2,"previous":1,"total":3},{"index":3,"value":3,"previous":3,"total":6}]},"code":"server/sum.mjs#sumUi","test":"tests/sum.test.mjs","capabilityId":"sum.calculate"}

.. spec:: 混合四则运算
   :id: FUNC_SUITE_65787072657373696F6E
   :fulfills: REQ_EXPR_ALL
   :contains: FUNC_SUITE_657870722D696E707574, FUNC_SUITE_657870722D636F6D70757465, FUNC_SUITE_657870722D726573756C74

   功能节点原始字段::

      {"id":"expression","parentId":"suite-compute","title":"混合四则运算","kind":"group","description":"输入表达式，展开计算过程，查看真实计算顺序及结果。","position":{"x":25,"y":1120},"size":{"width":1240,"height":435},"input":"四则表达式","output":"计算步骤和结果 / 错误提示","errors":["INVALID_EXPRESSION","DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#runExpression","test":"tests/expression.test.mjs","capabilityId":"expression.calculate"}

.. spec:: 输入表达式
   :id: FUNC_SUITE_657870722D696E707574
   :fulfills: REQ_EXPR_INPUT
   :flows_to: FUNC_SUITE_657870722D636F6D70757465

   功能节点原始字段::

      {"id":"expr-input","parentId":"expression","title":"输入表达式","kind":"ui","description":"输入数字、加减乘除运算符和括号。","position":{"x":35,"y":145},"input":"用户输入","output":"ExpressionDraft","errors":[],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#captureExpressionInput","test":"tests/expression.test.mjs","capabilityId":"expression.calculate"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"expr-e1","source":"expr-input","target":"expr-compute","sourceHandle":"ok","targetHandle":"in","label":"表达式"}

.. spec:: 计算
   :id: FUNC_SUITE_657870722D636F6D70757465
   :fulfills: REQ_EXPR_COMPUTE
   :contains: FUNC_SUITE_657870722D746F6B656E697A65, FUNC_SUITE_657870722D7061727365, FUNC_SUITE_657870722D6576616C75617465
   :flows_to: FUNC_SUITE_657870722D726573756C74

   功能节点原始字段::

      {"id":"expr-compute","parentId":"expression","title":"计算","kind":"group","description":"依次识别、解析并求值；任一步失败时将错误传给结果节点。","position":{"x":260,"y":95},"size":{"width":665,"height":245},"input":"ExpressionDraft","output":"数值与实际计算步骤 / 错误","errors":["INVALID_EXPRESSION","DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#runExpressionCompute","test":"tests/expression.test.mjs","capabilityId":"expression.calculate"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"expr-e2","source":"expr-compute","target":"expr-result","sourceHandle":"ok","targetHandle":"in","label":"结果"}
      {"id":"expr-e3","source":"expr-compute","target":"expr-result","sourceHandle":"fail","targetHandle":"in","label":"错误"}

.. spec:: 识别数字与符号
   :id: FUNC_SUITE_657870722D746F6B656E697A65
   :fulfills: REQ_EXPR_TOKENIZE
   :flows_to: FUNC_SUITE_657870722D7061727365

   功能节点原始字段::

      {"id":"expr-tokenize","parentId":"expr-compute","title":"识别数字与符号","kind":"logic","description":"识别数字、括号和四则运算符，标记错误位置。","position":{"x":20,"y":83},"input":"表达式文本","output":"Tokens / 错误","errors":["INVALID_CHARACTER","NUMBER_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#tokenizeExpression","test":"tests/expression.test.mjs","capabilityId":"expression.calculate"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"expr-e4","source":"expr-tokenize","target":"expr-parse","sourceHandle":"ok","targetHandle":"in","label":"符号"}

.. spec:: 处理优先级
   :id: FUNC_SUITE_657870722D7061727365
   :importance: key
   :fulfills: REQ_EXPR_PARSE
   :flows_to: FUNC_SUITE_657870722D6576616C75617465

   功能节点原始字段::

      {"id":"expr-parse","parentId":"expr-compute","title":"处理优先级","kind":"logic","description":"处理括号、一元正负和优先级，生成待求值序列。","position":{"x":235,"y":83},"input":"Tokens","output":"运算顺序 / 语法错误","errors":["INVALID_SYNTAX","UNMATCHED_PARENTHESIS"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#parseExpression","test":"tests/expression.test.mjs","capabilityId":"expression.calculate","importance":"key"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"expr-e5","source":"expr-parse","target":"expr-evaluate","sourceHandle":"ok","targetHandle":"in","label":"运算顺序"}

.. spec:: 逐步求值
   :id: FUNC_SUITE_657870722D6576616C75617465
   :fulfills: REQ_EXPR_EVALUATE

   功能节点原始字段::

      {"id":"expr-evaluate","parentId":"expr-compute","title":"逐步求值","kind":"logic","description":"按照真实运算顺序求值并记录每一步；拒绝除零和溢出。","position":{"x":450,"y":83},"input":"运算顺序","output":"结果与计算步骤 / 错误","errors":["DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#evaluateExpression","test":"tests/expression.test.mjs","capabilityId":"expression.calculate"}

.. spec:: 展示结果
   :id: FUNC_SUITE_657870722D726573756C74
   :fulfills: REQ_EXPR_RESULT

   功能节点原始字段::

      {"id":"expr-result","parentId":"expression","title":"展示结果","kind":"ui","description":"展示数值与真实运算过程，或显示带位置的错误信息。","position":{"x":995,"y":145},"input":"计算步骤和结果 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":18,"message":"计算结果：18","steps":[]},"code":"server/expression.mjs#expressionUi","test":"tests/expression.test.mjs","capabilityId":"expression.calculate"}

.. spec:: 平均值
   :id: FUNC_SUITE_61766572616765
   :importance: core
   :fulfills: REQ_AVERAGE_ALL, REQ_AVERAGE_VALIDATE
   :contains: FUNC_SUITE_6176672D76616C6964617465, FUNC_SUITE_6176672D616363756D756C617465, FUNC_SUITE_6176672D636F6D70757465

   功能节点原始字段::

      {"input":"一个或多个有限数字","output":"数量、总和、平均值与步骤 / 错误","errors":["EMPTY_INPUT","INVALID_NUMBER","NUMERIC_OVERFLOW"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"test":"tests/average.test.mjs","capabilityId":"average.calculate","id":"average","parentId":"suite-compute","title":"平均值","kind":"group","description":"计算一个或多个数字的算术平均值，展示数量、总和与真实过程。","position":{"x":25,"y":1680},"size":{"width":1050,"height":300},"processing":"校验数字，顺序累加并计数，再将总和除以数量。","acceptance":"1 至 20 的数量为 20，总和为 210，平均值为 10.5；显示 20 次累加和一次除法。","code":"server/average.mjs#runAverage","inputSchema":{"type":"object","required":["values"],"properties":{"values":{"type":"array","minItems":1,"items":{"type":["number","string"]}}}},"outputSchema":{"type":"object","required":["mode","status","result","ui","trace","observedCalls"],"properties":{"mode":{"enum":["dry-run","sandbox"]},"status":{"enum":["completed","rejected"]},"result":{"oneOf":[{"type":"object","required":["status","value","count","total","steps"],"properties":{"status":{"const":"success"},"count":{"type":"integer","minimum":1},"total":{"type":"number"},"steps":{"type":"array","items":{"type":"object"}},"message":{"type":"string"},"value":{"type":"number"}}},{"type":"object","required":["status","code","message"],"properties":{"status":{"const":"invalid"},"code":{"type":"string"},"message":{"type":"string"},"steps":{"type":"array","items":{"type":"object"}}}}]},"ui":{"type":"object"},"trace":{"type":"array"},"observedCalls":{"type":"array"}}},"importance":"core"}

.. spec:: 校验数字
   :id: FUNC_SUITE_6176672D76616C6964617465
   :importance: key
   :fulfills: REQ_AVERAGE_VALIDATE
   :flows_to: FUNC_SUITE_6176672D616363756D756C617465

   功能节点原始字段::

      {"input":"原始 values 列表（数字或数字字符串，至少一项）","output":"status=valid 与 input.values / status=invalid 与 code、message","errors":["EMPTY_INPUT","INVALID_NUMBER"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"test":"tests/average.test.mjs","capabilityId":"average.calculate","id":"avg-validate","parentId":"average","title":"校验数字","kind":"logic","description":"接受至少一个有限数字，明确指出空项、非法项和越界数字。","position":{"x":30,"y":100},"processing":"保留输入顺序与项位置；允许负数、小数、零和科学计数。","code":"server/average.mjs#validateAverageInput","importance":"key","inputSchema":{"type":"object","required":["values"],"properties":{"values":{"type":"array","minItems":1,"items":{"type":["number","string"]}}}},"outputSchema":{"oneOf":[{"type":"object","required":["status","input"],"properties":{"status":{"const":"valid"},"input":{"type":"object","required":["values"],"properties":{"values":{"type":"array","minItems":1,"items":{"type":"number"}}}}}},{"type":"object","required":["status","code","message"],"properties":{"status":{"const":"invalid"},"code":{"type":"string"},"message":{"type":"string"},"steps":{"type":"array","items":{"type":"object"}}}}]}}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"avg-e1","source":"avg-validate","target":"avg-accumulate","sourceHandle":"ok","targetHandle":"in","label":"有效数字"}

.. spec:: 累加与计数
   :id: FUNC_SUITE_6176672D616363756D756C617465
   :importance: key
   :fulfills: REQ_AVERAGE_ACCUMULATE
   :flows_to: FUNC_SUITE_6176672D636F6D70757465

   功能节点原始字段::

      {"input":"校验后的 input.values（非空有限数字列表）","output":"status、count、total、steps / 错误与已完成步骤","errors":["NUMERIC_OVERFLOW"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"test":"tests/average.test.mjs","capabilityId":"average.calculate","id":"avg-accumulate","parentId":"average","title":"累加与计数","kind":"logic","description":"按顺序逐项累加，记录每次加法和总数量。","position":{"x":360,"y":100},"processing":"从零开始累加；中间结果溢出则保留已经完成的步骤并停止。","code":"server/average.mjs#accumulateAverage","importance":"key","inputSchema":{"type":"object","required":["values"],"properties":{"values":{"type":"array","minItems":1,"items":{"type":"number"}}}},"outputSchema":{"oneOf":[{"type":"object","required":["status","count","total","steps"],"properties":{"status":{"const":"success"},"count":{"type":"integer","minimum":1},"total":{"type":"number"},"steps":{"type":"array","items":{"type":"object"}},"message":{"type":"string"}}},{"type":"object","required":["status","code","message"],"properties":{"status":{"const":"invalid"},"code":{"type":"string"},"message":{"type":"string"},"steps":{"type":"array","items":{"type":"object"}}}}]}}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"avg-e2","source":"avg-accumulate","target":"avg-compute","sourceHandle":"ok","targetHandle":"in","label":"总和与数量"}

.. spec:: 计算平均值
   :id: FUNC_SUITE_6176672D636F6D70757465
   :importance: core
   :fulfills: REQ_AVERAGE_COMPUTE

   功能节点原始字段::

      {"input":"累加结果 count、total、steps（count 为正整数）","output":"status、value、count、total、steps / 错误与已完成步骤","errors":["NUMERIC_OVERFLOW"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"test":"tests/average.test.mjs","capabilityId":"average.calculate","id":"avg-compute","parentId":"average","title":"计算平均值","kind":"logic","description":"将实际总和除以数量，返回均值与最终除法步骤。","position":{"x":690,"y":100},"processing":"总和 ÷ 数量，使用 JavaScript 浮点数语义。","code":"server/average.mjs#computeAverage","importance":"core","inputSchema":{"type":"object","required":["count","total","steps"],"properties":{"count":{"type":"integer","minimum":1},"total":{"type":"number"},"steps":{"type":"array","items":{"type":"object"}}}},"outputSchema":{"oneOf":[{"type":"object","required":["status","value","count","total","steps"],"properties":{"status":{"const":"success"},"count":{"type":"integer","minimum":1},"total":{"type":"number"},"steps":{"type":"array","items":{"type":"object"}},"message":{"type":"string"},"value":{"type":"number"}}},{"type":"object","required":["status","code","message"],"properties":{"status":{"const":"invalid"},"code":{"type":"string"},"message":{"type":"string"},"steps":{"type":"array","items":{"type":"object"}}}}]}}
