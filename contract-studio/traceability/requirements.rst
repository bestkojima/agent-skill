需求与功能图
============

.. 由 contracts/requirements.json 和 contracts/feedback.json 生成；请修改源文件或使用工作台，不要直接编辑。

需求条目
--------

.. req:: 提交反馈
   :id: REQ_FEEDBACK_SUBMIT
   :status: draft

   用户可以提交反馈，系统按顺序校验、查重并反馈结果。

.. req:: 收集反馈内容
   :id: REQ_FEEDBACK_FORM
   :status: draft

   用户在表单中填写标题、分类和内容。

.. req:: 校验反馈字段
   :id: REQ_FEEDBACK_VALIDATE
   :status: draft

   校验标题长度、分类和内容长度；不合法时展示原因。

.. req:: 检查重复反馈
   :id: REQ_FEEDBACK_LOOKUP
   :status: draft

   提交前检查相同分类和标题的反馈，重复时阻止保存。

.. req:: 保存反馈
   :id: REQ_FEEDBACK_SAVE
   :status: draft

   通过校验与查重后保存反馈；演示模式明确区分预演与进程内保存。

.. req:: 展示处理结果
   :id: REQ_FEEDBACK_VIEW
   :status: draft

   页面展示保存、预演、校验失败或重复反馈的结果。

项目功能图
----------

仅包含 contracts/feedback.json 已持久的图；浏览器画布草稿不会自动写入此文件。

.. 持久图完整快照，仅用于过期检测；来源仍以 JSON 文件为准。
   {"version":2,"feature":{"id":"feedback.submit","title":"提交反馈","goal":"填写反馈、检查重复、保存并更新页面"},"nodes":[{"id":"submit","parentId":null,"title":"提交反馈 · 完整功能","kind":"group","description":"折叠时只看业务能力，展开看到内部处理。","position":{"x":50,"y":80},"size":{"width":970,"height":415},"input":"用户反馈","output":"反馈列表更新 / 错误提示","errors":["INVALID","DUPLICATE"],"fixture":{},"code":"server/domain.mjs#runSubmission","test":"tests/domain.test.mjs"},{"id":"form","parentId":"submit","title":"接收输入","kind":"ui","description":"React 从真实表单采集标题、分类和内容。","position":{"x":35,"y":98},"input":"表单字段","output":"FeedbackDraft","errors":[],"fixture":{"title":"建议增加夜间模式","category":"feature","detail":"阅读时希望减少亮度"},"code":"features/feedback/client.tsx#FeedbackPreview","test":"tests/domain.test.mjs"},{"id":"validate","parentId":"submit","title":"字段校验","kind":"logic","description":"验证标题长度、类别和内容长度。","position":{"x":230,"y":98},"input":"FeedbackDraft","output":"FeedbackInput","errors":["INVALID_TITLE","INVALID_CATEGORY","INVALID_DETAIL"],"fixture":{"title":"建议增加夜间模式","category":"feature","detail":"阅读时希望减少亮度"},"code":"server/domain.mjs#validateFeedback","test":"tests/domain.test.mjs","adapter":{"capability":"feedback.validate","default":"javascript","transport":"stdin-json / stdout-json"}},{"id":"lookup","parentId":"submit","title":"异步查重","kind":"async","description":"模拟真实异步数据库读取，检查相同类别和标题。","position":{"x":425,"y":98},"input":"FeedbackInput","output":"DuplicateCheck","errors":["DUPLICATE"],"fixture":{"title":"建议增加夜间模式","category":"feature","detail":"阅读时希望减少亮度"},"code":"server/domain.mjs#findDuplicate","test":"tests/domain.test.mjs"},{"id":"save","parentId":"submit","title":"保存反馈","kind":"action","description":"Dry-run 只展示拟写入数据；Sandbox 写入当前进程内存。","position":{"x":620,"y":98},"input":"FeedbackInput","output":"SavedFeedback / SavePlan","errors":[],"fixture":{"title":"新增键盘快捷键","category":"feature","detail":"支持 Ctrl+Enter 提交"},"code":"server/domain.mjs#saveFeedback","test":"tests/domain.test.mjs"},{"id":"view","parentId":"submit","title":"页面反馈","kind":"ui","description":"向 React 返回成功、预览或失败状态，刷新右侧的反馈列表。","position":{"x":620,"y":273},"input":"SubmissionResult","output":"UIState","errors":[],"fixture":{"status":"saved","item":{"id":"F-8","title":"新增键盘快捷键"}},"code":"server/domain.mjs#toUiState","test":"tests/domain.test.mjs"}],"edges":[{"id":"e1","source":"form","target":"validate","sourceHandle":"ok","targetHandle":"in","label":"提交"},{"id":"e2","source":"validate","target":"lookup","sourceHandle":"ok","targetHandle":"in","label":"合法"},{"id":"e3","source":"validate","target":"view","sourceHandle":"fail","targetHandle":"in","label":"非法"},{"id":"e4","source":"lookup","target":"save","sourceHandle":"ok","targetHandle":"in","label":"未重复"},{"id":"e5","source":"lookup","target":"view","sourceHandle":"fail","targetHandle":"in","label":"重复"},{"id":"e6","source":"save","target":"view","sourceHandle":"ok","targetHandle":"in","label":"结果"}]}

.. spec:: 提交反馈 · 完整功能
   :id: FUNC_7375626D6974
   :fulfills: REQ_FEEDBACK_SUBMIT
   :contains: FUNC_666F726D, FUNC_76616C6964617465, FUNC_6C6F6F6B7570, FUNC_73617665, FUNC_76696577

   功能节点原始字段::

      {"id":"submit","parentId":null,"title":"提交反馈 · 完整功能","kind":"group","description":"折叠时只看业务能力，展开看到内部处理。","position":{"x":50,"y":80},"size":{"width":970,"height":415},"input":"用户反馈","output":"反馈列表更新 / 错误提示","errors":["INVALID","DUPLICATE"],"fixture":{},"code":"server/domain.mjs#runSubmission","test":"tests/domain.test.mjs"}

.. spec:: 接收输入
   :id: FUNC_666F726D
   :fulfills: REQ_FEEDBACK_FORM
   :flows_to: FUNC_76616C6964617465

   功能节点原始字段::

      {"id":"form","parentId":"submit","title":"接收输入","kind":"ui","description":"React 从真实表单采集标题、分类和内容。","position":{"x":35,"y":98},"input":"表单字段","output":"FeedbackDraft","errors":[],"fixture":{"title":"建议增加夜间模式","category":"feature","detail":"阅读时希望减少亮度"},"code":"features/feedback/client.tsx#FeedbackPreview","test":"tests/domain.test.mjs"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"e1","source":"form","target":"validate","sourceHandle":"ok","targetHandle":"in","label":"提交"}

.. spec:: 字段校验
   :id: FUNC_76616C6964617465
   :fulfills: REQ_FEEDBACK_VALIDATE
   :flows_to: FUNC_6C6F6F6B7570, FUNC_76696577

   功能节点原始字段::

      {"id":"validate","parentId":"submit","title":"字段校验","kind":"logic","description":"验证标题长度、类别和内容长度。","position":{"x":230,"y":98},"input":"FeedbackDraft","output":"FeedbackInput","errors":["INVALID_TITLE","INVALID_CATEGORY","INVALID_DETAIL"],"fixture":{"title":"建议增加夜间模式","category":"feature","detail":"阅读时希望减少亮度"},"code":"server/domain.mjs#validateFeedback","test":"tests/domain.test.mjs","adapter":{"capability":"feedback.validate","default":"javascript","transport":"stdin-json / stdout-json"}}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"e2","source":"validate","target":"lookup","sourceHandle":"ok","targetHandle":"in","label":"合法"}
      {"id":"e3","source":"validate","target":"view","sourceHandle":"fail","targetHandle":"in","label":"非法"}

.. spec:: 异步查重
   :id: FUNC_6C6F6F6B7570
   :fulfills: REQ_FEEDBACK_LOOKUP
   :flows_to: FUNC_73617665, FUNC_76696577

   功能节点原始字段::

      {"id":"lookup","parentId":"submit","title":"异步查重","kind":"async","description":"模拟真实异步数据库读取，检查相同类别和标题。","position":{"x":425,"y":98},"input":"FeedbackInput","output":"DuplicateCheck","errors":["DUPLICATE"],"fixture":{"title":"建议增加夜间模式","category":"feature","detail":"阅读时希望减少亮度"},"code":"server/domain.mjs#findDuplicate","test":"tests/domain.test.mjs"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"e4","source":"lookup","target":"save","sourceHandle":"ok","targetHandle":"in","label":"未重复"}
      {"id":"e5","source":"lookup","target":"view","sourceHandle":"fail","targetHandle":"in","label":"重复"}

.. spec:: 保存反馈
   :id: FUNC_73617665
   :fulfills: REQ_FEEDBACK_SAVE
   :flows_to: FUNC_76696577

   功能节点原始字段::

      {"id":"save","parentId":"submit","title":"保存反馈","kind":"action","description":"Dry-run 只展示拟写入数据；Sandbox 写入当前进程内存。","position":{"x":620,"y":98},"input":"FeedbackInput","output":"SavedFeedback / SavePlan","errors":[],"fixture":{"title":"新增键盘快捷键","category":"feature","detail":"支持 Ctrl+Enter 提交"},"code":"server/domain.mjs#saveFeedback","test":"tests/domain.test.mjs"}

   原始业务出边（含端口、分支标签和其他字段）::

      {"id":"e6","source":"save","target":"view","sourceHandle":"ok","targetHandle":"in","label":"结果"}

.. spec:: 页面反馈
   :id: FUNC_76696577
   :fulfills: REQ_FEEDBACK_VIEW

   功能节点原始字段::

      {"id":"view","parentId":"submit","title":"页面反馈","kind":"ui","description":"向 React 返回成功、预览或失败状态，刷新右侧的反馈列表。","position":{"x":620,"y":273},"input":"SubmissionResult","output":"UIState","errors":[],"fixture":{"status":"saved","item":{"id":"F-8","title":"新增键盘快捷键"}},"code":"server/domain.mjs#toUiState","test":"tests/domain.test.mjs"}
