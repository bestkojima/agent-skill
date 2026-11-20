Contract Studio 需求追踪
========================

从「Windows 计算器」查看用户需求、功能节点、实现函数和验收用例。
计算器在桌面独立运行；工作台读取索引和项目已发布的测试结果。

需求和节点规格维护在 ``project/calculator/requirements.rst``。
修改后，在工作台目录运行 ``node scripts/build-index.mjs`` 重建索引。

.. toctree::
   :maxdepth: 1

   python-calculator

.. src-trace::
   :project: desktop_calculator
