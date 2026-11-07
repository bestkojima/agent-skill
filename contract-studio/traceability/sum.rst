需求与功能图
============

.. 由 contracts/sum.requirements.json 和 contracts/sum.json 生成；请修改源文件或使用工作台，不要直接编辑。

需求条目
--------

.. req:: 计算多个数字的总和
   :id: REQ_SUM_ALL
   :status: draft

   用户可以输入至少 3 个数字，查看总和和每一步累加过程；有效输入数量不设 20 项上限。

.. req:: 输入多个数字
   :id: REQ_SUM_INPUT
   :status: draft

   用户按顺序输入多个数字；演示预填 1 至 20。

.. req:: 校验输入
   :id: REQ_SUM_VALIDATE
   :status: draft

   至少提供 3 个有效有限数字；空项、非法项或超出范围的数字须明确提示位置。

.. req:: 逐项累加
   :id: REQ_SUM_ACCUMULATE
   :status: draft

   按输入顺序把每个数加入运行中的总和，记录每一步的原总和、加数与新总和。

.. req:: 展示总和与过程
   :id: REQ_SUM_RESULT
   :status: draft

   展示总和和真实累加步骤；无法计算时显示错误原因。

项目功能图
----------

仅包含 contracts/sum.json 已持久的图；浏览器画布草稿不会自动写入此文件。

.. 持久图完整快照，仅用于过期检测；来源仍以 JSON 文件为准。
   {"version":2,"feature":{"id":"sum.calculate","title":"多数字求和","goal":"输入至少三个数字，逐项累加并展示完整过程"},"nodes":[{"id":"sum","parentId":null,"title":"多数字求和 · 完整功能","kind":"group","description":"输入至少 3 个数字，按顺序累加并显示每一步。","position":{"x":50,"y":80},"size":{"width":970,"height":415},"input":"至少 3 个数字","output":"总和与逐项累加步骤 / 错误提示","errors":["INVALID_INPUT","RESULT_OUT_OF_RANGE"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"code":"server/sum.mjs#runSum","test":"tests/sum.test.mjs"},{"id":"sum-input","parentId":"sum","title":"输入数字","kind":"ui","description":"收集用户输入的多个数字，保留输入顺序。","position":{"x":35,"y":98},"input":"用户输入","output":"SumDraft","errors":[],"fixture":{"values":[1,2,3]},"code":"server/sum.mjs#captureSumInput","test":"tests/sum.test.mjs"},{"id":"sum-validate","parentId":"sum","title":"校验数字","kind":"logic","description":"至少输入三个有效有限数字，并指出无效项。","position":{"x":230,"y":98},"input":"SumDraft","output":"SumInput / 错误","errors":["INVALID_INPUT"],"fixture":{"values":[1,2,3]},"code":"server/sum.mjs#validateSumInput","test":"tests/sum.test.mjs"},{"id":"sum-accumulate","parentId":"sum","title":"逐项累加","kind":"logic","description":"按输入顺序逐项累加，记录本次加数、原总和与新总和。","position":{"x":425,"y":98},"input":"SumInput","output":"总和与逐项步骤 / 范围错误","errors":["RESULT_OUT_OF_RANGE"],"fixture":{"values":[1,2,3]},"code":"server/sum.mjs#accumulateSum","test":"tests/sum.test.mjs"},{"id":"sum-result","parentId":"sum","title":"展示结果","kind":"ui","description":"展示总和、每一步累加过程，或清楚说明错误。","position":{"x":620,"y":273},"input":"总和与步骤 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":6,"message":"求和结果：6","steps":[{"index":1,"value":1,"previous":0,"total":1},{"index":2,"value":2,"previous":1,"total":3},{"index":3,"value":3,"previous":3,"total":6}]},"code":"server/sum.mjs#sumUi","test":"tests/sum.test.mjs"}],"edges":[{"id":"sum-e1","source":"sum-input","target":"sum-validate","sourceHandle":"ok","targetHandle":"in","label":"提交"},{"id":"sum-e2","source":"sum-validate","target":"sum-accumulate","sourceHandle":"ok","targetHandle":"in","label":"有效"},{"id":"sum-e3","source":"sum-validate","target":"sum-result","sourceHandle":"fail","targetHandle":"in","label":"输入错误"},{"id":"sum-e4","source":"sum-accumulate","target":"sum-result","sourceHandle":"ok","targetHandle":"in","label":"总和"},{"id":"sum-e5","source":"sum-accumulate","target":"sum-result","sourceHandle":"fail","targetHandle":"in","label":"超出范围"}]}

.. spec:: 多数字求和 · 完整功能
   :id: FUNC_73756D
   :fulfills: REQ_SUM_ALL
   :contains: FUNC_73756D2D696E707574, FUNC_73756D2D76616C6964617465, FUNC_73756D2D616363756D756C617465, FUNC_73756D2D726573756C74

   功能节点原始字段::

      {"id":"sum","parentId":null,"title":"多数字求和 · 完整功能","kind":"group","description":"输入至少 3 个数字，按顺序累加并显示每一步。","position":{"x":50,"y":80},"size":{"width":970,"height":415},"input":"至少 3 个数字","output":"总和与逐项累加步骤 / 错误提示","errors":["INVALID_INPUT","RESULT_OUT_OF_RANGE"],"fixture":{"values":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},"code":"server/sum.mjs#runSum","test":"tests/sum.test.mjs"}

.. spec:: 输入数字
   :id: FUNC_73756D2D696E707574
   :fulfills: REQ_SUM_INPUT
   :flows_to: FUNC_73756D2D76616C6964617465

   功能节点原始字段::

      {"id":"sum-input","parentId":"sum","title":"输入数字","kind":"ui","description":"收集用户输入的多个数字，保留输入顺序。","position":{"x":35,"y":98},"input":"用户输入","output":"SumDraft","errors":[],"fixture":{"values":[1,2,3]},"code":"server/sum.mjs#captureSumInput","test":"tests/sum.test.mjs"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"sum-e1","source":"sum-input","target":"sum-validate","sourceHandle":"ok","targetHandle":"in","label":"提交"}

.. spec:: 校验数字
   :id: FUNC_73756D2D76616C6964617465
   :fulfills: REQ_SUM_VALIDATE
   :flows_to: FUNC_73756D2D616363756D756C617465, FUNC_73756D2D726573756C74

   功能节点原始字段::

      {"id":"sum-validate","parentId":"sum","title":"校验数字","kind":"logic","description":"至少输入三个有效有限数字，并指出无效项。","position":{"x":230,"y":98},"input":"SumDraft","output":"SumInput / 错误","errors":["INVALID_INPUT"],"fixture":{"values":[1,2,3]},"code":"server/sum.mjs#validateSumInput","test":"tests/sum.test.mjs"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"sum-e2","source":"sum-validate","target":"sum-accumulate","sourceHandle":"ok","targetHandle":"in","label":"有效"}
      {"id":"sum-e3","source":"sum-validate","target":"sum-result","sourceHandle":"fail","targetHandle":"in","label":"输入错误"}

.. spec:: 逐项累加
   :id: FUNC_73756D2D616363756D756C617465
   :fulfills: REQ_SUM_ACCUMULATE
   :flows_to: FUNC_73756D2D726573756C74

   功能节点原始字段::

      {"id":"sum-accumulate","parentId":"sum","title":"逐项累加","kind":"logic","description":"按输入顺序逐项累加，记录本次加数、原总和与新总和。","position":{"x":425,"y":98},"input":"SumInput","output":"总和与逐项步骤 / 范围错误","errors":["RESULT_OUT_OF_RANGE"],"fixture":{"values":[1,2,3]},"code":"server/sum.mjs#accumulateSum","test":"tests/sum.test.mjs"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"sum-e4","source":"sum-accumulate","target":"sum-result","sourceHandle":"ok","targetHandle":"in","label":"总和"}
      {"id":"sum-e5","source":"sum-accumulate","target":"sum-result","sourceHandle":"fail","targetHandle":"in","label":"超出范围"}

.. spec:: 展示结果
   :id: FUNC_73756D2D726573756C74
   :fulfills: REQ_SUM_RESULT

   功能节点原始字段::

      {"id":"sum-result","parentId":"sum","title":"展示结果","kind":"ui","description":"展示总和、每一步累加过程，或清楚说明错误。","position":{"x":620,"y":273},"input":"总和与步骤 / 错误","output":"可见反馈","errors":[],"fixture":{"status":"success","value":6,"message":"求和结果：6","steps":[{"index":1,"value":1,"previous":0,"total":1},{"index":2,"value":2,"previous":1,"total":3},{"index":3,"value":3,"previous":3,"total":6}]},"code":"server/sum.mjs#sumUi","test":"tests/sum.test.mjs"}
