需求与功能图
============

.. 由 contracts/expression.requirements.json 和 contracts/expression.json 生成；请修改源文件或使用工作台，不要直接编辑。

需求条目
--------

.. req:: 计算混合四则表达式
   :id: REQ_EXPR_ALL
   :status: draft

   用户输入多个数字和加减乘除表达式，查看按实际计算顺序生成的步骤和结果，或明确的错误提示。

.. req:: 输入表达式
   :id: REQ_EXPR_INPUT
   :status: draft

   用户输入数字、加减乘除与括号；减号支持 -、−，乘除支持 ×、÷、\*、/。

.. req:: 执行计算
   :id: REQ_EXPR_COMPUTE
   :status: draft

   识别、解析并求值；任何阶段发生错误时返回错误，不伪造计算结果。

.. req:: 识别数字与运算符
   :id: REQ_EXPR_TOKENIZE
   :status: draft

   识别数字、运算符和括号；非法字符或数值超出范围时指出位置。

.. req:: 处理运算优先级
   :id: REQ_EXPR_PARSE
   :status: draft

   括号优先，其次一元正负，再乘除后加减；同级二元运算从左到右。语法错误指出位置。

.. req:: 逐步求值
   :id: REQ_EXPR_EVALUATE
   :status: draft

   按实际运算顺序计算并记录每步；除数为零或结果溢出时停止并报告位置。计算使用 JavaScript Number 浮点语义，部分小数存在舍入误差，不静默四舍五入。

.. req:: 展示结果或错误
   :id: REQ_EXPR_RESULT
   :status: draft

   展示数值及实际计算步骤，失败时显示可理解的错误和位置。

项目功能图
----------

仅包含 contracts/expression.json 已持久的图；浏览器画布草稿不会自动写入此文件。

.. 持久图完整快照，仅用于过期检测；来源仍以 JSON 文件为准。
   {"version":2,"feature":{"id":"expression.calculate","title":"混合四则表达式","goal":"输入多个数字和四则运算，按括号与优先级计算并展示真实计算顺序"},"nodes":[{"id":"expression","parentId":null,"title":"混合四则计算 · 完整功能","kind":"group","description":"输入表达式，展开计算过程，查看真实计算顺序及结果。","position":{"x":50,"y":80},"size":{"width":1240,"height":435},"input":"四则表达式","output":"计算步骤和结果 / 错误提示","errors":["INVALID_EXPRESSION","DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#runExpression","test":"tests/expression.test.mjs"},{"id":"expr-input","parentId":"expression","title":"输入表达式","kind":"ui","description":"输入数字、加减乘除运算符和括号。","position":{"x":35,"y":145},"input":"用户输入","output":"ExpressionDraft","errors":[],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#captureExpressionInput","test":"tests/expression.test.mjs"},{"id":"expr-compute","parentId":"expression","title":"计算","kind":"group","description":"依次识别、解析并求值；任一步失败时将错误传给结果节点。","position":{"x":260,"y":95},"size":{"width":665,"height":245},"input":"ExpressionDraft","output":"数值与实际计算步骤 / 错误","errors":["INVALID_EXPRESSION","DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#runExpressionCompute","test":"tests/expression.test.mjs"},{"id":"expr-tokenize","parentId":"expr-compute","title":"识别数字与符号","kind":"logic","description":"识别数字、括号和四则运算符，标记错误位置。","position":{"x":20,"y":83},"input":"表达式文本","output":"Tokens / 错误","errors":["INVALID_CHARACTER","NUMBER_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#tokenizeExpression","test":"tests/expression.test.mjs"},{"id":"expr-parse","parentId":"expr-compute","title":"处理优先级","kind":"logic","description":"处理括号、一元正负和优先级，生成待求值序列。","position":{"x":235,"y":83},"input":"Tokens","output":"运算顺序 / 语法错误","errors":["INVALID_SYNTAX","UNMATCHED_PARENTHESIS"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#parseExpression","test":"tests/expression.test.mjs"},{"id":"expr-evaluate","parentId":"expr-compute","title":"逐步求值","kind":"logic","description":"按照真实运算顺序求值并记录每一步；拒绝除零和溢出。","position":{"x":450,"y":83},"input":"运算顺序","output":"结果与计算步骤 / 错误","errors":["DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#evaluateExpression","test":"tests/expression.test.mjs"},{"id":"expr-result","parentId":"expression","title":"展示结果","kind":"ui","description":"展示数值与真实运算过程，或显示带位置的错误信息。","position":{"x":995,"y":145},"input":"计算步骤和结果 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":18,"message":"计算结果：18","steps":[]},"code":"server/expression.mjs#expressionUi","test":"tests/expression.test.mjs"}],"edges":[{"id":"expr-e1","source":"expr-input","target":"expr-compute","sourceHandle":"ok","targetHandle":"in","label":"表达式"},{"id":"expr-e2","source":"expr-compute","target":"expr-result","sourceHandle":"ok","targetHandle":"in","label":"结果"},{"id":"expr-e3","source":"expr-compute","target":"expr-result","sourceHandle":"fail","targetHandle":"in","label":"错误"},{"id":"expr-e4","source":"expr-tokenize","target":"expr-parse","sourceHandle":"ok","targetHandle":"in","label":"符号"},{"id":"expr-e5","source":"expr-parse","target":"expr-evaluate","sourceHandle":"ok","targetHandle":"in","label":"运算顺序"}]}

.. spec:: 混合四则计算 · 完整功能
   :id: FUNC_65787072657373696F6E
   :fulfills: REQ_EXPR_ALL
   :contains: FUNC_657870722D696E707574, FUNC_657870722D636F6D70757465, FUNC_657870722D726573756C74

   功能节点原始字段::

      {"id":"expression","parentId":null,"title":"混合四则计算 · 完整功能","kind":"group","description":"输入表达式，展开计算过程，查看真实计算顺序及结果。","position":{"x":50,"y":80},"size":{"width":1240,"height":435},"input":"四则表达式","output":"计算步骤和结果 / 错误提示","errors":["INVALID_EXPRESSION","DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#runExpression","test":"tests/expression.test.mjs"}

.. spec:: 输入表达式
   :id: FUNC_657870722D696E707574
   :fulfills: REQ_EXPR_INPUT
   :flows_to: FUNC_657870722D636F6D70757465

   功能节点原始字段::

      {"id":"expr-input","parentId":"expression","title":"输入表达式","kind":"ui","description":"输入数字、加减乘除运算符和括号。","position":{"x":35,"y":145},"input":"用户输入","output":"ExpressionDraft","errors":[],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#captureExpressionInput","test":"tests/expression.test.mjs"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"expr-e1","source":"expr-input","target":"expr-compute","sourceHandle":"ok","targetHandle":"in","label":"表达式"}

.. spec:: 计算
   :id: FUNC_657870722D636F6D70757465
   :fulfills: REQ_EXPR_COMPUTE
   :contains: FUNC_657870722D746F6B656E697A65, FUNC_657870722D7061727365, FUNC_657870722D6576616C75617465
   :flows_to: FUNC_657870722D726573756C74

   功能节点原始字段::

      {"id":"expr-compute","parentId":"expression","title":"计算","kind":"group","description":"依次识别、解析并求值；任一步失败时将错误传给结果节点。","position":{"x":260,"y":95},"size":{"width":665,"height":245},"input":"ExpressionDraft","output":"数值与实际计算步骤 / 错误","errors":["INVALID_EXPRESSION","DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#runExpressionCompute","test":"tests/expression.test.mjs"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"expr-e2","source":"expr-compute","target":"expr-result","sourceHandle":"ok","targetHandle":"in","label":"结果"}
      {"id":"expr-e3","source":"expr-compute","target":"expr-result","sourceHandle":"fail","targetHandle":"in","label":"错误"}

.. spec:: 识别数字与符号
   :id: FUNC_657870722D746F6B656E697A65
   :fulfills: REQ_EXPR_TOKENIZE
   :flows_to: FUNC_657870722D7061727365

   功能节点原始字段::

      {"id":"expr-tokenize","parentId":"expr-compute","title":"识别数字与符号","kind":"logic","description":"识别数字、括号和四则运算符，标记错误位置。","position":{"x":20,"y":83},"input":"表达式文本","output":"Tokens / 错误","errors":["INVALID_CHARACTER","NUMBER_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#tokenizeExpression","test":"tests/expression.test.mjs"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"expr-e4","source":"expr-tokenize","target":"expr-parse","sourceHandle":"ok","targetHandle":"in","label":"符号"}

.. spec:: 处理优先级
   :id: FUNC_657870722D7061727365
   :fulfills: REQ_EXPR_PARSE
   :flows_to: FUNC_657870722D6576616C75617465

   功能节点原始字段::

      {"id":"expr-parse","parentId":"expr-compute","title":"处理优先级","kind":"logic","description":"处理括号、一元正负和优先级，生成待求值序列。","position":{"x":235,"y":83},"input":"Tokens","output":"运算顺序 / 语法错误","errors":["INVALID_SYNTAX","UNMATCHED_PARENTHESIS"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#parseExpression","test":"tests/expression.test.mjs"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"expr-e5","source":"expr-parse","target":"expr-evaluate","sourceHandle":"ok","targetHandle":"in","label":"运算顺序"}

.. spec:: 逐步求值
   :id: FUNC_657870722D6576616C75617465
   :fulfills: REQ_EXPR_EVALUATE

   功能节点原始字段::

      {"id":"expr-evaluate","parentId":"expr-compute","title":"逐步求值","kind":"logic","description":"按照真实运算顺序求值并记录每一步；拒绝除零和溢出。","position":{"x":450,"y":83},"input":"运算顺序","output":"结果与计算步骤 / 错误","errors":["DIVISION_BY_ZERO","RESULT_OUT_OF_RANGE"],"fixture":{"expression":"12 + 3 × (8 - 4) ÷ 2"},"code":"server/expression.mjs#evaluateExpression","test":"tests/expression.test.mjs"}

.. spec:: 展示结果
   :id: FUNC_657870722D726573756C74
   :fulfills: REQ_EXPR_RESULT

   功能节点原始字段::

      {"id":"expr-result","parentId":"expression","title":"展示结果","kind":"ui","description":"展示数值与真实运算过程，或显示带位置的错误信息。","position":{"x":995,"y":145},"input":"计算步骤和结果 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":18,"message":"计算结果：18","steps":[]},"code":"server/expression.mjs#expressionUi","test":"tests/expression.test.mjs"}
