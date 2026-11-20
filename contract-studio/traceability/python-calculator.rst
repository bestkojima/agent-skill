Windows 计算器
==============

以平均值为例：在工作台点「计算平均值」，可以看到需求
:need:`REQ_PYCALC_AVERAGE`、节点规格 :need:`SPEC_PYCALC_AVERAGE`
和测试 :need:`TEST_PYCALC_AVG20`。该测试的 ``verifies`` 同时引用
:need:`REQ_PYCALC_AVERAGE.TWENTY` 和直接验证的平均值规格。CodeLinks 从规格 ID 注释定位
``calculator.py`` 的 ``_average``，从测试声明定位实际用例。

运行 ``python project/calculator/run_tests.py`` 后，项目按测试 ID 写出结果。
工作台用同一个 ID 展示通过、失败或待复验。源码中的关联在运行测试前也能查看。

.. include:: ../project/calculator/requirements.rst
