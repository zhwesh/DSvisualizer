<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
// 控制器
import { StepController, StepStatus, PLAY_TIME_INTERVAL, FAST_TIME_INTERVAL } from './controller/StepController';
import { MessageController, MessageType } from './controller/MessageController';
// 核心
import { create } from './node/factory';
import { DataNode } from './node/DataNode';
import { VisualizerManager, VisualizerType } from './visualizer/VisualizerManager';
import { SortVisualizer } from './visualizer/SortVisualizer';
import { LinkedListVisualizer } from './visualizer/LinkedListVisualizer';
// 组件
import MenuSidebar, { type MenuNode } from './components/MenuSidebar.vue';
import StatsPanel from './components/StatsPanel.vue';
import StepControls from './components/StepControls.vue';
import MessagePanel, { type UiMessage } from './components/MessagePanel.vue';
import ControlPanel, { type ControlGroupDef } from './components/ControlPanel.vue';
// 数据结构
import { ArrayList } from './datastructure/List/ArrayList';
import { LinkedList as SinglyLinkedList } from './datastructure/List/SinglyLinkedList';
import { CircularLinkedList } from './datastructure/List/CircularLinkedList';
import { DoubleLinkedList } from './datastructure/List/DoubleLinkedList';
import { ArrayStack } from './datastructure/Stack/ArrayStack';
import { ArrayQueue } from './datastructure/Queue/ArrayQueue';
import { ArrayDeque } from './datastructure/Queue/ArrayDeque';
import { BinarySearchTree } from './datastructure/Tree/BinarySearchTree/BinarySearchTree';
import { AVLTree } from './datastructure/Tree/BinarySearchTree/AVLTree';
import { RedBlackTree } from './datastructure/Tree/BinarySearchTree/RedBlackTree';
import { SegmentTree } from './datastructure/Tree/SegmentTree/SegmentTree';
import { Trie } from './datastructure/Tree/Trie/Trie';
// 算法
import { BinarySearch } from './algorithm/List/BinarySearch';
import { BinaryTreeTraversal } from './algorithm/Tree/BinaryTreeTraversal';
import { BinaryTreeTraversalNode } from './node/BinaryTreeNode/impl/BinaryTreeTraversalNode';
import { dijkstra } from './algorithm/Graph/Dijkstra';
import { floyd } from './algorithm/Graph/Floyd';
import { prim } from './algorithm/Graph/Prim';
import { kruskal } from './algorithm/Graph/Kruskal';
import { BubbleSort } from './algorithm/List/BubbleSort';
import { InsertionSort } from './algorithm/List/InsertionSort';
import { MergeSort } from './algorithm/List/MergeSort';
import { QuickSort } from './algorithm/List/QuickSort';
import { KMP } from './algorithm/List/KMP';

// ---------- 操作名常量（消除魔法字符串） ----------
const OP = {
    INSERT: '插入数据',
    DELETE: '删除数据',
    SEARCH: '查找数据',
    UPDATE: '修改数据',
    STACK_PUSH: '入栈',
    STACK_POP: '出栈',
    STACK_TOP: '查看栈顶',
    QUEUE_PUSH: '入队',
    QUEUE_POP: '出队',
    QUEUE_FRONT: '查看队首',
    DEQUE_FIRST: '头部入队',
    DEQUE_LAST: '尾部入队',
    DEQUE_POP_FIRST: '头部出队',
    DEQUE_POP_LAST: '尾部出队',
    SEG_ADD: '区间加',
    SEG_QUERY: '区间求和',
    TRIE_INSERT: '插入字符串',
    TRIE_FIND: '查找字符串',
    TRIE_PREFIX: '查询前缀',
    TRIE_DELETE: '删除字符串',
    GRAPH_RUN: '执行算法',
    SORT_RUN: '执行排序',
    KMP_NEXT: '计算next数组',
    KMP_SEARCH: 'KMP匹配',
    PRE_ORDER: '前序遍历',
    IN_ORDER: '中序遍历',
    POST_ORDER: '后序遍历',
    CLEAR: '清空数据',
    RESTART: '重新开始',
} as const;

// ---------- 单例 ----------
const stepController = StepController.getStepController();
const messageController = MessageController.getMessageController();
const visualizerManager = VisualizerManager.getInstance();

// ---------- 页面状态 ----------
const currentMenu = ref<VisualizerType>(VisualizerType.ARRAY_LIST);
const currentOp = ref<string>(OP.RESTART);
const stats = ref({ size: 0 });
const messages = ref<UiMessage[]>([]);
const bsVars = ref({ left: 0, right: 9, mid: 4, target: 0 });
const svgRef = ref<SVGSVGElement | null>(null);

// 当前数据结构实例（类型化联合，按菜单创建）
type DSInstance =
    | ArrayList | SinglyLinkedList | CircularLinkedList | DoubleLinkedList
    | BinarySearchTree | AVLTree | RedBlackTree
    | BinarySearch | BinaryTreeTraversal | SegmentTree
    | ArrayQueue | ArrayDeque | ArrayStack | Trie
    | dijkstra | floyd | prim | kruskal
    | BubbleSort | InsertionSort | MergeSort | QuickSort | KMP;

let currentDS: DSInstance | null = null;

// KMP 实例对应的主串/模式串（由页面层持有，避免读取算法层私有字段）
let lastKmpStr = 'ababcabab';
let lastKmpTemplate = 'abab';
// 二分查找/线段树/遍历的规模（由页面层持有）
let bsDataLen = 10;
let segDataLen = 8;
let traversalNodeCount = 7;
let graphNodeCnt = 6;
// 排序当前数组（页面层持有，输入框同步显示）
const sortData = ref<number[]>([]);
// 树插入自动编号（从1开始，切换菜单重置）
let treeInsertCounter = 1;

// ---------- 链表等按下标操作时的输入解析 ----------
/**
 * 解析索引输入框：为空或非法时取默认值
 * （number 输入框经 v-model 后可能已是number，两种都要支持）
 * @param raw 输入框内容
 * @param fallback 默认索引
 */
const parseIndex = (raw: string | number | undefined, fallback: number): number => {
    if (typeof raw === 'number') return Number.isFinite(raw) ? Math.trunc(raw) : fallback;
    const text = (raw ?? '').trim();
    if (text === '') return fallback;
    const value = Number(text);
    return Number.isFinite(value) ? Math.trunc(value) : fallback;
};

/**
 * 高亮（闪烁）链表中第idx个数据节点，用于“查找/修改”动画
 * @param idx 数据节点下标
 */
const highlightListIndex = (idx: number): void => {
    const vis = visualizerManager.getCurrentVisualizer();
    if (vis instanceof LinkedListVisualizer) vis.highlightIndex(idx);
};

// ---------- 消息 ----------
const addMessage = (text: string, type: number): void => {
    messages.value.push({ text, type });
    if (messages.value.length > 200) messages.value.splice(0, messages.value.length - 200);
};

const addOperationError = (action: string, error: unknown): void => {
    const detail = error instanceof Error ? error.message : String(error);
    addMessage(action + '失败：' + detail, MessageType.ERROR);
};

messageController.setMessageHandler((msg: string, type: number) => {
    addMessage(msg, type);
});

// ---------- 复合操作串行化 ----------
let opChain: Promise<void> = Promise.resolve();
// 已提交但尚未结束的复合操作数量（含正在执行与排队等待的）
let opPending = 0;

const runOp = (op: () => Promise<void>): void => {
    const queued = opPending > 0;
    ++opPending;

    // 已有操作在执行或排队时，立即快进当前操作，避免插队操作被暂停卡住
    if (queued) {
        stepController.setTimeInterval(FAST_TIME_INTERVAL);
        stepController.setStatus(StepStatus.PLAYING);
    }

    opChain = opChain
        // 上一次操作即使出错也不能污染串行队列，否则后面所有操作都会被静默跳过
        .catch(() => { /* 上一次异常已由该操作的 catch 记录 */ })
        .then(async () => {
            try {
                await op();
            } catch (error) {
                addMessage('操作执行出错：' + (error instanceof Error ? error.message : String(error)),
                    MessageType.ERROR);
            }
        }).finally(() => {
            --opPending;
        });
};

/**
 * 中断处理：切换/重置前强制把当前复合操作快进播完，
 * 而不是取消它——算法层不支持回滚，wait() 也永远不会失败。
 */
const forceFinishPending = async (): Promise<void> => {
    // 等待期间可能又有新操作入队，因此循环排空
    while (opPending > 0) {
        stepController.setTimeInterval(FAST_TIME_INTERVAL);
        stepController.setStatus(StepStatus.PLAYING);
        const chain = opChain;
        await chain.catch(() => { /* 异常已在runOp内记录 */ });
        if (chain === opChain) {
            break;
        }
    }
};

// ---------- 流程控制 ----------
const handlePlay = (): void => {
    stepController.setTimeInterval(PLAY_TIME_INTERVAL);
    stepController.setStatus(StepStatus.PLAYING);
};
const handleFast = (): void => {
    stepController.setTimeInterval(FAST_TIME_INTERVAL);
    stepController.setStatus(StepStatus.PLAYING);
};
const handlePause = (): void => {
    stepController.setStatus(StepStatus.PAUSE_OR_FREE);
};
const handleStep = (): void => {
    stepController.setStatus(StepStatus.STEP_EXECUTION);
};

// ---------- 菜单树（三栏布局：左侧树状菜单） ----------
const menuTree: MenuNode[] = [
    {
        label: '数据结构',
        children: [
            {
                label: '线性表',
                children: [
                    { label: '顺序表', key: VisualizerType.ARRAY_LIST },
                    { label: '单链表', key: VisualizerType.SINGLY_LINKED_LIST },
                    { label: '循环链表', key: VisualizerType.CIRCULAR_LINKED_LIST },
                    { label: '双向链表', key: VisualizerType.DOUBLE_LINKED_LIST },
                ],
            },
            {
                label: '栈与队列',
                children: [
                    { label: '顺序栈', key: VisualizerType.ARRAY_STACK },
                    { label: '顺序队列', key: VisualizerType.ARRAY_QUEUE },
                    { label: '双端队列', key: VisualizerType.ARRAY_DEQUE },
                ],
            },
            {
                label: '树',
                children: [
                    { label: '二叉搜索树', key: VisualizerType.BST },
                    { label: 'AVL树', key: VisualizerType.AVL },
                    { label: '红黑树', key: VisualizerType.RED_BLACK },
                    { label: '线段树', key: VisualizerType.SEGMENT_TREE },
                    { label: 'Trie树', key: VisualizerType.TRIE },
                ],
            },
        ],
    },
    {
        label: '算法',
        children: [
            {
                label: '查找',
                children: [
                    { label: '二分查找', key: VisualizerType.BINARY_SEARCH },
                ],
            },
            {
                label: '二叉树遍历',
                children: [
                    { label: '二叉树遍历', key: VisualizerType.BINARY_TREE_TRAVERSAL },
                ],
            },
            {
                label: '图算法',
                children: [
                    { label: 'Dijkstra', key: VisualizerType.DIJKSTRA },
                    { label: 'Floyd', key: VisualizerType.FLOYD },
                    { label: 'Prim', key: VisualizerType.PRIM },
                    { label: 'Kruskal', key: VisualizerType.KRUSKAL },
                ],
            },
            {
                label: '排序',
                children: [
                    { label: '冒泡排序', key: VisualizerType.BUBBLE_SORT },
                    { label: '插入排序', key: VisualizerType.INSERTION_SORT },
                    { label: '归并排序', key: VisualizerType.MERGE_SORT },
                    { label: '快速排序', key: VisualizerType.QUICK_SORT },
                ],
            },
            {
                label: '字符串匹配',
                children: [
                    { label: 'KMP算法', key: VisualizerType.KMP },
                ],
            },
        ],
    },
];

// 菜单标题（用于页面标题与消息）
const menuTitle = (key: VisualizerType): string => {
    const find = (nodes: MenuNode[]): string | null => {
        for (const n of nodes) {
            if (n.key === key) return n.label;
            if (n.children) {
                const r = find(n.children);
                if (r) return r;
            }
        }
        return null;
    };
    return find(menuTree) ?? '数据结构';
};

// ---------- 数据创建（唯一 switch：菜单 → 实例） ----------
const GRAPH_EDGES: Record<VisualizerType, number[][]> = {
    [VisualizerType.DIJKSTRA]: [[0, 1, 2], [0, 2, 5], [1, 2, 1], [1, 3, 4], [2, 3, 2], [3, 4, 3], [2, 4, 6]],
    [VisualizerType.FLOYD]: [[0, 1, 3], [0, 2, 8], [1, 2, 2], [1, 3, 5], [2, 3, 1], [2, 4, 6], [3, 4, 4]],
    [VisualizerType.PRIM]: [[0, 1, 4], [0, 2, 3], [1, 2, 1], [1, 3, 6], [2, 3, 5], [2, 4, 2], [3, 4, 7]],
    [VisualizerType.KRUSKAL]: [[0, 1, 2], [0, 2, 5], [1, 2, 1], [1, 3, 4], [2, 3, 3], [3, 4, 2], [2, 4, 6]],
} as Record<VisualizerType, number[][]>;

// 二叉树遍历示例树
const buildTraversalTree = (): BinaryTreeTraversalNode => {
    const n4 = create(BinaryTreeTraversalNode, null, null, 4);
    const n5 = create(BinaryTreeTraversalNode, null, null, 5);
    const n6 = create(BinaryTreeTraversalNode, null, null, 6);
    const n7 = create(BinaryTreeTraversalNode, null, null, 7);
    const n2 = create(BinaryTreeTraversalNode, n4, n5, 2);
    const n3 = create(BinaryTreeTraversalNode, n6, n7, 3);
    return create(BinaryTreeTraversalNode, n2, n3, 1);
};

const createDS = (key: VisualizerType): void => {
    treeInsertCounter = 1;
    switch (key) {
        case VisualizerType.ARRAY_LIST:
            currentDS = create(ArrayList);
            break;
        case VisualizerType.SINGLY_LINKED_LIST:
            currentDS = create(SinglyLinkedList);
            break;
        case VisualizerType.CIRCULAR_LINKED_LIST:
            currentDS = create(CircularLinkedList);
            break;
        case VisualizerType.DOUBLE_LINKED_LIST:
            currentDS = create(DoubleLinkedList);
            break;
        case VisualizerType.ARRAY_STACK:
            currentDS = create(ArrayStack);
            break;
        case VisualizerType.ARRAY_QUEUE:
            currentDS = create(ArrayQueue);
            break;
        case VisualizerType.ARRAY_DEQUE:
            currentDS = create(ArrayDeque);
            break;
        case VisualizerType.BST:
            currentDS = create(BinarySearchTree);
            break;
        case VisualizerType.AVL:
            currentDS = create(AVLTree);
            break;
        case VisualizerType.RED_BLACK:
            currentDS = create(RedBlackTree);
            break;
        case VisualizerType.SEGMENT_TREE:
            segDataLen = 8;
            currentDS = create(SegmentTree, [1, 2, 3, 4, 5, 6, 7, 8]);
            break;
        case VisualizerType.TRIE:
            currentDS = create(Trie);
            break;
        case VisualizerType.BINARY_SEARCH:
            bsDataLen = 10;
            currentDS = create(BinarySearch, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            bsVars.value = { left: 0, right: bsDataLen - 1, mid: Math.floor((bsDataLen - 1) / 2), target: bsVars.value.target };
            break;
        case VisualizerType.BINARY_TREE_TRAVERSAL:
            currentDS = create(BinaryTreeTraversal, buildTraversalTree());
            traversalNodeCount = 7;
            break;
        case VisualizerType.DIJKSTRA:
        case VisualizerType.FLOYD:
        case VisualizerType.PRIM:
        case VisualizerType.KRUSKAL: {
            const edges = GRAPH_EDGES[key];
            graphNodeCnt = edges.reduce((m, e) => Math.max(m, e[0] + 1, e[1] + 1), 0);
            if (key === VisualizerType.DIJKSTRA) currentDS = create(dijkstra, edges);
            else if (key === VisualizerType.FLOYD) currentDS = create(floyd, edges);
            else if (key === VisualizerType.PRIM) currentDS = create(prim, edges);
            else currentDS = create(kruskal, edges);
            break;
        }
        case VisualizerType.BUBBLE_SORT:
        case VisualizerType.INSERTION_SORT:
        case VisualizerType.MERGE_SORT:
        case VisualizerType.QUICK_SORT: {
            if (key === VisualizerType.BUBBLE_SORT) currentDS = create(BubbleSort);
            else if (key === VisualizerType.INSERTION_SORT) currentDS = create(InsertionSort);
            else if (key === VisualizerType.MERGE_SORT) currentDS = create(MergeSort);
            else currentDS = create(QuickSort);
            break;
        }
        case VisualizerType.KMP:
            lastKmpStr = 'ababcabab';
            lastKmpTemplate = 'abab';
            currentDS = create(KMP, lastKmpStr, lastKmpTemplate);
            break;
        default:
            currentDS = create(ArrayList);
            break;
    }
};

// ---------- 统计信息（按菜单类型取数，不读取算法层私有字段） ----------
const hasSize = (ds: DSInstance): ds is Extract<DSInstance, { size(): number }> => 'size' in ds;

const updateStats = (): void => {
    const ds = currentDS;
    if (!ds) {
        stats.value.size = 0;
        return;
    }
    switch (currentMenu.value) {
        case VisualizerType.BINARY_SEARCH:
            stats.value.size = bsDataLen;
            break;
        case VisualizerType.BINARY_TREE_TRAVERSAL:
            stats.value.size = traversalNodeCount;
            break;
        case VisualizerType.SEGMENT_TREE:
            stats.value.size = segDataLen;
            break;
        case VisualizerType.DIJKSTRA:
        case VisualizerType.FLOYD:
        case VisualizerType.PRIM:
        case VisualizerType.KRUSKAL:
            stats.value.size = graphNodeCnt;
            break;
        case VisualizerType.BUBBLE_SORT:
        case VisualizerType.INSERTION_SORT:
        case VisualizerType.MERGE_SORT:
        case VisualizerType.QUICK_SORT:
            stats.value.size = sortData.value.length;
            break;
        case VisualizerType.KMP:
            stats.value.size = lastKmpStr.length;
            break;
        default:
            stats.value.size = hasSize(ds) ? ds.size() : 0;
            break;
    }
};

// ---------- 菜单切换（原设计：强制播完再切换） ----------
const selectMenu = async (key: VisualizerType): Promise<void> => {
    await forceFinishPending();
    currentMenu.value = key;
    currentOp.value = OP.RESTART;
    DataNode.restart();
    visualizerManager.switchVisualizer(key);
    createDS(key);
    updateStats();
    addMessage(`已切换到「${menuTitle(key)}」`, MessageType.INFO);
};

// ---------- 菜单类型判断 ----------
const isTreeDS = computed(() =>
    currentMenu.value === VisualizerType.BST ||
    currentMenu.value === VisualizerType.AVL ||
    currentMenu.value === VisualizerType.RED_BLACK);
const isLinkedListDS = computed(() =>
    currentMenu.value === VisualizerType.SINGLY_LINKED_LIST ||
    currentMenu.value === VisualizerType.CIRCULAR_LINKED_LIST ||
    currentMenu.value === VisualizerType.DOUBLE_LINKED_LIST);

// ---------- 数据操作（统一模板：runOp 串行化 + 快进排队） ----------
const handleInsert = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const insertVal = Number(v.val ?? 0);
    const insertIdx = Number(v.idx ?? 0);

    if (isTreeDS.value) {
        runOp(async () => {
            currentOp.value = OP.INSERT;
            const no = treeInsertCounter++;
            addMessage(`将节点 ${insertVal}（第${no}个）加入${menuTitle(currentMenu.value)}`, MessageType.INFO);
            try {
                await (ds as BinarySearchTree | AVLTree | RedBlackTree).insert(insertVal);
                addMessage('插入操作执行完毕', MessageType.SUCCESS);
            } catch (error) {
                addOperationError('插入操作', error);
            }
            updateStats();
            stepController.setStatus(StepStatus.PAUSE_OR_FREE);
        });
        return;
    }
    if (isLinkedListDS.value) {
        runOp(async () => {
            currentOp.value = OP.INSERT;
            const list = ds as SinglyLinkedList | CircularLinkedList | DoubleLinkedList;
            // 索引留空时等价于尾插（插入到下标size处）
            const idx = parseIndex(v.idx, list.size());
            addMessage(`在索引 ${idx} 处插入节点 ${insertVal}`, MessageType.INFO);
            try {
                await list.insert(idx, insertVal);
                addMessage('插入操作执行完毕', MessageType.SUCCESS);
            } catch (error) {
                addOperationError('插入操作', error);
            }
            updateStats();
            stepController.setStatus(StepStatus.PAUSE_OR_FREE);
        });
        return;
    }
    // 顺序表：按索引插入
    runOp(async () => {
        currentOp.value = OP.INSERT;
        addMessage(`在索引 ${insertIdx} 处插入元素 ${insertVal}`, MessageType.INFO);
        try {
            await (ds as ArrayList).insert(insertIdx, insertVal);
            addMessage('插入操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('插入操作', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

const handleDelete = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const delVal = Number(v.val ?? 0);
    const delIdx = Number(v.idx ?? 0);

    if (isTreeDS.value) {
        runOp(async () => {
            currentOp.value = OP.DELETE;
            addMessage(`从${menuTitle(currentMenu.value)}中删除节点 ${delVal}`, MessageType.INFO);
            try {
                await (ds as BinarySearchTree | AVLTree | RedBlackTree).delete(delVal);
                addMessage('删除操作执行完毕', MessageType.SUCCESS);
            } catch (error) {
                addOperationError('删除操作', error);
            }
            updateStats();
            stepController.setStatus(StepStatus.PAUSE_OR_FREE);
        });
        return;
    }
    runOp(async () => {
        currentOp.value = OP.DELETE;
        try {
            if (isLinkedListDS.value) {
                const list = ds as SinglyLinkedList | CircularLinkedList | DoubleLinkedList;
                const idx = parseIndex(v.idx, 0);
                addMessage(`删除索引 ${idx} 处的元素`, MessageType.INFO);
                await list.delete(idx);
            } else {
                addMessage(`删除索引 ${delIdx} 处的元素`, MessageType.INFO);
                await (ds as ArrayList).delete(delIdx);
            }
            addMessage('删除操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('删除操作', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

const handleGet = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const getVal = Number(v.val ?? 0);
    const getIdx = Number(v.idx ?? 0);

    // 二分查找
    if (currentMenu.value === VisualizerType.BINARY_SEARCH) {
        runOp(async () => {
            currentOp.value = OP.SEARCH;
            bsVars.value.target = getVal;
            addMessage(`开始二分查找 target=${getVal}`, MessageType.INFO);
            try {
                const result = await (ds as BinarySearch).find(getVal);
                addMessage(`查找结果：小于等于 ${getVal} 的最后一个元素下标 = ${result}`, MessageType.SUCCESS);
            } catch (error) {
                addOperationError('二分查找', error);
            }
            stepController.setStatus(StepStatus.PAUSE_OR_FREE);
        });
        return;
    }
    // 树：查找节点是否存在
    if (isTreeDS.value) {
        runOp(async () => {
            currentOp.value = OP.SEARCH;
            addMessage(`在${menuTitle(currentMenu.value)}中查找节点 ${getVal}`, MessageType.INFO);
            try {
                const ok = await (ds as BinarySearchTree | AVLTree | RedBlackTree).contains(getVal);
                addMessage(ok ? `节点 ${getVal} 存在` : `节点 ${getVal} 不存在`, MessageType.SUCCESS);
            } catch (error) {
                addOperationError('查找操作', error);
            }
            stepController.setStatus(StepStatus.PAUSE_OR_FREE);
        });
        return;
    }
    // 链表：按下标取值（并高亮该节点）
    if (isLinkedListDS.value) {
        runOp(async () => {
            currentOp.value = OP.SEARCH;
            const list = ds as SinglyLinkedList | CircularLinkedList | DoubleLinkedList;
            const idx = parseIndex(v.idx, 0);
            addMessage(`查找索引 ${idx} 处的元素`, MessageType.INFO);
            try {
                const val = await list.get(idx);
                highlightListIndex(idx);
                if (val === null) {
                    addMessage(`索引 ${idx} 处不存在元素`, MessageType.WARNING);
                } else {
                    addMessage(`索引 ${idx} 处的元素 = ${val}`, MessageType.SUCCESS);
                }
            } catch (error) {
                addOperationError('查找操作', error);
            }
            stepController.setStatus(StepStatus.PAUSE_OR_FREE);
        });
        return;
    }
    // 顺序表：按索引取值
    runOp(async () => {
        currentOp.value = OP.SEARCH;
        addMessage(`查询索引 ${getIdx} 处的元素`, MessageType.INFO);
        try {
            const val = await (ds as ArrayList).get(getIdx);
            addMessage(`索引 ${getIdx} 处的元素 = ${val}`, MessageType.SUCCESS);
        } catch (error) {
            addOperationError('查找操作', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

const handleSet = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const setIdx = Number(v.idx ?? 0);
    const setVal = Number(v.val ?? 0);

    // 链表：按下标修改（并高亮该节点）
    if (isLinkedListDS.value) {
        runOp(async () => {
            currentOp.value = OP.UPDATE;
            const list = ds as SinglyLinkedList | CircularLinkedList | DoubleLinkedList;
            const idx = parseIndex(v.idx, 0);
            addMessage(`将索引 ${idx} 处的元素修改为 ${setVal}`, MessageType.INFO);
            try {
                await list.set(idx, setVal);
                highlightListIndex(idx);
                addMessage('修改操作执行完毕', MessageType.SUCCESS);
            } catch (error) {
                addOperationError('修改操作', error);
            }
            stepController.setStatus(StepStatus.PAUSE_OR_FREE);
        });
        return;
    }

    runOp(async () => {
        currentOp.value = OP.UPDATE;
        addMessage(`将索引 ${setIdx} 处的元素修改为 ${setVal}`, MessageType.INFO);
        try {
            await (ds as ArrayList).set(setIdx, setVal);
            addMessage('修改操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('修改操作', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

// ---------- 栈 / 队列 / 双端队列 ----------
const handleStackPush = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const val = Number(v.val ?? 0);
    runOp(async () => {
        currentOp.value = OP.STACK_PUSH;
        addMessage(`入栈：${val}`, MessageType.INFO);
        try {
            await (ds as ArrayStack).push(val);
            addMessage('入栈操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('入栈操作', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleStackPop = (): void => {
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.STACK_POP;
        addMessage('出栈', MessageType.INFO);
        try {
            await (ds as ArrayStack).pop();
            addMessage('出栈操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('出栈操作', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleStackTop = (): void => {
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.STACK_TOP;
        addMessage('查看栈顶', MessageType.INFO);
        try {
            const v = await (ds as ArrayStack).top();
            addMessage(`栈顶元素 = ${v}`, MessageType.SUCCESS);
        } catch (error) {
            addOperationError('查看栈顶', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

const handleQueuePush = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const val = Number(v.val ?? 0);
    runOp(async () => {
        currentOp.value = OP.QUEUE_PUSH;
        addMessage(`入队：${val}`, MessageType.INFO);
        try {
            await (ds as ArrayQueue).push(val);
            addMessage('入队操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('入队操作', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleQueuePop = (): void => {
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.QUEUE_POP;
        addMessage('出队', MessageType.INFO);
        try {
            await (ds as ArrayQueue).pop();
            addMessage('出队操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('出队操作', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleQueueFront = (): void => {
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.QUEUE_FRONT;
        addMessage('查看队首', MessageType.INFO);
        try {
            const v = await (ds as ArrayQueue).top();
            addMessage(`队首元素 = ${v}`, MessageType.SUCCESS);
        } catch (error) {
            addOperationError('查看队首', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

const handleDequePushFirst = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const val = Number(v.val ?? 0);
    runOp(async () => {
        currentOp.value = OP.DEQUE_FIRST;
        addMessage(`头部入队：${val}`, MessageType.INFO);
        try {
            await (ds as ArrayDeque).pushFirst(val);
            addMessage('入队操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('头部入队', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleDequePushLast = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const val = Number(v.val ?? 0);
    runOp(async () => {
        currentOp.value = OP.DEQUE_LAST;
        addMessage(`尾部入队：${val}`, MessageType.INFO);
        try {
            await (ds as ArrayDeque).pushLast(val);
            addMessage('入队操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('尾部入队', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleDequePopFirst = (): void => {
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.DEQUE_POP_FIRST;
        addMessage('头部出队', MessageType.INFO);
        try {
            await (ds as ArrayDeque).popFirst();
            addMessage('出队操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('头部出队', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleDequePopLast = (): void => {
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.DEQUE_POP_LAST;
        addMessage('尾部出队', MessageType.INFO);
        try {
            await (ds as ArrayDeque).popLast();
            addMessage('出队操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('尾部出队', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

// ---------- 线段树 ----------
const handleSegAdd = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const l = Number(v.l ?? 0);
    const r = Number(v.r ?? 0);
    const val = Number(v.val ?? 0);
    runOp(async () => {
        currentOp.value = OP.SEG_ADD;
        addMessage(`区间 [${l}, ${r}] 增加 ${val}`, MessageType.INFO);
        try {
            await (ds as SegmentTree).add(l, r, val);
            addMessage('区间加操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('区间加操作', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleSegQuery = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const l = Number(v.l ?? 0);
    const r = Number(v.r ?? 0);
    runOp(async () => {
        currentOp.value = OP.SEG_QUERY;
        addMessage(`查询区间 [${l}, ${r}] 的和`, MessageType.INFO);
        try {
            const res = await (ds as SegmentTree).query(l, r);
            addMessage(`区间 [${l}, ${r}] 的和 = ${res}`, MessageType.SUCCESS);
        } catch (error) {
            addOperationError('区间查询', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleSegReset = (): void => {
    runOp(async () => {
        currentOp.value = OP.RESTART;
        segDataLen = 8;
        DataNode.restart();
        visualizerManager.switchVisualizer(VisualizerType.SEGMENT_TREE);
        currentDS = create(SegmentTree, [1, 2, 3, 4, 5, 6, 7, 8]);
        updateStats();
        addMessage('已重新开始', MessageType.SUCCESS);
    });
};
const handleSegSetData = (): void => {
    const input = window.prompt('请输入线段树初始数组（逗号分隔）：', '1,2,3,4,5,6,7,8');
    if (input === null) return;
    const data = input.split(/[,，\s]+/).map(s => Number(s.trim())).filter(n => !isNaN(n));
    if (data.length === 0) {
        addMessage('输入无效，请用逗号分隔数字', MessageType.WARNING);
        return;
    }
    runOp(async () => {
        currentOp.value = OP.RESTART;
        segDataLen = data.length;
        DataNode.restart();
        visualizerManager.switchVisualizer(VisualizerType.SEGMENT_TREE);
        currentDS = create(SegmentTree, data);
        updateStats();
        addMessage(`已用 [${data.join(', ')}] 重建线段树`, MessageType.SUCCESS);
    });
};

// ---------- Trie ----------
const handleTrieInsert = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const word = (v.word ?? '').trim();
    if (!word) return;
    runOp(async () => {
        currentOp.value = OP.TRIE_INSERT;
        addMessage(`插入字符串「${word}」`, MessageType.INFO);
        try {
            await (ds as Trie).insert(word);
            addMessage('插入操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('插入操作', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleTrieFind = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const word = (v.word ?? '').trim();
    if (!word) return;
    runOp(async () => {
        currentOp.value = OP.TRIE_FIND;
        addMessage(`查找字符串「${word}」`, MessageType.INFO);
        try {
            const cnt = await (ds as Trie).find(word);
            addMessage(cnt > 0 ? `字符串「${word}」存在，数量 = ${cnt}` : `字符串「${word}」不存在`, MessageType.SUCCESS);
        } catch (error) {
            addOperationError('查找操作', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleTriePrefix = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const word = (v.word ?? '').trim();
    if (!word) return;
    runOp(async () => {
        currentOp.value = OP.TRIE_PREFIX;
        addMessage(`查询前缀「${word}」的字符串数量`, MessageType.INFO);
        try {
            const cnt = await (ds as Trie).prefix(word);
            addMessage(`前缀「${word}」的字符串数量 = ${cnt}`, MessageType.SUCCESS);
        } catch (error) {
            addOperationError('前缀查询', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleTrieDelete = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const word = (v.word ?? '').trim();
    if (!word) return;
    runOp(async () => {
        currentOp.value = OP.TRIE_DELETE;
        addMessage(`删除字符串「${word}」`, MessageType.INFO);
        try {
            await (ds as Trie).delete(word);
            addMessage('删除操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('删除操作', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

// ---------- 图算法 ----------
const handleGraphRun = (): void => {
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.GRAPH_RUN;
        addMessage(`开始执行 ${menuTitle(currentMenu.value)} 算法`, MessageType.INFO);
        try {
            const key = currentMenu.value;
            if (key === VisualizerType.DIJKSTRA) await (ds as dijkstra).execute(0);
            else if (key === VisualizerType.FLOYD) await (ds as floyd).execute();
            else if (key === VisualizerType.PRIM) await (ds as prim).execute();
            else await (ds as kruskal).execute();
            addMessage('算法执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('算法执行', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleGraphReset = (): void => {
    runOp(async () => {
        currentOp.value = OP.RESTART;
        const key = currentMenu.value;
        DataNode.restart();
        visualizerManager.switchVisualizer(key);
        createDS(key);
        addMessage('已重新开始', MessageType.SUCCESS);
    });
};

// ---------- 排序 ----------
const genSortArray = (): Record<string, string> | void => {
    const cnt = 6 + Math.floor(Math.random() * 5);
    const arr: number[] = [];
    for (let i = 0; i < cnt; ++i) arr.push(1 + Math.floor(Math.random() * 99));
    sortData.value = arr;
    const vis = visualizerManager.getCurrentVisualizer();
    if (vis instanceof SortVisualizer) vis.preview(arr);
    addMessage(`已生成随机数组：${arr.join(', ')}`, MessageType.INFO);
    return { sortInput: arr.join(',') };
};

const handleSortRun = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const raw = (v.sortInput ?? '').trim();
    const data = raw ? raw.split(/[,，\s]+/).map(s => Number(s)).filter(n => !isNaN(n)) : [];
    if (data.length === 0) {
        addMessage('请输入有效数组（逗号分隔的数字）', MessageType.WARNING);
        return;
    }
    sortData.value = data;
    runOp(async () => {
        currentOp.value = OP.SORT_RUN;
        addMessage(`开始对 [${data.join(', ')}] 排序`, MessageType.INFO);
        try {
            const key = currentMenu.value;
            if (key === VisualizerType.BUBBLE_SORT) await (ds as BubbleSort).sort(data);
            else if (key === VisualizerType.INSERTION_SORT) await (ds as InsertionSort).sort(data);
            else if (key === VisualizerType.MERGE_SORT) await (ds as MergeSort).sort(data);
            else await (ds as QuickSort).sort(data);
            addMessage('排序执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('排序', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleSortReset = (): void => {
    runOp(async () => {
        currentOp.value = OP.RESTART;
        const key = currentMenu.value;
        DataNode.restart();
        visualizerManager.switchVisualizer(key);
        createDS(key);
        updateStats();
        addMessage('已重新开始', MessageType.SUCCESS);
        genSortArray();
    });
};

// ---------- KMP ----------
const syncKMP = (str: string, template: string): void => {
    if (str === lastKmpStr && template === lastKmpTemplate) return;
    lastKmpStr = str;
    lastKmpTemplate = template;
    DataNode.restart();
    visualizerManager.switchVisualizer(VisualizerType.KMP);
    currentDS = create(KMP, str, template);
    updateStats();
};
const handleKMPNext = (v: Record<string, string>): void => {
    const str = (v.str ?? lastKmpStr).trim();
    const template = (v.template ?? lastKmpTemplate).trim();
    runOp(async () => {
        syncKMP(str, template);
        const ds = currentDS;
        if (!ds) return;
        currentOp.value = OP.KMP_NEXT;
        addMessage('开始计算 next 数组', MessageType.INFO);
        try {
            await (ds as KMP).getNext();
            addMessage('next 数组计算完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('next 数组计算', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleKMPSearch = (v: Record<string, string>): void => {
    const str = (v.str ?? lastKmpStr).trim();
    const template = (v.template ?? lastKmpTemplate).trim();
    runOp(async () => {
        syncKMP(str, template);
        const ds = currentDS;
        if (!ds) return;
        currentOp.value = OP.KMP_SEARCH;
        addMessage('开始 KMP 匹配', MessageType.INFO);
        try {
            const pos = await (ds as KMP).search();
            addMessage(pos !== null && pos !== undefined ? `匹配成功，出现位置 = ${pos}` : '未匹配到模式串', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('KMP匹配', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleKMPReset = (): void => {
    runOp(async () => {
        currentOp.value = OP.RESTART;
        DataNode.restart();
        visualizerManager.switchVisualizer(VisualizerType.KMP);
        currentDS = create(KMP, lastKmpStr, lastKmpTemplate);
        updateStats();
        addMessage('已重新开始', MessageType.SUCCESS);
    });
};

// ---------- 二叉树遍历 ----------
const handlePreOrder = (): void => {
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.PRE_ORDER;
        addMessage('开始前序遍历', MessageType.INFO);
        try {
            await (ds as BinaryTreeTraversal).preOrderTraversal();
            addMessage('前序遍历执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('前序遍历', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleInOrder = (): void => {
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.IN_ORDER;
        addMessage('开始中序遍历', MessageType.INFO);
        try {
            await (ds as BinaryTreeTraversal).inOrderTraversal();
            addMessage('中序遍历执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('中序遍历', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handlePostOrder = (): void => {
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.POST_ORDER;
        addMessage('开始后序遍历', MessageType.INFO);
        try {
            await (ds as BinaryTreeTraversal).postOrderTraversal();
            addMessage('后序遍历执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('后序遍历', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

// ---------- 清空 / 重新开始 ----------
const handleClear = (): void => {
    const key = currentMenu.value;
    // 二分查找 / 二叉树遍历：重建页面
    if (key === VisualizerType.BINARY_SEARCH || key === VisualizerType.BINARY_TREE_TRAVERSAL) {
        runOp(async () => {
            currentOp.value = OP.RESTART;
            DataNode.restart();
            visualizerManager.switchVisualizer(key);
            createDS(key);
            addMessage('已重新开始', MessageType.SUCCESS);
        });
        return;
    }
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.CLEAR;
        addMessage(`清空${menuTitle(key)}数据`, MessageType.INFO);
        try {
            await (ds as ArrayList | SinglyLinkedList | CircularLinkedList | DoubleLinkedList |
                BinarySearchTree | AVLTree | RedBlackTree | Trie | ArrayStack | ArrayQueue | ArrayDeque).clear();
            addMessage('清空操作执行完毕', MessageType.SUCCESS);
        } catch (error) {
            addOperationError('清空操作', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

// ---------- 二分查找：设置数据并重新开始 ----------
const handleSetData = (): void => {
    const input = window.prompt('请输入升序数组（逗号分隔）：', '1,2,3,4,5,6,7,8,9,10');
    if (input === null) return;
    const data = input.split(/[,，\s]+/).map(s => Number(s.trim())).filter(n => !isNaN(n));
    if (data.length === 0) {
        addMessage('输入无效，请用逗号分隔数字', MessageType.WARNING);
        return;
    }
    data.sort((a, b) => a - b);
    runOp(async () => {
        currentOp.value = OP.RESTART;
        bsDataLen = data.length;
        bsVars.value = { left: 0, right: bsDataLen - 1, mid: Math.floor((bsDataLen - 1) / 2), target: bsVars.value.target };
        DataNode.restart();
        visualizerManager.switchVisualizer(VisualizerType.BINARY_SEARCH);
        currentDS = create(BinarySearch, data);
        updateStats();
        addMessage(`已用 [${data.join(', ')}] 重建数据`, MessageType.SUCCESS);
    });
};

// ---------- 操作台配置（数据驱动，消除重复样板） ----------
const controlGroups = computed<ControlGroupDef[]>(() => {
    const key = currentMenu.value;
    switch (key) {
        case VisualizerType.BINARY_SEARCH:
            return [{
                inputs: [{ key: 'val', placeholder: 'target（查找目标）' }],
                buttons: [
                    { label: '查找数据', icon: '🔍', onClick: handleGet },
                    { label: '重新开始', icon: '🔄', onClick: handleClear },
                    { label: '设置数据并重新开始', icon: '⚙️', onClick: handleSetData },
                ],
            }];
        case VisualizerType.BINARY_TREE_TRAVERSAL:
            return [{
                hint: '点击按钮执行对应遍历，结果展示在画布底部',
                inputs: [],
                buttons: [
                    { label: '前序遍历', icon: '🔀', onClick: handlePreOrder },
                    { label: '中序遍历', icon: '🔀', onClick: handleInOrder },
                    { label: '后序遍历', icon: '🔀', onClick: handlePostOrder },
                    { label: '重新开始', icon: '🔄', onClick: handleClear },
                ],
            }];
        case VisualizerType.DIJKSTRA:
        case VisualizerType.FLOYD:
        case VisualizerType.PRIM:
        case VisualizerType.KRUSKAL:
            return [{
                hint: '使用默认示例图，点击开始执行',
                inputs: [],
                buttons: [
                    { label: '开始执行', icon: '▶', onClick: handleGraphRun },
                    { label: '重新开始', icon: '🔄', onClick: handleGraphReset },
                ],
            }];
        case VisualizerType.BUBBLE_SORT:
        case VisualizerType.INSERTION_SORT:
        case VisualizerType.MERGE_SORT:
        case VisualizerType.QUICK_SORT:
            return [{
                inputs: [{ key: 'sortInput', placeholder: '数组，如 5,3,8,1,9', type: 'text' }],
                init: () => genSortArray(),
                buttons: [
                    { label: '生成随机数组', icon: '🎲', onClick: () => genSortArray() },
                    { label: '开始排序', icon: '▶', onClick: handleSortRun },
                    { label: '重新开始', icon: '🔄', onClick: handleSortReset },
                ],
            }];
        case VisualizerType.KMP:
            return [{
                inputs: [
                    { key: 'str', placeholder: '主串，如 ababcabab', type: 'text' },
                    { key: 'template', placeholder: '模式串，如 abab', type: 'text' },
                ],
                defaults: { str: 'ababcabab', template: 'abab' },
                buttons: [
                    { label: '计算next数组', icon: '🧮', onClick: handleKMPNext },
                    { label: '开始匹配', icon: '🔍', onClick: handleKMPSearch },
                    { label: '重新开始', icon: '🔄', onClick: handleKMPReset },
                ],
            }];
        case VisualizerType.SEGMENT_TREE:
            return [{
                inputs: [
                    { key: 'l', placeholder: 'left（区间左端点）' },
                    { key: 'r', placeholder: 'right（区间右端点）' },
                    { key: 'val', placeholder: 'data（增加值）' },
                ],
                buttons: [
                    { label: '区间加', icon: '➕', onClick: handleSegAdd },
                    { label: '区间求和', icon: '∑', onClick: handleSegQuery },
                    { label: '重新开始', icon: '🔄', onClick: handleSegReset },
                    { label: '设置初始数组', icon: '⚙️', onClick: handleSegSetData },
                ],
            }];
        case VisualizerType.TRIE:
            return [{
                inputs: [{ key: 'word', placeholder: '字符串（小写字母）', type: 'text' }],
                buttons: [
                    { label: '插入 insert', icon: '➕', onClick: handleTrieInsert },
                    { label: '查找 find', icon: '🔍', onClick: handleTrieFind },
                    { label: '前缀数量 prefix', icon: '∑', onClick: handleTriePrefix },
                    { label: '删除 delete', icon: '➖', onClick: handleTrieDelete },
                    { label: '清空', icon: '🧹', onClick: handleClear },
                ],
            }];
        case VisualizerType.ARRAY_STACK:
            return [{
                inputs: [{ key: 'val', placeholder: '数值' }],
                buttons: [
                    { label: '入栈 push', icon: '➕', onClick: handleStackPush },
                    { label: '出栈 pop', icon: '➖', onClick: handleStackPop },
                    { label: '栈顶 top', icon: '🔝', onClick: handleStackTop },
                    { label: '清空栈', icon: '🧹', onClick: handleClear },
                ],
            }];
        case VisualizerType.ARRAY_QUEUE:
            return [{
                inputs: [{ key: 'val', placeholder: '数值' }],
                buttons: [
                    { label: '入队 push', icon: '➕', onClick: handleQueuePush },
                    { label: '出队 pop', icon: '➖', onClick: handleQueuePop },
                    { label: '队首 top', icon: '🔝', onClick: handleQueueFront },
                    { label: '清空队列', icon: '🧹', onClick: handleClear },
                ],
            }];
        case VisualizerType.ARRAY_DEQUE:
            return [{
                inputs: [{ key: 'val', placeholder: '数值' }],
                buttons: [
                    { label: '头部入队', icon: '⬅️', onClick: handleDequePushFirst },
                    { label: '尾部入队', icon: '➡️', onClick: handleDequePushLast },
                    { label: '头部出队', icon: '↩️', onClick: handleDequePopFirst },
                    { label: '尾部出队', icon: '↪️', onClick: handleDequePopLast },
                    { label: '清空队列', icon: '🧹', onClick: handleClear },
                ],
            }];
        default: {
            // 顺序表 / 链表 / 树
            const inputs: ControlGroupDef['inputs'] = [];
            if (key === VisualizerType.ARRAY_LIST || isLinkedListDS.value) {
                inputs.push({ key: 'idx', placeholder: '索引' });
            }
            inputs.push({ key: 'val', placeholder: '数值' });
            const buttons: ControlGroupDef['buttons'] = [
                { label: '插入数据', icon: '➕', onClick: handleInsert },
            ];
            if (isTreeDS.value || isLinkedListDS.value || key === VisualizerType.ARRAY_LIST) {
                buttons.push({ label: '查找数据', icon: '🔍', onClick: handleGet });
            }
            if (key === VisualizerType.ARRAY_LIST || isLinkedListDS.value) {
                buttons.push({ label: '修改数据', icon: '✏️', onClick: handleSet });
            }
            if (isTreeDS.value || isLinkedListDS.value || key === VisualizerType.ARRAY_LIST) {
                buttons.push({ label: '删除数据', icon: '➖', onClick: handleDelete });
            }
            buttons.push({ label: '清空数据', icon: '🧹', onClick: handleClear });
            if (isLinkedListDS.value) {
                return [{
                    hint: '索引留空时：插入＝末尾插入，查找/修改/删除按下标0处理；查找与修改会高亮对应节点',
                    inputs,
                    buttons,
                }];
            }
            return [{ inputs, buttons }];
        }
    }
});

// ---------- 生命周期 ----------
onMounted(async () => {
    if (svgRef.value) {
        visualizerManager.init(svgRef.value);
    }

    // 二分查找：由可视化器在指针变化时回调，避免轮询
    visualizerManager.setBinarySearchPointerListener((left, right, mid) => {
        bsVars.value.left = left;
        bsVars.value.right = right;
        bsVars.value.mid = mid;
    });

    await selectMenu(VisualizerType.ARRAY_LIST);
});

onBeforeUnmount(() => {
    visualizerManager.setBinarySearchPointerListener(null);
});
</script>

<template>
    <div class="app-container">
        <!-- 左侧：树状菜单 -->
        <MenuSidebar class="sidebar" :nodes="menuTree" :current-key="currentMenu" @select="selectMenu" />

        <!-- 中间：主区域 -->
        <main class="main-area">
            <div class="top-header">
                <h1 class="page-title">{{ menuTitle(currentMenu) }}</h1>
            </div>
            <div class="canvas-container">
                <StatsPanel
                    :is-binary-search="currentMenu === VisualizerType.BINARY_SEARCH"
                    :bs-vars="bsVars"
                    :size="stats.size"
                    :current-op="currentOp"
                />
                <StepControls @play="handlePlay" @fast="handleFast" @pause="handlePause" @step="handleStep" />
                <svg ref="svgRef" class="canvas-svg"></svg>
            </div>
            <MessagePanel :messages="messages" />
        </main>

        <!-- 右侧：操作台 -->
        <ControlPanel :groups="controlGroups" :current-menu="currentMenu" />
    </div>
</template>

<style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
html,
body,
#app {
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}
</style>

<style scoped>
.app-container {
    display: flex;
    width: 100%;
    height: 100%;
    background: #fff;
}
.sidebar {
    width: 220px;
    min-width: 220px;
    height: 100%;
    overflow-y: auto;
    background: #f7f9fc;
    border-right: 1px solid #e0e4ea;
    padding: 12px 0;
}
.main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.top-header {
    padding: 10px 18px;
    border-bottom: 1px solid #eee;
    background: #fff;
}
.page-title {
    font-size: 17px;
    color: #222;
}
.canvas-container {
    position: relative;
    flex: 1;
    min-height: 0;
    background: #fafafa;
}
.canvas-svg {
    width: 100%;
    height: 100%;
    display: block;
}
.control-panel {
    width: 240px;
    min-width: 240px;
}
</style>
