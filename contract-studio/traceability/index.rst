Contract Studio 需求追踪
========================

从「Windows 计算器」查看用户需求、功能节点、实现函数和验收用例。
计算器在桌面独立运行；工作台读取索引、显示项目测试结果，也可发起节点测试。

需求和节点规格直接维护在 :doc:`python-calculator`。
修改后，在工作台目录运行 ``npm run index:build`` 重建索引。

.. toctree::
   :maxdepth: 1

   python-calculator

.. src-trace::
   :project: desktop_calculator
