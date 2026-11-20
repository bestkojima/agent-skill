.. req:: 两数四则
   :id: REQ_PYCALC_BASIC

   输入两个数字与一个四则运算符，返回结果。

   * :need_part:`(FOUR) 加、减、乘、除分别得到正确结果。`

.. req:: 混合表达式
   :id: REQ_PYCALC_EXPRESSION

   按括号与运算优先级求值，展示实际计算顺序。

   * :need_part:`(PRECEDENCE) 12 + 3 × (8 - 4) ÷ 2 得到 18，并按减、乘、除、加记录四步。`

.. req:: 多数字求和
   :id: REQ_PYCALC_SUM

   至少输入 3 个有限数字，逐项累加并展示每一步。

   * :need_part:`(TWENTY) 输入 1 至 20，得到 210 并返回 20 次正确累加。`
   * :need_part:`(MINIMUM) 少于 3 个数字时显示输入错误。`

.. req:: 算术平均值
   :id: REQ_PYCALC_AVERAGE

   接受一个或多个有限数字，显示数量、总和、平均值和计算步骤。

   * :need_part:`(TWENTY) 输入 1 至 20，得到数量 20、总和 210、均值 10.5，记录 20 次累加和最后一次除法。`

.. req:: 输入与运算错误
   :id: REQ_PYCALC_ERRORS

   无效字符、空项、非法算式和除零必须可见，不显示伪造的结果。

   * :need_part:`(INPUT) 空列表、空项、非法数字与不完整算式返回输入错误。`
   * :need_part:`(DIV_ZERO) 除零时显示明确错误。`
   * :need_part:`(OVERFLOW) 累加溢出时不返回成功数值，保留已完成的步骤。`

.. req:: 独立 Windows 界面
   :id: REQ_PYCALC_UI

   用户可通过数字键盘、键盘输入、模式选择和示例操作计算器；工作台关闭时本应用仍可启动。

   * :need_part:`(DESKTOP) 载入平均值示例并计算，显示 10.5 和 21 步过程；非法操作显示错误。`

.. spec:: 计算器
   :id: SPEC_PYCALC_RUN
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_ERRORS
   :importance: core
   :node_properties: {"kind":"group","input":"算式或数字列表","output":"计算结果、步骤或错误","size":{"width":940,"height":580},"position":{"x":40,"y":40}}

   计算器。

.. spec:: 解析两数与混合算式
   :id: SPEC_PYCALC_PARSE
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_BASIC, REQ_PYCALC_EXPRESSION
   :importance: key
   :node_properties: {"kind":"logic","input":"算式文本","output":"按优先级求值的结果"}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_OPERATE

   解析两数与混合算式。

.. spec:: 执行四则运算
   :id: SPEC_PYCALC_OPERATE
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_BASIC, REQ_PYCALC_ERRORS
   :importance: core
   :node_properties: {"kind":"logic","input":"两个数字和运算符","output":"单步计算结果"}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_FORMAT

   执行四则运算。

.. spec:: 校验数字列表
   :id: SPEC_PYCALC_LIST
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_SUM, REQ_PYCALC_ERRORS
   :importance: key
   :node_properties: {"kind":"logic","input":"带分隔符的数字列表","output":"有限数字列表"}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_SUM

   校验数字列表。

.. spec:: 逐项累加
   :id: SPEC_PYCALC_SUM
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_SUM
   :importance: core
   :node_properties: {"kind":"logic","input":"已校验数字","output":"总和与累加步骤"}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_AVERAGE

   逐项累加。

.. spec:: 计算平均值
   :id: SPEC_PYCALC_AVERAGE
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_AVERAGE
   :importance: core
   :node_properties: {"kind":"logic","input":"总和与数量","output":"均值与除法步骤"}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_FORMAT

   计算平均值。

.. spec:: 记录真实运算步骤
   :id: SPEC_PYCALC_FORMAT
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_EXPRESSION, REQ_PYCALC_AVERAGE
   :importance: normal
   :node_properties: {"kind":"logic","input":"本次运算参数和结果","output":"可读的运算记录"}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_UI

   记录真实运算步骤。

.. spec:: Windows 桌面交互
   :id: SPEC_PYCALC_UI
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_UI
   :importance: normal
   :node_properties: {"kind":"ui","input":"键盘或按钮输入","output":"可见结果、步骤或错误"}
   :parent_spec: SPEC_PYCALC_RUN

   Windows 桌面交互。
