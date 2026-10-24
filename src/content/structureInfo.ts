import { VisualizerType } from '../visualizer/VisualizerType';

/**
 * 页面标题右侧info弹窗的正文内容
 */
export const structureInfo: Record<VisualizerType, { info: string; notes: string }> = {
    // 数据结构
    // 顺序表
    [VisualizerType.ARRAY_LIST]: {
        info: 'arr          原始数组\n' +
              'tmp          扩容时使用的临时数组',
        notes: 'arr容量不足时双倍扩容。',
    },
    // 单链表
    [VisualizerType.SINGLY_LINKED_LIST]: {
        info: 'head         头节点',
        notes: '灰色箭头为next指针。',
    },
    // 循环链表
    [VisualizerType.CIRCULAR_LINKED_LIST]: {
        info: 'header       哨兵节点',
        notes: '哨兵节点不存储数据，用于占位。\n' +
               '节点沿顺时针方向环状排列。\n' +
               '灰色箭头为next指针。',
    },
    // 双向链表
    [VisualizerType.DOUBLE_LINKED_LIST]: {
        info: 'head         头节点',
        notes: '灰色箭头为next指针，淡灰色箭头为last指针。',
    },
    // 顺序栈
    [VisualizerType.ARRAY_STACK]: {
        info: 'stack        栈数组\n' +
              'tmp          扩容时使用的临时数组\n' +
              'top          栈顶指针',
        notes: 'stack容量不足时双倍扩容。',
    },
    // 链式栈
    [VisualizerType.LINKED_STACK]: {
        info: 'top          栈顶指针',
        notes: '灰色箭头为next指针。',
    },
    // 顺序队列
    [VisualizerType.ARRAY_QUEUE]: {
        info: 'queue        队列数组\n' +
              'head         队首指针\n' +
              'tail         队尾指针',
        notes: '队列初始容量为4。\n' +
               '队尾指针即将越界时：若已用容量不多于一半，则移动元素到数组首端；否则进行双倍扩容。',
    },
    // 链式队列
    [VisualizerType.LINKED_QUEUE]: {
        info: 'header       哨兵节点\n' +
              'tail         队尾指针',
        notes: '哨兵节点不存储数据，用于占位。\n' +
               '灰色箭头为next指针。',
    },
    // 双端队列
    [VisualizerType.ARRAY_DEQUE]: {
        info: 'queue        队列数组\n' +
              'head         队首指针\n' +
              'tail         队尾指针',
        notes: '队列初始容量为9。\n' +
               '首尾指针即将越界时：若已用容量不多于三分之一，则移动元素到数组中间；否则进行三倍扩容。',
    },
    // 链式双端队列
    [VisualizerType.LINKED_DEQUE]: {
        info: 'header       哨兵节点',
        notes: '哨兵节点不存储数据，用于占位。\n' +
               '节点沿顺时针方向环状排列。\n' +
               '灰色箭头为next指针，淡灰色箭头为last指针。',
    },
    // 二叉堆
    [VisualizerType.BINARY_HEAP]: {
        info: 'heap         以数组形式表示的完全二叉树\n' +
              'tmp          扩容时使用的临时数组',
        notes: 'heap下标从1开始。\n' + 
               '下标1为根节点。\n' +
               '下标i的左右孩子分别为i*2、i*2+1。',
    },
    // 二叉搜索树
    [VisualizerType.BST]: {
        info: '',
        notes: '以蓝色圆圈标记当前正在处理的节点。',
    },
    // AVL树
    [VisualizerType.AVL]: {
        info: 'h            以当前节点为根的子树高度',
        notes: '以蓝色圆圈标记当前正在处理的节点。',
    },
    // 红黑树
    [VisualizerType.RED_BLACK]: {
        info: '',
        notes: '以蓝色圆圈标记当前正在处理的节点。\n' +
               '处于夜间模式时，黑色节点显示为白色。',
    },
    // Treap
    [VisualizerType.TREAP]: {
        info: 'p            当前节点创建时随机分配的优先级',
        notes: '以蓝色圆圈标记当前正在处理的节点。',
    },
    // 替罪羊树
    [VisualizerType.SCAPEGOAT]: {
        info: 'size         以当前节点为根的子树大小（节点数量）',
        notes: '以蓝色圆圈标记当前正在处理的节点。\n' +
               '子树重构时展示中序遍历序列。',
    },
    // 线段树
    [VisualizerType.SEGMENT_TREE]: {
        info: 'lazy         当前节点的懒信息',
        notes: '以蓝色圆圈标记当前正在处理的节点。',
    },
    // Trie 树
    [VisualizerType.TRIE]: {
        info: 'pass         经过当前节点的字符串数量\n' +
              'end          在当前节点结束的字符串数量',
        notes: '节点内的a/b分别表示当前节点的pass、end值。',
    },
    // 哈希表
    [VisualizerType.HASH_TABLE]: {
        info: 'buckets      桶数组',
        notes: '哈希表桶数组初始大小为16。\n' +
               '冲突的键向下延伸为单链表。',
    },
    // 并查集
    [VisualizerType.UNION_FIND]: {
        info: 'father       父节点数组\n' +
              'sz           集合大小数组\n' +
              'size         集合大小',
        notes: 'union会按“小挂大”逻辑合并\n' +
               'find会进行路径压缩',
    },
    // 树状数组
    [VisualizerType.BINARY_INDEXED_TREE]: {
        info: 'data         原始数组\n' +
              'tree         树状数组',
        notes: 'tree数组会同时以覆盖条形式表现，每个覆盖条表示data数组的一段范围，' +
               '覆盖条右端为对应tree数组元素的位置',
    },

    // 算法
    // 二分查找
    [VisualizerType.BINARY_SEARCH]: {
        info: 'left         左指针\n' +
              'right        右指针\n' +
              'mid          中间指针\n' +
              'target       目标值',
        notes: '',
    },
    // 二叉树遍历
    [VisualizerType.BINARY_TREE_TRAVERSAL]: {
        info: '',
        notes: '以蓝色圆圈标记表示节点已访问。',
    },
    // Dijkstra
    [VisualizerType.DIJKSTRA]: {
        info: '',
        notes: '遍历过的节点标为蓝色。\n' +
               '正在进行松弛操作的节点标为绿色。\n' +
               '已经选中的最短路树边标为绿色。',
    },
    // Floyd
    [VisualizerType.FLOYD]: {
        info: '',
        notes: '正在松弛的节点标为蓝色。\n' +
               '中间节点标为绿色。',
    },
    // Prim
    [VisualizerType.PRIM]: {
        info: '',
        notes: '遍历过的边标为蓝色。\n' +
               '选中的边标为绿色。',
    },
    // Kruskal
    [VisualizerType.KRUSKAL]: {
        info: '',
        notes: '当前正在处理的边标为蓝色。\n' +
               '选中的边标为绿色。',
    },
    // 冒泡排序
    [VisualizerType.BUBBLE_SORT]: {
        info: '',
        notes: '',
    },
    // 插入排序
    [VisualizerType.INSERTION_SORT]: {
        info: '',
        notes: '',
    },
    // 归并排序
    [VisualizerType.MERGE_SORT]: {
        info: '',
        notes: '',
    },
    // 快速排序
    [VisualizerType.QUICK_SORT]: {
        info: '',
        notes: '',
    },
    // KMP 算法
    [VisualizerType.KMP]: {
        info: 'str          待匹配字符串\n' +
              'template     模式串\n' +
              'next         最长公共子前后缀长度',
        notes: '',
    },
};
