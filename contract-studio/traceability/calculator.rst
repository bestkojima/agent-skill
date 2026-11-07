需求与功能图
============

.. 由 contracts/calculator.requirements.json 和 contracts/calculator.json 生成；请修改源文件或使用工作台，不要直接编辑。

需求条目
--------

.. req:: 计算两个数
   :id: REQ_CALC_ALL
   :status: draft

   用户可以输入两个数字，选择加减乘除，查看结果或错误提示。

.. req:: 输入数字和运算符
   :id: REQ_CALC_INPUT
   :status: draft

   用户输入两个数字并选择加、减、乘或除。

.. req:: 校验输入与除数
   :id: REQ_CALC_VALIDATE
   :status: draft

   输入必须为有效有限数字，运算符必须受支持；除数不能为零。

.. req:: 执行四则运算
   :id: REQ_CALC_COMPUTE
   :status: draft

   根据所选运算符计算结果；结果超出数值范围时显示错误。

.. req:: 显示结果或错误
   :id: REQ_CALC_RESULT
   :status: draft

   页面清楚展示计算结果，或说明无法计算的原因。

项目功能图
----------

仅包含 contracts/calculator.json 已持久的图；浏览器画布草稿不会自动写入此文件。

.. 持久图完整快照，仅用于过期检测；来源仍以 JSON 文件为准。
   {"version":2,"feature":{"id":"calculator.calculate","title":"计算器","goal":"输入两个数和运算符，计算并展示结果或明确错误"},"nodes":[{"id":"calculator","parentId":null,"title":"计算器 · 完整功能","kind":"group","description":"输入两个数字，执行四则运算并显示结果。","position":{"x":50,"y":80},"size":{"width":970,"height":415},"input":"两个数和运算符","output":"计算结果 / 错误提示","errors":["INVALID_INPUT","DIVISION_BY_ZERO"],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#runCalculation","test":"tests/calculator.test.mjs"},{"id":"calc-input","parentId":"calculator","title":"输入数字","kind":"ui","description":"收集两个输入数字和所选运算符。","position":{"x":35,"y":98},"input":"用户输入","output":"CalculatorDraft","errors":[],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#captureCalculatorInput","test":"tests/calculator.test.mjs"},{"id":"calc-validate","parentId":"calculator","title":"校验输入","kind":"logic","description":"检查数字与运算符；除数为零时拒绝计算。","position":{"x":230,"y":98},"input":"CalculatorDraft","output":"CalculatorInput / 错误","errors":["INVALID_INPUT","DIVISION_BY_ZERO"],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#validateCalculatorInput","test":"tests/calculator.test.mjs"},{"id":"calc-compute","parentId":"calculator","title":"四则运算","kind":"logic","description":"根据运算符执行加减乘除，并检查结果范围。","position":{"x":425,"y":98},"input":"CalculatorInput","output":"计算结果 / 范围错误","errors":["RESULT_OUT_OF_RANGE"],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#computeCalculator","test":"tests/calculator.test.mjs"},{"id":"calc-result","parentId":"calculator","title":"展示结果","kind":"ui","description":"展示计算结果或用户可理解的错误原因。","position":{"x":620,"y":273},"input":"计算结果 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":4,"message":"计算结果：4"},"code":"server/calculator.mjs#calculatorUi","test":"tests/calculator.test.mjs"}],"edges":[{"id":"calc-e1","source":"calc-input","target":"calc-validate","sourceHandle":"ok","targetHandle":"in","label":"提交"},{"id":"calc-e2","source":"calc-validate","target":"calc-compute","sourceHandle":"ok","targetHandle":"in","label":"有效"},{"id":"calc-e3","source":"calc-validate","target":"calc-result","sourceHandle":"fail","targetHandle":"in","label":"输入错误"},{"id":"calc-e4","source":"calc-compute","target":"calc-result","sourceHandle":"ok","targetHandle":"in","label":"结果"},{"id":"calc-e5","source":"calc-compute","target":"calc-result","sourceHandle":"fail","targetHandle":"in","label":"超出范围"}]}

.. spec:: 计算器 · 完整功能
   :id: FUNC_63616C63756C61746F72
   :fulfills: REQ_CALC_ALL
   :contains: FUNC_63616C632D696E707574, FUNC_63616C632D76616C6964617465, FUNC_63616C632D636F6D70757465, FUNC_63616C632D726573756C74

   功能节点原始字段::

      {"id":"calculator","parentId":null,"title":"计算器 · 完整功能","kind":"group","description":"输入两个数字，执行四则运算并显示结果。","position":{"x":50,"y":80},"size":{"width":970,"height":415},"input":"两个数和运算符","output":"计算结果 / 错误提示","errors":["INVALID_INPUT","DIVISION_BY_ZERO"],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#runCalculation","test":"tests/calculator.test.mjs"}

.. spec:: 输入数字
   :id: FUNC_63616C632D696E707574
   :fulfills: REQ_CALC_INPUT
   :flows_to: FUNC_63616C632D76616C6964617465

   功能节点原始字段::

      {"id":"calc-input","parentId":"calculator","title":"输入数字","kind":"ui","description":"收集两个输入数字和所选运算符。","position":{"x":35,"y":98},"input":"用户输入","output":"CalculatorDraft","errors":[],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#captureCalculatorInput","test":"tests/calculator.test.mjs"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"calc-e1","source":"calc-input","target":"calc-validate","sourceHandle":"ok","targetHandle":"in","label":"提交"}

.. spec:: 校验输入
   :id: FUNC_63616C632D76616C6964617465
   :fulfills: REQ_CALC_VALIDATE
   :flows_to: FUNC_63616C632D636F6D70757465, FUNC_63616C632D726573756C74

   功能节点原始字段::

      {"id":"calc-validate","parentId":"calculator","title":"校验输入","kind":"logic","description":"检查数字与运算符；除数为零时拒绝计算。","position":{"x":230,"y":98},"input":"CalculatorDraft","output":"CalculatorInput / 错误","errors":["INVALID_INPUT","DIVISION_BY_ZERO"],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#validateCalculatorInput","test":"tests/calculator.test.mjs"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"calc-e2","source":"calc-validate","target":"calc-compute","sourceHandle":"ok","targetHandle":"in","label":"有效"}
      {"id":"calc-e3","source":"calc-validate","target":"calc-result","sourceHandle":"fail","targetHandle":"in","label":"输入错误"}

.. spec:: 四则运算
   :id: FUNC_63616C632D636F6D70757465
   :fulfills: REQ_CALC_COMPUTE
   :flows_to: FUNC_63616C632D726573756C74

   功能节点原始字段::

      {"id":"calc-compute","parentId":"calculator","title":"四则运算","kind":"logic","description":"根据运算符执行加减乘除，并检查结果范围。","position":{"x":425,"y":98},"input":"CalculatorInput","output":"计算结果 / 范围错误","errors":["RESULT_OUT_OF_RANGE"],"fixture":{"left":"12","right":"3","operator":"/"},"code":"server/calculator.mjs#computeCalculator","test":"tests/calculator.test.mjs"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"calc-e4","source":"calc-compute","target":"calc-result","sourceHandle":"ok","targetHandle":"in","label":"结果"}
      {"id":"calc-e5","source":"calc-compute","target":"calc-result","sourceHandle":"fail","targetHandle":"in","label":"超出范围"}

.. spec:: 展示结果
   :id: FUNC_63616C632D726573756C74
   :fulfills: REQ_CALC_RESULT

   功能节点原始字段::

      {"id":"calc-result","parentId":"calculator","title":"展示结果","kind":"ui","description":"展示计算结果或用户可理解的错误原因。","position":{"x":620,"y":273},"input":"计算结果 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":4,"message":"计算结果：4"},"code":"server/calculator.mjs#calculatorUi","test":"tests/calculator.test.mjs"}
