<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
// 控制�?
import { StepController, StepStatus, PLAY_TIME_INTERVAL, FAST_TIME_INTERVAL } from './controller/StepController';
import { MessageController, MessageType } from './controller/MessageController';
// 核心
import { create } from './node/factory';
import { DataNode } from './node/DataNode';
import { VisualizerManager, VisualizerType } from './visualizer/VisualizerManager';
import { SortVisualizer } from './visualizer/SortVisualizer';
import { LinkedListVisualizer } from './visualizer/LinkedListVisualizer';
import { createStructure, getGraphEdges, getStructureTitle, type DSInstance } from './visualizer/registry';
// 组件
import MenuSidebar, { type MenuNode } from './components/MenuSidebar.vue';
import StatsPanel from './components/StatsPanel.vue';
import StepControls from './components/StepControls.vue';
import MessagePanel, { type UiMessage } from './components/MessagePanel.vue';
import ControlPanel, { type ControlGroupDef, type ControlInputDef } from './components/ControlPanel.vue';
// 数据结构
import { ArrayList } from './datastructure/List/ArrayList';
import { LinkedList as SinglyLinkedList } from './datastructure/List/SinglyLinkedList';
import { CircularLinkedList } from './datastructure/List/CircularLinkedList';
import { DoubleLinkedList } from './datastructure/List/DoubleLinkedList';
import { ArrayStack } from './datastructure/Stack/ArrayStack';
import { LinkedStack } from './datastructure/Stack/LinkedStack';
import { ArrayQueue } from './datastructure/Queue/ArrayQueue';
import { LinkedQueue } from './datastructure/Queue/LinkedQueue';
import { ArrayDeque } from './datastructure/Queue/ArrayDeque';
import { LinkedDeque } from './datastructure/Queue/LinkedDeque';
import { BinarySearchTree } from './datastructure/Tree/BinarySearchTree/BinarySearchTree';
import { AVLTree } from './datastructure/Tree/BinarySearchTree/AVLTree';
import { RedBlackTree } from './datastructure/Tree/BinarySearchTree/RedBlackTree';
import { SegmentTree } from './datastructure/Tree/SegmentTree/SegmentTree';
import { Trie } from './datastructure/Tree/Trie/Trie';
// 算法
import { BinarySearch } from './algorithm/List/BinarySearch';
import { BinaryTreeTraversal } from './algorithm/Tree/BinaryTreeTraversal';
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
    DEQUE_GET_FIRST: '取队首',
    DEQUE_GET_LAST: '取队尾',
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

// ---------- 页面状�?----------
const currentMenu = ref<VisualizerType>(VisualizerType.ARRAY_LIST);
const currentOp = ref<string>(OP.RESTART);
const stats = ref({ size: 0 });
const messages = ref<UiMessage[]>([]);
const bsVars = ref({ left: 0, right: 9, mid: 4, target: 0 });
const svgRef = ref<SVGSVGElement | null>(null);

// 当前数据结构实例（类型定义见可视化注册表�?
let currentDS: DSInstance | null = null;

// KMP 实例对应的主�?模式串（由页面层持有，避免读取算法层私有字段�?
let lastKmpStr = 'ababcabab';
let lastKmpTemplate = 'abab';
// 二分查找/线段�?遍历的规模（由页面层持有�?
let bsDataLen = 10;
let segDataLen = 8;
let traversalNodeCount = 7;
let graphNodeCnt = 6;
// 排序当前数组（页面层持有，输入框同步显示�?
const sortData = ref<number[]>([]);
// 树插入自动编号（�?开始，切换菜单重置�?
let treeInsertCounter = 1;

// ---------- 链表等按下标操作时的输入解析 ----------
/**
 * 解析索引输入框：为空或非法时取默认�?
 * （number 输入框经 v-model 后可能已是number，两种都要支持）
 * @param raw 输入框内�?
 * @param fallback 默认索引
 */
const parseIndex = (raw: string | number | undefined, fallback: number): number => {
    if (typeof raw === 'number') return Number.isFinite(raw) ? Math.trunc(raw) : fallback;
    const text = (raw ?? '').trim();
    if (text === '') return fallback;
    const value = Number(text);
    return Number.isFinite(value) ? Math.trunc(value) : fallback;
};

// ---------- 操作参数与校验（对话框提交前执行） ----------
const numberParam = (key: string, label: string, placeholder?: string): ControlInputDef =>
    ({ key, label, placeholder, type: 'number' });
const textParam = (key: string, label: string, placeholder?: string): ControlInputDef =>
    ({ key, label, placeholder, type: 'text' });

const parseNumberList = (raw: string): number[] | null => {
    const parts = raw.trim().split(/[,，\s]+/).filter(Boolean);
    if (parts.length === 0) return null;
    const values = parts.map(Number);
    return values.every(Number.isFinite) ? values : null;
};

const validateNumberList = (raw: string): string | null => {
    return parseNumberList(raw) === null ? '请输入有效数字，使用逗号或空格分隔' : null;
};

const currentListSize = (): number | null => {
    const ds = currentDS;
    if (!ds) return null;
    if (isLinkedListDS.value) {
        return (ds as SinglyLinkedList | CircularLinkedList | DoubleLinkedList).size();
    }
    if (currentMenu.value === VisualizerType.ARRAY_LIST) {
        return (ds as ArrayList).size();
    }
    return null;
};

const validateListIndex = (raw: string, allowEnd: boolean): string | null => {
    const size = currentListSize();
    if (size === null) return null;
    const idx = Number(raw);
    if (!Number.isInteger(idx)) return '索引必须为整数';
    if (size === 0 && !allowEnd) return '当前表为空';
    const max = allowEnd ? size : size - 1;
    if (idx < 0 || idx > max) return `索引需在 0 到 ${max} 之间`;
    return null;
};

const validateSegmentRange = (values: Record<string, string>): string | null => {
    const l = Number(values.l);
    const r = Number(values.r);
    if (!Number.isInteger(l) || !Number.isInteger(r)) return '区间端点必须为整数';
    if (l < 0 || r >= segDataLen) return `区间需在 0 到 ${segDataLen - 1} 之间`;
    if (l > r) return '左端点不能大于右端点';
    return null;
};

const validateTrieWord = (raw: string): string | null => {
    return /^[a-z]+$/.test(raw.trim()) ? null : '请输入仅包含小写字母的字符串';
};

const valParam = numberParam('val', '数值');
const idxParam = numberParam('idx', '索引');
const optionalIdxParam: ControlInputDef = {
    ...idxParam,
    placeholder: '可留空，默认末尾',
    required: false,
};
const dataParam = textParam('data', '数组', '如 1,2,3');
const targetParam = numberParam('val', '查找目标');
const sortParam = textParam('sortInput', '数组', '如 5,3,8,1,9');
const kmpStrParam = textParam('str', '主串', '如 ababcabab');
const kmpTemplateParam = textParam('template', '模式串', '如 abab');
const segLParam = numberParam('l', '左端点');
const segRParam = numberParam('r', '右端点');
const segValParam = numberParam('val', '增量');
const segDataParam = textParam('data', '初始数组', '如 1,2,3');
const wordParam = textParam('word', '字符串（小写字母）');

/**
 * 高亮（闪烁）链表中第idx个数据节点，用于“查�?修改”动�?
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

const clearMessages = (): void => {
    messages.value = [];
};

const addOperationError = (action: string, error: unknown): void => {
    const detail = error instanceof Error ? error.message : String(error);
    addMessage(action + '失败：' + detail, MessageType.ERROR);
};

messageController.setMessageHandler((msg: string, type: number) => {
    addMessage(msg, type);
});

// ---------- 复合操作串行�?----------
let opChain: Promise<void> = Promise.resolve();
// 已提交但尚未结束的复合操作数量（含正在执行与排队等待的）
const opPending = ref(0);
const opRunning = computed(() => opPending.value > 0);

const runOp = (op: () => Promise<void>): void => {
    const queued = opPending.value > 0;
    ++opPending.value;

    // 已有操作在执行或排队时，立即快进当前操作，避免插队操作被暂停卡住
    if (queued) {
        stepController.setTimeInterval(FAST_TIME_INTERVAL);
        stepController.setStatus(StepStatus.PLAYING);
    }

    opChain = opChain
        // 上一次操作即使出错也不能污染串行队列，否则后面所有操作都会被静默跳过
        .catch(() => { /* 上一次异常已由该操作�?catch 记录 */ })
        .then(async () => {
            try {
                await op();
            } catch (error) {
                addMessage('操作执行出错：' + (error instanceof Error ? error.message : String(error)),
                    MessageType.ERROR);
            }
        }).finally(() => {
            --opPending.value;
            if (opPending.value === 0) {
                stepController.setStatus(StepStatus.PAUSE_OR_FREE);
            }
        });
};

/**
 * 中断处理：切�?重置前强制把当前复合操作快进播完�?
 * 而不是取消它——算法层不支持回滚，wait() 也永远不会失败�?
 */
const forceFinishPending = async (): Promise<void> => {
    // 等待期间可能又有新操作入队，因此循环排空
    while (opPending.value > 0) {
        stepController.setTimeInterval(FAST_TIME_INTERVAL);
        stepController.setStatus(StepStatus.PLAYING);
        const chain = opChain;
        await chain.catch(() => { /* 异常已在runOp内记�?*/ });
        if (chain === opChain) {
            break;
        }
    }
};

// ---------- 流程控制 ----------
const handlePlay = (): void => {
    if (!opRunning.value) return;
    stepController.setTimeInterval(PLAY_TIME_INTERVAL);
    stepController.setStatus(StepStatus.PLAYING);
};
const handleFast = (): void => {
    if (!opRunning.value) return;
    stepController.setTimeInterval(FAST_TIME_INTERVAL);
    stepController.setStatus(StepStatus.PLAYING);
};
const handlePause = (): void => {
    if (!opRunning.value) return;
    stepController.setStatus(StepStatus.PAUSE_OR_FREE);
};
const handleStep = (): void => {
    if (!opRunning.value) return;
    stepController.setStatus(StepStatus.STEP_EXECUTION);
};

// ---------- 菜单树（三栏布局：左侧树状菜单） ----------
const menuItem = (key: VisualizerType): MenuNode => ({ label: getStructureTitle(key), key });

const menuTree: MenuNode[] = [
    {
        label: '数据结构',
        children: [
            {
                label: '线性表',
                children: [
                    menuItem(VisualizerType.ARRAY_LIST),
                    menuItem(VisualizerType.SINGLY_LINKED_LIST),
                    menuItem(VisualizerType.CIRCULAR_LINKED_LIST),
                    menuItem(VisualizerType.DOUBLE_LINKED_LIST),
                ],
            },
            {
                label: '栈与队列',
                children: [
                    menuItem(VisualizerType.ARRAY_STACK),
                    menuItem(VisualizerType.LINKED_STACK),
                    menuItem(VisualizerType.ARRAY_QUEUE),
                    menuItem(VisualizerType.LINKED_QUEUE),
                    menuItem(VisualizerType.ARRAY_DEQUE),
                    menuItem(VisualizerType.LINKED_DEQUE),
                ],
            },
            {
                label: '树',
                children: [
                    menuItem(VisualizerType.BST),
                    menuItem(VisualizerType.AVL),
                    menuItem(VisualizerType.RED_BLACK),
                    menuItem(VisualizerType.SEGMENT_TREE),
                    menuItem(VisualizerType.TRIE),
                ],
            },
        ],
    },
    {
        label: '算法',
        children: [
            {
                label: '查找',
                children: [menuItem(VisualizerType.BINARY_SEARCH)],
            },
            {
                label: '二叉树遍历',
                children: [menuItem(VisualizerType.BINARY_TREE_TRAVERSAL)],
            },
            {
                label: '图算法',
                children: [
                    menuItem(VisualizerType.DIJKSTRA),
                    menuItem(VisualizerType.FLOYD),
                    menuItem(VisualizerType.PRIM),
                    menuItem(VisualizerType.KRUSKAL),
                ],
            },
            {
                label: '排序',
                children: [
                    menuItem(VisualizerType.BUBBLE_SORT),
                    menuItem(VisualizerType.INSERTION_SORT),
                    menuItem(VisualizerType.MERGE_SORT),
                    menuItem(VisualizerType.QUICK_SORT),
                ],
            },
            {
                label: '字符串匹配',
                children: [menuItem(VisualizerType.KMP)],
            },
        ],
    },
];

// 菜单标题（单一来源：可视化注册表）
const menuTitle = (key: VisualizerType): string => getStructureTitle(key);

// ---------- 数据创建（实例来自注册表，这里只维护页面级规模状态） ----------
const createDS = (key: VisualizerType): void => {
    treeInsertCounter = 1;
    currentDS = createStructure(key);

    switch (key) {
        case VisualizerType.SEGMENT_TREE:
            segDataLen = 8;
            break;
        case VisualizerType.BINARY_SEARCH:
            bsDataLen = 10;
            bsVars.value = {
                left: 0,
                right: bsDataLen - 1,
                mid: Math.floor((bsDataLen - 1) / 2),
                target: bsVars.value.target,
            };
            break;
        case VisualizerType.BINARY_TREE_TRAVERSAL:
            traversalNodeCount = 7;
            break;
        case VisualizerType.DIJKSTRA:
        case VisualizerType.FLOYD:
        case VisualizerType.PRIM:
        case VisualizerType.KRUSKAL: {
            const edges = getGraphEdges(key) ?? [];
            graphNodeCnt = edges.reduce((m, e) => Math.max(m, e[0] + 1, e[1] + 1), 0);
            break;
        }
        case VisualizerType.KMP:
            lastKmpStr = 'ababcabab';
            lastKmpTemplate = 'abab';
            break;
        default:
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

// ---------- 菜单切换（原设计：强制播完再切换�?----------
const selectMenu = async (key: VisualizerType): Promise<void> => {
    await forceFinishPending();
    currentMenu.value = key;
    currentOp.value = OP.RESTART;
    clearMessages();
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

// ---------- 数据操作（统一模板：runOp 串行�?+ 快进排队�?----------
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
            } catch (error) {
                addOperationError('插入操作', error);
            }
            updateStats();
            stepController.setStatus(StepStatus.PAUSE_OR_FREE);
        });
        return;
    }
    // 顺序表：按索引插�?
    runOp(async () => {
        currentOp.value = OP.INSERT;
        addMessage(`在索引 ${insertIdx} 处插入元素 ${insertVal}`, MessageType.INFO);
        try {
            await (ds as ArrayList).insert(insertIdx, insertVal);
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
    // 链表：按下标取值（并高亮该节点�?
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
    // 顺序表：按索引取�?
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
        } catch (error) {
            addOperationError('修改操作', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

// ---------- �?/ 队列 / 双端队列 ----------
const handleStackPush = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const val = Number(v.val ?? 0);
    runOp(async () => {
        currentOp.value = OP.STACK_PUSH;
        addMessage(`入栈：${val}`, MessageType.INFO);
        try {
            await (ds as ArrayStack | LinkedStack).push(val);
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
            await (ds as ArrayStack | LinkedStack).pop();
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
            const v = await (ds as ArrayStack | LinkedStack).top();
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
            await (ds as ArrayQueue | LinkedQueue).push(val);
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
            await (ds as ArrayQueue | LinkedQueue).pop();
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
            const v = await (ds as ArrayQueue | LinkedQueue).top();
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
            await (ds as ArrayDeque | LinkedDeque).pushFirst(val);
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
            await (ds as ArrayDeque | LinkedDeque).pushLast(val);
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
            await (ds as ArrayDeque | LinkedDeque).popFirst();
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
            await (ds as ArrayDeque | LinkedDeque).popLast();
        } catch (error) {
            addOperationError('尾部出队', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleDequeGetFirst = (): void => {
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.DEQUE_GET_FIRST;
        addMessage('查看队首', MessageType.INFO);
        try {
            const v = await (ds as ArrayDeque | LinkedDeque).getFirst();
            addMessage(`队首元素 = ${v}`, MessageType.SUCCESS);
        } catch (error) {
            addOperationError('查看队首', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};
const handleDequeGetLast = (): void => {
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.DEQUE_GET_LAST;
        addMessage('查看队尾', MessageType.INFO);
        try {
            const v = await (ds as ArrayDeque | LinkedDeque).getLast();
            addMessage(`队尾元素 = ${v}`, MessageType.SUCCESS);
        } catch (error) {
            addOperationError('查看队尾', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

// ---------- 线段�?----------
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
const handleSegSetData = (v: Record<string, string>): void => {
    const input = (v.data ?? '').trim();
    if (input === '') {
        addMessage('请输入线段树初始数组（逗号分隔）', MessageType.WARNING);
        return;
    }
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
        } catch (error) {
            addOperationError('删除操作', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

// ---------- 图算�?----------
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

// ---------- 二叉树遍�?----------
const handlePreOrder = (): void => {
    const ds = currentDS;
    if (!ds) return;
    runOp(async () => {
        currentOp.value = OP.PRE_ORDER;
        addMessage('开始前序遍历', MessageType.INFO);
        try {
            await (ds as BinaryTreeTraversal).preOrderTraversal();
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
        } catch (error) {
            addOperationError('后序遍历', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

// ---------- 清空 / 重新开�?----------
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
                BinarySearchTree | AVLTree | RedBlackTree | Trie | ArrayStack | LinkedStack |
                ArrayQueue | LinkedQueue | ArrayDeque | LinkedDeque).clear();
        } catch (error) {
            addOperationError('清空操作', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

// ---------- 二分查找：设置数据并重新开�?----------
const handleSetData = (v: Record<string, string>): void => {
    const input = (v.data ?? '').trim();
    if (input === '') {
        addMessage('请输入升序数组（逗号分隔）', MessageType.WARNING);
        return;
    }
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
                hint: '查找使用升序数组；设置数据会按升序重建并重新开始',
                inputs: [
                    { key: 'val', placeholder: 'target（查找目标）' },
                    { key: 'data', placeholder: '升序数组，如 1,2,3', type: 'text' },
                ],
                buttons: [
                    { label: '查找数据', icon: 'search', params: [targetParam], onClick: handleGet },
                    { label: '重新开始', icon: 'rotate', onClick: handleClear },
                    {
                        label: '设置数据并重新开始',
                        icon: 'settings',
                        params: [dataParam],
                        validate: (v) => validateNumberList(v.data ?? ''),
                        onClick: handleSetData,
                    },
                ],
            }];
        case VisualizerType.BINARY_TREE_TRAVERSAL:
            return [{
                hint: '点击按钮执行对应遍历，结果展示在画布底部',
                inputs: [],
                buttons: [
                    { label: '前序遍历', icon: 'list', onClick: handlePreOrder },
                    { label: '中序遍历', icon: 'list', onClick: handleInOrder },
                    { label: '后序遍历', icon: 'list', onClick: handlePostOrder },
                    { label: '重新开始', icon: 'rotate', onClick: handleClear },
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
                    { label: '开始执行', icon: 'play', onClick: handleGraphRun },
                    { label: '重新开始', icon: 'rotate', onClick: handleGraphReset },
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
                    { label: '生成随机数组', icon: 'refresh', onClick: () => genSortArray() },
                    {
                        label: '开始排序',
                        icon: 'play',
                        params: [sortParam],
                        getInitial: () => ({ sortInput: sortData.value.join(',') }),
                        validate: (v) => validateNumberList(v.sortInput ?? ''),
                        onClick: handleSortRun,
                    },
                    { label: '重新开始', icon: 'rotate', onClick: handleSortReset },
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
                    {
                        label: '计算next数组',
                        icon: 'list',
                        params: [kmpStrParam, kmpTemplateParam],
                        onClick: handleKMPNext,
                    },
                    {
                        label: '开始匹配',
                        icon: 'search',
                        params: [kmpStrParam, kmpTemplateParam],
                        onClick: handleKMPSearch,
                    },
                    { label: '重新开始', icon: 'rotate', onClick: handleKMPReset },
                ],
            }];
        case VisualizerType.SEGMENT_TREE:
            return [{
                inputs: [
                    { key: 'l', placeholder: 'left（区间左端点）' },
                    { key: 'r', placeholder: 'right（区间右端点）' },
                    { key: 'val', placeholder: '增量' },
                    { key: 'data', placeholder: '初始数组，如 1,2,3', type: 'text' },
                ],
                buttons: [
                    {
                        label: '区间加',
                        icon: 'plus',
                        params: [segLParam, segRParam, segValParam],
                        validate: validateSegmentRange,
                        onClick: handleSegAdd,
                    },
                    {
                        label: '区间求和',
                        icon: 'sum',
                        params: [segLParam, segRParam],
                        validate: validateSegmentRange,
                        onClick: handleSegQuery,
                    },
                    { label: '重新开始', icon: 'rotate', onClick: handleSegReset },
                    {
                        label: '设置初始数组',
                        icon: 'settings',
                        params: [segDataParam],
                        validate: (v) => validateNumberList(v.data ?? ''),
                        onClick: handleSegSetData,
                    },
                ],
            }];
        case VisualizerType.TRIE:
            return [{
                inputs: [{ key: 'word', placeholder: '字符串（小写字母）', type: 'text' }],
                buttons: [
                    {
                        label: '插入 insert',
                        icon: 'plus',
                        params: [wordParam],
                        validate: (v) => validateTrieWord(v.word ?? ''),
                        onClick: handleTrieInsert,
                    },
                    {
                        label: '查找 find',
                        icon: 'search',
                        params: [wordParam],
                        validate: (v) => validateTrieWord(v.word ?? ''),
                        onClick: handleTrieFind,
                    },
                    {
                        label: '前缀数量 prefix',
                        icon: 'sum',
                        params: [wordParam],
                        validate: (v) => validateTrieWord(v.word ?? ''),
                        onClick: handleTriePrefix,
                    },
                    {
                        label: '删除 delete',
                        icon: 'minus',
                        params: [wordParam],
                        validate: (v) => validateTrieWord(v.word ?? ''),
                        onClick: handleTrieDelete,
                    },
                    { label: '清空', icon: 'trash', onClick: handleClear },
                ],
            }];
        case VisualizerType.ARRAY_STACK:
        case VisualizerType.LINKED_STACK:
            return [{
                inputs: [{ key: 'val', placeholder: '数值' }],
                buttons: [
                    { label: '入栈', icon: 'plus', params: [valParam], onClick: handleStackPush },
                    { label: '出栈', icon: 'minus', onClick: handleStackPop },
                    { label: '查看栈顶', icon: 'search', onClick: handleStackTop },
                    { label: '清空栈', icon: 'trash', onClick: handleClear },
                ],
            }];
        case VisualizerType.ARRAY_QUEUE:
        case VisualizerType.LINKED_QUEUE:
            return [{
                inputs: [{ key: 'val', placeholder: '数值' }],
                buttons: [
                    { label: '入队', icon: 'plus', params: [valParam], onClick: handleQueuePush },
                    { label: '出队', icon: 'minus', onClick: handleQueuePop },
                    { label: '查看队首', icon: 'search', onClick: handleQueueFront },
                    { label: '清空队列', icon: 'trash', onClick: handleClear },
                ],
            }];
        case VisualizerType.ARRAY_DEQUE:
        case VisualizerType.LINKED_DEQUE:
            return [{
                inputs: [{ key: 'val', placeholder: '数值' }],
                buttons: [
                    { label: '头部入队', icon: 'plus', params: [valParam], onClick: handleDequePushFirst },
                    { label: '尾部入队', icon: 'plus', params: [valParam], onClick: handleDequePushLast },
                    { label: '头部出队', icon: 'minus', onClick: handleDequePopFirst },
                    { label: '尾部出队', icon: 'minus', onClick: handleDequePopLast },
                    { label: '取队首', icon: 'search', onClick: handleDequeGetFirst },
                    { label: '取队尾', icon: 'search', onClick: handleDequeGetLast },
                    { label: '清空队列', icon: 'trash', onClick: handleClear },
                ],
            }];
        default: {
            // 顺序表 / 链表 / 树
            const inputs: ControlGroupDef['inputs'] = [];
            if (key === VisualizerType.ARRAY_LIST || isLinkedListDS.value) {
                inputs.push({ key: 'idx', placeholder: '索引' });
            }
            inputs.push({ key: 'val', placeholder: '数值' });
            const buttons: ControlGroupDef['buttons'] = [];

            if (isTreeDS.value) {
                buttons.push(
                    { label: '插入数据', icon: 'plus', params: [valParam], onClick: handleInsert },
                    { label: '查找数据', icon: 'search', params: [valParam], onClick: handleGet },
                    { label: '删除数据', icon: 'minus', params: [valParam], onClick: handleDelete },
                );
            } else if (key === VisualizerType.ARRAY_LIST) {
                buttons.push(
                    {
                        label: '插入数据',
                        icon: 'plus',
                        params: [idxParam, valParam],
                        validate: (v) => validateListIndex(v.idx ?? '', true),
                        onClick: handleInsert,
                    },
                    {
                        label: '查找数据',
                        icon: 'search',
                        params: [idxParam],
                        validate: (v) => validateListIndex(v.idx ?? '', false),
                        onClick: handleGet,
                    },
                    {
                        label: '修改数据',
                        icon: 'pencil',
                        params: [idxParam, valParam],
                        validate: (v) => validateListIndex(v.idx ?? '', false),
                        onClick: handleSet,
                    },
                    {
                        label: '删除数据',
                        icon: 'minus',
                        params: [idxParam],
                        validate: (v) => validateListIndex(v.idx ?? '', false),
                        onClick: handleDelete,
                    },
                );
            } else if (isLinkedListDS.value) {
                buttons.push(
                    {
                        label: '插入数据',
                        icon: 'plus',
                        params: [optionalIdxParam, valParam],
                        validate: (v) => (v.idx ?? '').trim() === '' ? null : validateListIndex(v.idx ?? '', true),
                        onClick: handleInsert,
                    },
                    {
                        label: '查找数据',
                        icon: 'search',
                        params: [idxParam],
                        validate: (v) => validateListIndex(v.idx ?? '', false),
                        onClick: handleGet,
                    },
                    {
                        label: '修改数据',
                        icon: 'pencil',
                        params: [idxParam, valParam],
                        validate: (v) => validateListIndex(v.idx ?? '', false),
                        onClick: handleSet,
                    },
                    {
                        label: '删除数据',
                        icon: 'minus',
                        params: [idxParam],
                        validate: (v) => validateListIndex(v.idx ?? '', false),
                        onClick: handleDelete,
                    },
                );
            }
            buttons.push({ label: '清空数据', icon: 'trash', onClick: handleClear });
            if (isLinkedListDS.value) {
                return [{
                    hint: '插入时索引可留空，默认插入到末尾；查找、修改和删除需要填写索引',
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

    // 二分查找：由可视化器在指针变化时回调，避免轮�?
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
        <!-- 左侧：树状菜�?-->
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
                />
                <StepControls
                    v-if="opRunning"
                    :current-op="currentOp"
                    @play="handlePlay"
                    @fast="handleFast"
                    @pause="handlePause"
                    @step="handleStep"
                />
                <svg ref="svgRef" class="canvas-svg"></svg>
            </div>
            <MessagePanel :messages="messages" @clear="clearMessages" />
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
    font-size: 18px;
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
