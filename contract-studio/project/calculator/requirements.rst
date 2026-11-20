用户需求
--------

.. req:: 两数四则
   :id: REQ_PYCALC_BASIC

   在同一个输入框输入两个数字和一个二元四则运算符，按「=」或 Enter
   返回结果和一步运算记录。

   * :need_part:`(FOUR) 加、减、乘、除分别得到正确结果。`

.. req:: 混合表达式
   :id: REQ_PYCALC_EXPRESSION

   多运算符或带括号的算式直接按「=」或 Enter。先计算括号内的表达式；
   乘除优先于加减，同级从左到右。
   支持一元正负号，每完成一次二元运算就记录一步。

   * :need_part:`(PRECEDENCE) 12 + 3 × (8 - 4) ÷ 2 得到 18，并按减、乘、除、加记录四步。`

.. req:: 多数字求和
   :id: REQ_PYCALC_SUM

   在输入框填入至少 3 个有限数字，点「求和」。数字之间用一个空格隔开，
   例如 ``1 2 3``。原有的加号分隔写法仍可用。从 0 开始按输入顺序累加，
   显示总和及逐项记录。

   * :need_part:`(TWENTY) 输入 1 至 20，得到 210 并返回 20 次正确累加。`
   * :need_part:`(MINIMUM) 少于 3 个数字时显示输入错误。`
   * :need_part:`(NEGATIVE) 用屏幕空格和减号输入 1 −2 4，求和显示 3，平均值显示 1。`

.. req:: 算术平均值
   :id: REQ_PYCALC_AVERAGE

   在输入框填入一个或多个有限数字，点「平均值」。数字之间用空格隔开，
   可复用「求和」的同一份输入。
   显示数量、总和、平均值；先记录逐项累加，最后记录总和除以数量。

   * :need_part:`(TWENTY) 输入 1 至 20，得到数量 20、总和 210、均值 10.5，记录 20 次累加和最后一次除法。`

.. req:: 输入与运算错误
   :id: REQ_PYCALC_ERRORS

   数字列表含逗号或无效数字，或算式非法、除零或超出计算范围时，显示错误原因。
   累加超出范围时保留之前已完成的步骤，不显示成功结果。

   * :need_part:`(INPUT) 空列表、非法数字与不完整算式返回输入错误；列表输入含半角或全角逗号时，提示改用空格。`
   * :need_part:`(DIV_ZERO) 除零时显示明确错误。`
   * :need_part:`(OVERFLOW) 累加溢出时不返回成功数值，保留已完成的步骤。`

.. req:: 独立 Windows 界面
   :id: REQ_PYCALC_UI

   桌面窗口只用一个输入框。输入算式后按「=」或 Enter；输入数字列表后直接点
   「求和」或「平均值」。三个操作均读取当前输入，不需要切换模式。
   屏幕上的「空格」键与物理键盘空格键都可分隔数字。「载入示例」用空格分隔
   1 至 20，供两个列表操作共用。按 Esc 清空。工作台关闭时也能使用。

   * :need_part:`(DESKTOP) 同一个等号键可计算两数算式和混合算式；载入样例后连续点击求和和平均值，分别显示 210（20 步）和 10.5（21 步）；非法操作显示错误。`

功能节点规格
------------

下面的功能节点由 ``spec`` 自动投影。父子关系表达功能归属，
``flows_to`` 表达数据流；运行时会按触发的计算操作选择路径。
画布坐标单独维护在 ``graph.json``。

.. spec:: 计算器
   :id: SPEC_PYCALC_RUN
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_BASIC, REQ_PYCALC_EXPRESSION, REQ_PYCALC_SUM, REQ_PYCALC_AVERAGE, REQ_PYCALC_ERRORS
   :importance: core
   :node_properties: {"kind":"group","input":"计算操作及算式或数字列表","output":"结果、计算步骤或可读错误","processing":"按操作分派：等号和 Enter 统一走算式解析；求和与平均值走列表校验和累加，仅平均值追加除法。","errors":["未知计算操作","输入无效或超出计算范围"]}

   桌面计算器的运算入口，按操作组织解析与计算，并将结果交给窗口。

.. spec:: 解析两数与混合算式
   :id: SPEC_PYCALC_PARSE
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_BASIC, REQ_PYCALC_EXPRESSION
   :importance: key
   :node_properties: {"kind":"logic","input":"算式文本","output":"数值及完成的二元运算步骤","processing":"两数和混合算式共用解析规则：拆成记号，按括号、优先级及同级从左到右求值。","errors":["空算式或超过 512 字符","无法识别的字符","数字、运算符或括号位置错误"]}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_OPERATE

   确定两数四则或混合算式的求值顺序，逐次调用四则运算。

.. spec:: 执行四则运算
   :id: SPEC_PYCALC_OPERATE
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_BASIC, REQ_PYCALC_ERRORS
   :importance: core
   :node_properties: {"kind":"logic","input":"两个 Decimal 数和一个四则运算符","output":"单步 Decimal 结果","processing":"执行所选的四则运算；除法先拒绝零除数，结果须有限且绝对值不超过约 1.8×10³⁰⁸。","errors":["除数不能为零","结果超出计算范围"]}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_FORMAT

   为算式、累加和平均值提供统一的单步算术规则。

.. spec:: 校验数字列表
   :id: SPEC_PYCALC_LIST
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_SUM, REQ_PYCALC_AVERAGE, REQ_PYCALC_ERRORS
   :importance: key
   :node_properties: {"kind":"logic","input":"空格分隔的数字列表及最少元素个数","output":"按输入顺序排列的有限 Decimal 数","processing":"按空白拆分，兼容原有的分隔用加号；检查数字格式和范围，再检查数量下限：求和 3 项，平均值 1 项。","errors":["请输入数字","有逗号时提示改用空格","无效数字、数量不足或数字越界"]}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_SUM

   将列表文本校验为可直接计算的数字序列；负号接受键盘的 ``-`` 和屏幕按键的 ``−``。

.. spec:: 逐项累加
   :id: SPEC_PYCALC_SUM
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_SUM, REQ_PYCALC_AVERAGE
   :importance: core
   :node_properties: {"kind":"logic","input":"已校验的数字序列","output":"总和与按序排列的累加步骤","processing":"从 0 起逐个相加，每次成功后记录上一步总和、本项和新总和；平均值模式继续计算均值。","errors":["累加越界，保留前面已完成的步骤"]}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_AVERAGE, SPEC_PYCALC_FORMAT

   提供求和与平均值共用的累加过程。直接求和到此结束；平均值还需一次除法。

.. spec:: 计算平均值
   :id: SPEC_PYCALC_AVERAGE
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_AVERAGE
   :importance: core
   :node_properties: {"kind":"logic","input":"总和、元素数量及累加步骤","output":"均值、总和、元素数量及完整步骤","processing":"用总和除以元素数量；将除法记录追加到原有累加步骤末尾。"}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_FORMAT

   根据累加结果生成算术平均值，并保留可核对的计算过程。

.. spec:: 记录真实运算步骤
   :id: SPEC_PYCALC_FORMAT
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_EXPRESSION, REQ_PYCALC_SUM, REQ_PYCALC_AVERAGE
   :importance: normal
   :node_properties: {"kind":"logic","input":"一次真实运算的两个操作数、运算符和结果","output":"包含显示文本与数值的单条运算记录","processing":"直接格式化本次运算的操作数和结果，保留结果数值，供桌面窗口按顺序显示。"}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_UI

   把算式、累加和平均值中的单步运算转为可读记录。

.. spec:: Windows 桌面交互
   :id: SPEC_PYCALC_UI
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_UI
   :importance: normal
   :node_properties: {"kind":"ui","input":"同一输入框的内容及触发的按键","output":"可见结果、按序步骤或错误提示","processing":"等号或 Enter 执行算式；求和或平均值按钮直接执行相应的列表计算。清空上一轮步骤，再显示本次结果或错误。"}
   :parent_spec: SPEC_PYCALC_RUN

   连接 Tkinter 窗口与计算入口，在本地展示这次计算的结果、步骤或错误。
