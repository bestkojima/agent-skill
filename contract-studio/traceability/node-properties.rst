:orphan:

节点字段投影
============

.. 由契约源生成的 needextend 字段；请编辑契约源。

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
