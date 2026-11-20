Windows 计算器
==============

以平均值为例：在工作台点「计算平均值」，可以看到需求
:need:`REQ_PYCALC_AVERAGE`、节点规格 :need:`SPEC_PYCALC_AVERAGE`
和测试 :need:`TEST_PYCALC_AVG20`。该测试的 ``verifies`` 同时引用
:need:`REQ_PYCALC_AVERAGE.TWENTY` 和直接验证的平均值规格。CodeLinks 从规格 ID 注释定位
``calculator.py`` 的 ``_average``，从测试声明定位实际用例。

运行 ``python project/calculator/run_tests.py`` 后，项目按测试 ID 写出结果。
工作台用同一个 ID 展示通过、失败或待复验。源码中的关联在运行测试前也能查看。

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

下面的 ``spec`` 描述实现函数的职责和输入输出。CodeLinks 读取函数旁的规格 ID，
自动关联源码；同一个规格可以由多个函数实现。父子关系表示功能归属，
``flows_to`` 表示数据从哪里传到哪里，不表示完整的函数调用顺序。
画布坐标单独维护在 ``graph.json``。

.. spec:: 计算器
   :id: SPEC_PYCALC_RUN
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_BASIC, REQ_PYCALC_EXPRESSION, REQ_PYCALC_SUM, REQ_PYCALC_AVERAGE, REQ_PYCALC_ERRORS
   :importance: core
   :node_properties: {"kind":"group","input":"text：算式或列表文本；mode：计算方式，默认 expression","output":"Result：结果值与步骤；列表计算还返回数量和总和","processing":"用 28 位 Decimal 精度执行。算式交给解析函数；求和指定至少 3 项，平均值指定至少 1 项，然后校验并累加，仅平均值再做除法。","errors":["未知计算模式","输入无效或结果超出计算范围"]}

   ``calculate`` 是运算入口，负责分派和设定列表的最少项数。桌面上的
   「=」和 Enter 都使用 ``expression``；代码调用仍可用 ``basic`` 限制两数运算。
   「求和」传 ``sum``，「平均值」传 ``average``。

.. spec:: 解析两数与混合算式
   :id: SPEC_PYCALC_PARSE
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_BASIC, REQ_PYCALC_EXPRESSION
   :importance: key
   :node_properties: {"kind":"logic","input":"text：算式文本；basic：是否限定为两数四则，默认 False","output":"Result：数值和按实际顺序记录的二元运算步骤","processing":"识别一元正负号；按括号、优先级和同级从左到右求值。basic 为 True 时不接受括号，并且只允许一次二元运算。","errors":["空算式或超过 512 字符","无法识别的字符","数字、运算符或括号位置错误","两数四则模式需要两个数字和一个运算符"]}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_OPERATE

   ``_expression`` 确定求值顺序，逐次调用四则运算并记录步骤。
   ``basic`` 是调用方传入的限制，桌面界面没有单独的两数模式。

.. spec:: 执行四则运算
   :id: SPEC_PYCALC_OPERATE
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_BASIC, REQ_PYCALC_ERRORS
   :importance: core
   :node_properties: {"kind":"logic","input":"left、right：两个 Decimal 数；op：+、-、* 或 /","output":"Decimal：单步计算结果","processing":"执行所选的四则运算；除法先拒绝零除数，结果须有限且绝对值不超过约 1.8×10³⁰⁸。","errors":["除数不能为零","结果超出计算范围"]}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_FORMAT

   ``_apply`` 为算式、累加和平均值提供单步算术，不生成步骤文本。

.. spec:: 校验数字列表
   :id: SPEC_PYCALC_LIST
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_SUM, REQ_PYCALC_AVERAGE, REQ_PYCALC_ERRORS
   :importance: key
   :node_properties: {"kind":"logic","input":"text：空格分隔的数字列表；minimum：调用方传入的最少项数","output":"list[Decimal]：按原顺序返回通过校验的有限数字","processing":"按空白拆分，兼容原有的分隔用加号；检查每项格式、范围及总项数是否达到 minimum。","errors":["请输入数字","有逗号时提示改用空格","无效数字、数量不足或数字越界"]}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_SUM

   ``_parse_list`` 按传入的 ``minimum`` 校验，不选择计算方式。
   负号接受键盘的 ``-`` 和屏幕按键的 ``−``。

.. spec:: 逐项累加
   :id: SPEC_PYCALC_SUM
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_SUM, REQ_PYCALC_AVERAGE
   :importance: core
   :node_properties: {"kind":"logic","input":"values：已校验的 Decimal 列表","output":"总和 Decimal 与累加步骤元组","processing":"从 0 开始逐个相加，每步记录上一步总和、本项和新总和。","errors":["累加越界，保留前面已完成的步骤"]}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_AVERAGE, SPEC_PYCALC_FORMAT

   ``_accumulate`` 只负责累加。总和和步骤返回给调用方，由
   :need:`SPEC_PYCALC_RUN` 决定是否进入平均值计算。

.. spec:: 计算平均值
   :id: SPEC_PYCALC_AVERAGE
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_AVERAGE
   :importance: core
   :node_properties: {"kind":"logic","input":"total：总和；count：已校验的正整数项数；steps：累加步骤元组","output":"Result：均值、总和、项数与完整步骤","processing":"将 count 转为 Decimal，用 total 除以 count；把这一步追加到原有累加步骤后。"}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_FORMAT

   ``_average`` 接收已算好的总和与数量，不读取列表文本，也不重复累加。

.. spec:: 记录真实运算步骤
   :id: SPEC_PYCALC_FORMAT
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_EXPRESSION, REQ_PYCALC_SUM, REQ_PYCALC_AVERAGE
   :importance: normal
   :node_properties: {"kind":"logic","input":"left、right：操作数；symbol：显示用运算符；result：已算出的结果","output":"Step：可读的 label 与原始 Decimal 数值 value","processing":"把传入的操作数和已算出的结果排成一行。"}
   :parent_spec: SPEC_PYCALC_RUN
   :flows_to: SPEC_PYCALC_UI

   ``format_step`` 把算式、累加和平均值中的单步运算转为可读记录，
   不再做一遍计算。

.. spec:: Windows 桌面交互
   :id: SPEC_PYCALC_UI
   :feature_id: calculator.suite
   :fulfills: REQ_PYCALC_UI
   :importance: normal
   :node_properties: {"kind":"ui","input":"窗口、输入框内的文本以及按键或计算操作","output":"桌面窗口的输入、结果、按序步骤和错误提示","processing":"绑定按钮及 Enter/Esc，处理屏幕键和示例；计算时读取当前输入并调用 calculate，清空旧步骤后显示本次结果或错误。"}
   :parent_spec: SPEC_PYCALC_RUN

   * ``main()`` 独立启动 Tkinter 窗口；``CalculatorWindow.__init__(root)`` 创建控件，
     将「=」、Enter、求和、平均值和 Esc 绑定到相应的操作。
   * ``press(key)`` 处理屏幕键盘：「空格」插入一个空格，退格删除字符，
     「C」清空输入、结果及步骤。
   * ``load_example()`` 只填入以空格分隔的 1 至 20，不自动计算。
   * ``evaluate(operation)`` 读取当前文本，调用运算入口并更新显示；
     出错时显示原因及错误携带的已完成步骤。
