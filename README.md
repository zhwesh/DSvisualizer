# DSvisualizer
## 功能介绍
本项目使用前端技术对常见数据结构与算法进行可视化，用户可对数组、链表、哈希表、平衡树等数据结构自由进行增删改查操作，且对于所有算法，项目都进行了详细的步骤划分，用户可以手动控制执行流程，观察具体逻辑。

### 可视化
直观展示各数据结构的形态、特性与细节，保证动画流畅、数据一致、结果正确。

### 步骤划分
以AVL树插入操作为例，它可分为以下步骤：
- 前n步：每步将要插入的数字与当前节点比较，决定向左或向右移动
- 将新节点挂在对应的叶子上
- 后m步：每步检查左右子树高度，进行左旋或右旋

### 流程控制
通过流程控制面板进行控制，包括：
- 播放：每隔固定时间进行一步操作
- 快进：连续快速执行各步操作
- 暂停：停止执行
- 单步执行：进行一步操作

### 效果展示
链式双端队列：
![](demo\LinkedDeque.png)
红黑树：
![](demo\RedBlackTree.png)
Kruskal算法（夜间模式）：
![](demo\Kruskal.png)
# 使用方法

## 使用项目
下载[Release](https://github.com/zhwesh/DSvisualizer/releases)包并解压后，双击内部文件`index.html`即可运行。

## 源码下载与构建
克隆仓库：
```
git clone https://github.com/zhwesh/DSvisualizer.git
```

安装依赖：
```
npm install
```

启动开发环境（热更新网页）：
```
npm run dev
```

从源码构建：
```
npm run build
```
编译产物输出至 `dist/*`，双击内部 `index.html` 即可运行。或使用以下命令以静态服务器方式运行：
```
npm run preview
```

## 运行测试
运行测试脚本`src/test/runTests.bat`即可自动编译并执行全部测试。

也可在项目根目录手动执行如下命令以运行测试：
```
node node_modules/typescript/bin/tsc src/test/RunTests.ts --outDir node_modules/.tmp/dstest --module commonjs --target es2022 --skipLibCheck --ignoreConfig
node node_modules/.tmp/dstest/test/RunTests.js
```

测试文件源代码位于`src/test/`，目录结构与`src/datastructure`、`src/algorithm`一致，文件名以`Test`作为后缀（如`SinglyLinkedListTest.ts`）。测试内容以边界用例和随机对拍为主，运行后会输出每个测试的通过情况、数据量与统计信息。

# 收录的数据结构与算法

## 数据结构
- 线性表：数组、单链表、循环链表、双向链表
- 栈与队列：顺序栈、链式栈、顺序队列、链式队列、顺序双端队列、链式双端队列、优先队列（二叉堆）
- 树形结构
  - 二叉搜索树：二叉搜索树、AVL树、红黑树、替罪羊树、Treap树
  - 线段树
- 其他：哈希表、并查集、字典树、树状数组

## 算法
- 基于线性结构的算法：二分查找、排序（冒泡排序、插入排序、快速排序、归并排序）、KMP算法
- 基于树形结构的算法：二叉树的遍历（前序、中序、后序）
- 图论算法：最小生成树（kruskal算法、prim算法）、最短路（dijkstra算法、Floyd算法）