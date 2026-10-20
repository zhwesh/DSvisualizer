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
import { createGraphStructure, createStructure, getGraphEdges, getStructureTitle, type DSInstance } from './visualizer/registry';
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
import { TreapTree } from './datastructure/Tree/BinarySearchTree/TreapTree';
import { ScapegoatTree } from './datastructure/Tree/BinarySearchTree/ScapegoatTree';
import { SegmentTree } from './datastructure/Tree/SegmentTree/SegmentTree';
import { Trie } from './datastructure/Tree/Trie/Trie';
import { UnionFindSet } from './datastructure/Other/UnionFindSet';
import { BinaryIndexedTree } from './datastructure/Other/BinaryIndexedTree';
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
    UNION_FIND_UNION: '合并集合',
    UNION_FIND_FIND: '查找根节点',
    UNION_FIND_SIZE: '查询集合大小',
    UNION_FIND_SAME: '判断是否同集合',
    BIT_ADD: '单点加',
    BIT_QUERY: '区间求和',
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
const currentResult = ref<string | null>(null);
const stats = ref({ size: 0 });
const messages = ref<UiMessage[]>([]);
const bsVars = ref({ left: 0, right: 9, mid: 4, target: 0 });
const svgRef = ref<SVGSVGElement | null>(null);
const appRef = ref<HTMLElement | null>(null);
const canvasViewportRef = ref<HTMLDivElement | null>(null);

// ---------- 可拖拽面板尺寸 ----------
const readStoredSize = (key: string, fallback: number): number => {
    try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return fallback;
        const value = Number(raw);
        return Number.isFinite(value) ? value : fallback;
    } catch {
        return fallback;
    }
};

const writeStoredSize = (key: string, value: number): void => {
    try {
        window.localStorage.setItem(key, String(Math.round(value)));
    } catch {
        // 隐私模式等场景下忽略存储失败
    }
};

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 460;
const CONTROL_MIN = 200;
const CONTROL_MAX = 520;
const MESSAGE_MIN = 72;

const sidebarWidth = ref(readStoredSize('dsvisualizer.layout.sidebarWidth', 220));
const controlWidth = ref(readStoredSize('dsvisualizer.layout.controlWidth', 240));
const messageHeight = ref(readStoredSize('dsvisualizer.layout.messageHeight', 180));

const sidebarStyle = computed(() => ({
    width: sidebarWidth.value + 'px',
    flex: `0 0 ${sidebarWidth.value}px`,
}));
const controlStyle = computed(() => ({
    width: controlWidth.value + 'px',
    flex: `0 0 ${controlWidth.value}px`,
}));
const messageStyle = computed(() => ({
    height: messageHeight.value + 'px',
    flex: `0 0 ${messageHeight.value}px`,
}));

type ResizeTarget = 'sidebar' | 'control' | 'messages';

interface ResizeState {
    target: ResizeTarget;
    startX: number;
    startY: number;
    startSize: number;
}

let resizeState: ResizeState | null = null;
const resizingTarget = ref<ResizeTarget | null>(null);

const resizeRange = (target: ResizeTarget): [number, number] => {
    const width = appRef.value?.clientWidth ?? window.innerWidth;
    const height = appRef.value?.clientHeight ?? window.innerHeight;
    if (target === 'sidebar') {
        return [SIDEBAR_MIN, Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, width * 0.45))];
    }
    if (target === 'control') {
        return [CONTROL_MIN, Math.max(CONTROL_MIN, Math.min(CONTROL_MAX, width * 0.5))];
    }
    return [MESSAGE_MIN, Math.max(MESSAGE_MIN, height - 220)];
};

const clampSize = (target: ResizeTarget, value: number): number => {
    const [min, max] = resizeRange(target);
    return Math.min(Math.max(value, min), max);
};

const beginResize = (target: ResizeTarget, event: PointerEvent): void => {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    element.setPointerCapture(event.pointerId);
    resizeState = {
        target,
        startX: event.clientX,
        startY: event.clientY,
        startSize: target === 'sidebar' ? sidebarWidth.value
            : target === 'control' ? controlWidth.value
                : messageHeight.value,
    };
    resizingTarget.value = target;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = target === 'messages' ? 'row-resize' : 'col-resize';
};

const moveResize = (event: PointerEvent): void => {
    const state = resizeState;
    if (!state) return;

    let next = state.startSize;
    if (state.target === 'sidebar') {
        next += event.clientX - state.startX;
    } else if (state.target === 'control') {
        next -= event.clientX - state.startX;
    } else {
        next -= event.clientY - state.startY;
    }
    next = clampSize(state.target, next);

    if (state.target === 'sidebar') {
        sidebarWidth.value = next;
    } else if (state.target === 'control') {
        controlWidth.value = next;
    } else {
        messageHeight.value = next;
    }
};

const endResize = (event: PointerEvent): void => {
    if (!resizeState) return;
    const element = event.currentTarget as HTMLElement;
    if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
    }
    writeStoredSize('dsvisualizer.layout.sidebarWidth', sidebarWidth.value);
    writeStoredSize('dsvisualizer.layout.controlWidth', controlWidth.value);
    writeStoredSize('dsvisualizer.layout.messageHeight', messageHeight.value);
    resizeState = null;
    resizingTarget.value = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
};

// ---------- 画布缩放/平移 ----------
const CANVAS_MIN_SCALE = 0.25;
const CANVAS_MAX_SCALE = 6;

const canvasScale = ref(1);
const canvasPanX = ref(0);
const canvasPanY = ref(0);
const isCanvasPanning = ref(false);
const canvasTransform = computed(
    () => `translate(${canvasPanX.value}px, ${canvasPanY.value}px) scale(${canvasScale.value})`,
);
const canvasZoomLabel = computed(() => Math.round(canvasScale.value * 100) + '%');

interface PanState {
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
}

let panState: PanState | null = null;

const clampCanvasPan = (): void => {
    const viewport = canvasViewportRef.value;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const scaledWidth = rect.width * canvasScale.value;
    const scaledHeight = rect.height * canvasScale.value;
    const clamp = (value: number, min: number, max: number): number =>
        Math.min(Math.max(value, min), max);

    if (scaledWidth >= rect.width) {
        canvasPanX.value = clamp(canvasPanX.value, rect.width - scaledWidth, 0);
    } else {
        canvasPanX.value = clamp(canvasPanX.value, 0, rect.width - scaledWidth);
    }
    if (scaledHeight >= rect.height) {
        canvasPanY.value = clamp(canvasPanY.value, rect.height - scaledHeight, 0);
    } else {
        canvasPanY.value = clamp(canvasPanY.value, 0, rect.height - scaledHeight);
    }
};

const zoomCanvasAt = (anchorX: number, anchorY: number, factor: number): void => {
    const previous = canvasScale.value;
    const next = Math.min(Math.max(previous * factor, CANVAS_MIN_SCALE), CANVAS_MAX_SCALE);
    if (next === previous) return;

    const ratio = next / previous;
    canvasPanX.value = anchorX - ratio * (anchorX - canvasPanX.value);
    canvasPanY.value = anchorY - ratio * (anchorY - canvasPanY.value);
    canvasScale.value = next;
    clampCanvasPan();
};

const resetCanvasView = (): void => {
    canvasScale.value = 1;
    canvasPanX.value = 0;
    canvasPanY.value = 0;
};

const handleCanvasWheel = (event: WheelEvent): void => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();

    const viewport = canvasViewportRef.value;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();

    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 16;
    else if (event.deltaMode === 2) delta *= rect.height;

    zoomCanvasAt(
        event.clientX - rect.left,
        event.clientY - rect.top,
        Math.exp(-delta * 0.0015),
    );
};

const startCanvasPan = (event: PointerEvent): void => {
    if (event.button !== 0 && event.button !== 1) return;
    if (event.button === 0 && canvasScale.value <= 1.001) return;

    const viewport = canvasViewportRef.value;
    if (!viewport) return;
    event.preventDefault();
    viewport.setPointerCapture(event.pointerId);
    panState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: canvasPanX.value,
        originY: canvasPanY.value,
    };
    isCanvasPanning.value = true;
};

const moveCanvasPan = (event: PointerEvent): void => {
    if (!panState || event.pointerId !== panState.pointerId) return;
    canvasPanX.value = panState.originX + event.clientX - panState.startX;
    canvasPanY.value = panState.originY + event.clientY - panState.startY;
    clampCanvasPan();
};

const endCanvasPan = (event: PointerEvent): void => {
    if (!panState) return;
    const viewport = canvasViewportRef.value;
    if (viewport?.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
    }
    panState = null;
    isCanvasPanning.value = false;
};

const handleWindowResize = (): void => {
    sidebarWidth.value = clampSize('sidebar', sidebarWidth.value);
    controlWidth.value = clampSize('control', controlWidth.value);
    messageHeight.value = clampSize('messages', messageHeight.value);
    clampCanvasPan();
};

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
const UNION_FIND_DEFAULT_SIZE = 10;
const BIT_DEFAULT_SIZE = 8;
let unionFindSize = UNION_FIND_DEFAULT_SIZE;
let bitSize = BIT_DEFAULT_SIZE;
// 排序当前数组（页面层持有，输入框同步显示�?
const sortData = ref<number[]>([]);
// 树插入自动编号（�?开始，切换菜单重置�?
let treeInsertCounter = 1;
// 各图算法当前使用的边集（用户自定义后保留，重新开始不会覆盖）
const graphEdgesByKey = new Map<VisualizerType, number[][]>();

const isGraphAlgorithm = (key: VisualizerType): boolean =>
    key === VisualizerType.DIJKSTRA || key === VisualizerType.FLOYD ||
    key === VisualizerType.PRIM || key === VisualizerType.KRUSKAL;

const isDirectedGraph = (key: VisualizerType): boolean =>
    key === VisualizerType.DIJKSTRA || key === VisualizerType.FLOYD;

const graphEdgesFor = (key: VisualizerType): number[][] =>
    graphEdgesByKey.get(key) ?? getGraphEdges(key) ?? [];

const createGraphDS = (key: VisualizerType): DSInstance => {
    const edges = graphEdgesFor(key);
    graphNodeCnt = edges.reduce((max, edge) => Math.max(max, edge[0] + 1, edge[1] + 1), 0);
    return createGraphStructure(key, edges);
};

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

const validateUnionFindIndex = (raw: string): string | null => {
    const index = Number(raw);
    if (!Number.isInteger(index)) return '节点编号必须为整数';
    if (index < 0 || index >= unionFindSize) {
        return `节点编号需在 0 到 ${unionFindSize - 1} 之间`;
    }
    return null;
};

const validateUnionFindSize = (raw: string): string | null => {
    const n = Number(raw);
    if (!Number.isInteger(n)) return '元素个数必须为整数';
    if (n < 2 || n > 20) return '元素个数需在 2 到 20 之间';
    return null;
};

const validateBitIndex = (raw: string): string | null => {
    const index = Number(raw);
    if (!Number.isInteger(index)) return '下标必须为整数';
    if (index < 1 || index > bitSize) return `下标需在 1 到 ${bitSize} 之间`;
    return null;
};

const validateBitRange = (values: Record<string, string>): string | null => {
    const l = Number(values.l);
    const r = Number(values.r);
    if (!Number.isInteger(l) || !Number.isInteger(r)) return '区间端点必须为整数';
    if (l < 1 || r > bitSize) return `区间需在 1 到 ${bitSize} 之间`;
    if (l > r) return '左端点不能大于右端点';
    return null;
};

const validateBitSize = (raw: string): string | null => {
    const n = Number(raw);
    if (!Number.isInteger(n)) return '元素个数必须为整数';
    if (n < 1 || n > 20) return '元素个数需在 1 到 20 之间';
    return null;
};

// ---------- 随机输入辅助 ----------
const randomInt = (min: number, max: number): number =>
    min + Math.floor(Math.random() * (max - min + 1));

const randomNumberList = (count?: number): string => {
    const n = count ?? randomInt(5, 10);
    return Array.from({ length: n }, () => randomInt(1, 99)).join(',');
};

const randomLowerWord = (minLength = 3, maxLength = 6): string => {
    const n = randomInt(minLength, maxLength);
    let word = '';
    for (let i = 0; i < n; ++i) {
        word += String.fromCharCode(97 + randomInt(0, 25));
    }
    return word;
};

const randomPatternString = (minLength: number, maxLength: number): string => {
    const n = randomInt(minLength, maxLength);
    let text = '';
    const chars = 'abc';
    for (let i = 0; i < n; ++i) {
        text += chars[randomInt(0, chars.length - 1)];
    }
    return text;
};

interface GraphParseResult {
    edges: number[][];
    error: string | null;
}

const parseGraphEdges = (raw: string, undirected: boolean): GraphParseResult => {
    const lines = raw.split(/\r?\n|;/).map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) {
        return { edges: [], error: '请至少输入一条边，每行格式：起点 终点 权值' };
    }

    const edges: number[][] = [];
    const seen = new Set<string>();
    const usedNodes = new Set<number>();
    for (let i = 0; i < lines.length; ++i) {
        const parts = lines[i].split(/[\s,，]+/).filter(Boolean);
        if (parts.length !== 3) {
            return { edges: [], error: `第 ${i + 1} 行格式错误，应为：起点 终点 权值` };
        }
        const [u, v, w] = parts.map(Number);
        if (!Number.isInteger(u) || !Number.isInteger(v) || !Number.isFinite(w)) {
            return { edges: [], error: `第 ${i + 1} 行：节点必须为整数，权值必须为数字` };
        }
        if (u < 0 || v < 0) {
            return { edges: [], error: `第 ${i + 1} 行节点编号不能为负数` };
        }
        if (w < 0) {
            return { edges: [], error: `第 ${i + 1} 行边权不能为负数` };
        }
        if (u === v) {
            return { edges: [], error: `第 ${i + 1} 行不允许自环` };
        }
        const key = undirected
            ? `${Math.min(u, v)},${Math.max(u, v)}`
            : `${u},${v}`;
        if (seen.has(key)) {
            return { edges: [], error: `第 ${i + 1} 行与前文存在重复边` };
        }
        seen.add(key);
        usedNodes.add(u);
        usedNodes.add(v);
        edges.push([u, v, w]);
    }

    const maxNode = Math.max(...usedNodes);
    for (let i = 0; i <= maxNode; ++i) {
        if (!usedNodes.has(i)) {
            return { edges: [], error: `节点编号必须从 0 开始连续，缺少节点 ${i}` };
        }
    }
    return { edges, error: null };
};

const formatGraphEdges = (edges: number[][]): string =>
    edges.map(edge => edge.join(' ')).join('\n');

const randomGraphText = (key: VisualizerType): string => {
    const undirected = !isDirectedGraph(key);
    const n = randomInt(5, 7);
    const edges: number[][] = [];
    const seen = new Set<string>();
    const addEdge = (u: number, v: number, w: number): void => {
        if (u === v) return;
        const edgeKey = undirected
            ? `${Math.min(u, v)},${Math.max(u, v)}`
            : `${u},${v}`;
        if (seen.has(edgeKey)) return;
        seen.add(edgeKey);
        edges.push([u, v, w]);
    };

    // 先生成一棵生成树，保证图连通；再补少量额外的边
    for (let i = 1; i < n; ++i) {
        const parent = randomInt(0, i - 1);
        if (undirected) addEdge(i, parent, randomInt(1, 20));
        else addEdge(parent, i, randomInt(1, 20));
    }
    const extra = randomInt(n - 2, n + 2);
    for (let i = 0; i < extra; ++i) {
        addEdge(randomInt(0, n - 1), randomInt(0, n - 1), randomInt(1, 20));
    }
    return formatGraphEdges(edges);
};

const valParam: ControlInputDef = {
    ...numberParam('val', '数值'),
    random: () => String(randomInt(1, 99)),
};
const idxParam: ControlInputDef = {
    ...numberParam('idx', '索引'),
    random: () => String(randomInt(0, Math.max(0, (currentListSize() ?? 1) - 1))),
};
const optionalIdxParam: ControlInputDef = {
    ...idxParam,
    placeholder: '可留空，默认末尾',
    required: false,
};
const dataParam: ControlInputDef = {
    ...textParam('data', '数组', '如 1,2,3'),
    random: () => randomNumberList(),
};
const targetParam: ControlInputDef = {
    ...numberParam('val', '查找目标'),
    random: () => String(randomInt(1, Math.max(1, bsDataLen))),
};
const sortParam: ControlInputDef = {
    ...textParam('sortInput', '数组', '如 5,3,8,1,9'),
    random: () => randomNumberList(),
};
const kmpStrParam: ControlInputDef = {
    ...textParam('str', '主串', '如 ababcabab'),
    random: () => randomPatternString(8, 12),
};
const kmpTemplateParam: ControlInputDef = {
    ...textParam('template', '模式串', '如 abab'),
    random: () => randomPatternString(2, 4),
};
const segLParam: ControlInputDef = {
    ...numberParam('l', '左端点'),
    random: () => String(randomInt(0, Math.max(0, segDataLen - 1))),
};
const segRParam: ControlInputDef = {
    ...numberParam('r', '右端点'),
    random: () => String(randomInt(0, Math.max(0, segDataLen - 1))),
};
const segValParam: ControlInputDef = {
    ...numberParam('val', '增量'),
    random: () => String(randomInt(1, 20)),
};
const segDataParam: ControlInputDef = {
    ...textParam('data', '初始数组', '如 1,2,3'),
    random: () => randomNumberList(),
};
const unionFindUParam: ControlInputDef = {
    ...numberParam('u', '节点 u'),
    random: () => String(randomInt(0, Math.max(0, unionFindSize - 1))),
};
const unionFindVParam: ControlInputDef = {
    ...numberParam('v', '节点 v'),
    random: () => String(randomInt(0, Math.max(0, unionFindSize - 1))),
};
const unionFindXParam: ControlInputDef = {
    ...numberParam('x', '节点 x'),
    random: () => String(randomInt(0, Math.max(0, unionFindSize - 1))),
};
const unionFindSizeParam: ControlInputDef = {
    ...numberParam('n', '元素个数'),
    random: () => String(randomInt(6, 12)),
};
const bitIndexParam: ControlInputDef = {
    ...numberParam('idx', '下标'),
    placeholder: '从 1 开始',
    random: () => String(randomInt(1, Math.max(1, bitSize))),
};
const bitValueParam: ControlInputDef = {
    ...numberParam('val', '增量'),
    random: () => String(randomInt(-10, 20)),
};
const bitLeftParam: ControlInputDef = {
    ...numberParam('l', '左端点'),
    random: () => String(randomInt(1, Math.max(1, bitSize))),
};
const bitRightParam: ControlInputDef = {
    ...numberParam('r', '右端点'),
    random: () => String(randomInt(1, Math.max(1, bitSize))),
};
const bitSizeParam: ControlInputDef = {
    ...numberParam('n', '元素个数'),
    random: () => String(randomInt(6, 12)),
};
const wordParam: ControlInputDef = {
    ...textParam('word', '字符串（小写字母）'),
    random: () => randomLowerWord(),
};
const graphEdgesParam: ControlInputDef = {
    key: 'edges',
    label: '图的边（每行：起点 终点 权值）',
    placeholder: '0 1 2\n0 2 5\n1 2 1',
    type: 'textarea',
    random: () => randomGraphText(currentMenu.value),
};

/**
 * 高亮（闪烁）链表中第idx个数据节点，用于“查�?修改”动�?
 * @param idx 数据节点下标
 */
const highlightListIndex = (idx: number): void => {
    const vis = visualizerManager.getCurrentVisualizer();
    if (vis instanceof LinkedListVisualizer) vis.highlightIndex(idx);
};

/**
 * 告诉链式可视化器：下一次新建节点在最终结构中的数据下标。
 * 头插/栈 push 为 0，尾插为当前长度，中间插入为 idx。
 * @param idx 新节点最终的数据下标
 */
const setListInsertHint = (idx: number): void => {
    const vis = visualizerManager.getCurrentVisualizer();
    if (vis instanceof LinkedListVisualizer) vis.setPendingInsertIndex(idx);
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
            currentResult.value = null;
            try {
                await op();
            } catch (error) {
                currentOp.value = '';
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
    // 单步执行使用正常动画速度，并等待动画屏障
    stepController.setTimeInterval(PLAY_TIME_INTERVAL);
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
                label: '栈',
                children: [
                    menuItem(VisualizerType.ARRAY_STACK),
                    menuItem(VisualizerType.LINKED_STACK),
                ],
            },
            {
                label: '队列',
                children: [
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
                    menuItem(VisualizerType.TREAP),
                    menuItem(VisualizerType.SCAPEGOAT),
                    menuItem(VisualizerType.SEGMENT_TREE),
                    menuItem(VisualizerType.TRIE),
                ],
            },
            {
                label: '其他',
                children: [
                    menuItem(VisualizerType.UNION_FIND),
                    menuItem(VisualizerType.BINARY_INDEXED_TREE),
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
    currentDS = isGraphAlgorithm(key) ? createGraphDS(key) : createStructure(key);

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
        case VisualizerType.UNION_FIND:
            unionFindSize = UNION_FIND_DEFAULT_SIZE;
            break;
        case VisualizerType.BINARY_INDEXED_TREE:
            bitSize = BIT_DEFAULT_SIZE;
            break;
        case VisualizerType.DIJKSTRA:
        case VisualizerType.FLOYD:
        case VisualizerType.PRIM:
        case VisualizerType.KRUSKAL:
            // graphNodeCnt 已由 createGraphDS 按当前边集更新
            break;
        case VisualizerType.BUBBLE_SORT:
        case VisualizerType.INSERTION_SORT:
        case VisualizerType.MERGE_SORT:
        case VisualizerType.QUICK_SORT: {
            const vis = visualizerManager.getCurrentVisualizer();
            if (vis instanceof SortVisualizer && sortData.value.length > 0) {
                vis.preview([...sortData.value]);
            }
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
        case VisualizerType.UNION_FIND:
            stats.value.size = unionFindSize;
            break;
        case VisualizerType.BINARY_INDEXED_TREE:
            stats.value.size = bitSize;
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
    currentOp.value = '';
    currentResult.value = null;
    clearMessages();
    DataNode.restart();
    visualizerManager.switchVisualizer(key);
    resetCanvasView();
    createDS(key);
    updateStats();
    addMessage(`已切换到「${menuTitle(key)}」`, MessageType.INFO);
};

// ---------- 菜单类型判断 ----------
const isTreeDS = computed(() =>
    currentMenu.value === VisualizerType.BST ||
    currentMenu.value === VisualizerType.AVL ||
    currentMenu.value === VisualizerType.RED_BLACK ||
    currentMenu.value === VisualizerType.TREAP ||
    currentMenu.value === VisualizerType.SCAPEGOAT);
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
                await (ds as BinarySearchTree | AVLTree | RedBlackTree | TreapTree | ScapegoatTree).insert(insertVal);
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
            setListInsertHint(idx);
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
                await (ds as BinarySearchTree | AVLTree | RedBlackTree | TreapTree | ScapegoatTree).delete(delVal);
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
                currentResult.value = String(result);
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
                const ok = await (ds as BinarySearchTree | AVLTree | RedBlackTree | TreapTree | ScapegoatTree).contains(getVal);
                currentResult.value = String(ok);
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
                currentResult.value = val === null ? 'null' : String(val);
                highlightListIndex(idx);
                if (val === null) {
                    addMessage(`索引 ${idx} 处不存在元素`, MessageType.WARNING);
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
            currentResult.value = val === null || val === undefined ? 'null' : String(val);
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
        setListInsertHint(0);
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
            currentResult.value = v === null ? 'null' : String(v);
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
        setListInsertHint((ds as ArrayQueue | LinkedQueue).size());
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
            currentResult.value = v === null ? 'null' : String(v);
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
        setListInsertHint(0);
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
        setListInsertHint((ds as ArrayDeque | LinkedDeque).size());
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
            currentResult.value = v === null ? 'null' : String(v);
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
            currentResult.value = v === null ? 'null' : String(v);
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
            currentResult.value = String(res);
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

// ---------- 并查集 ----------
const handleUnionFindUnion = (values: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const u = Number(values.u ?? 0);
    const v = Number(values.v ?? 0);
    runOp(async () => {
        currentOp.value = OP.UNION_FIND_UNION;
        addMessage(`合并节点 ${u} 与节点 ${v} 所在的集合`, MessageType.INFO);
        try {
            await (ds as UnionFindSet).union(u, v);
        } catch (error) {
            addOperationError('合并集合', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

const handleUnionFindFind = (values: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const x = Number(values.x ?? 0);
    runOp(async () => {
        currentOp.value = OP.UNION_FIND_FIND;
        addMessage(`查找节点 ${x} 所在集合的根节点`, MessageType.INFO);
        try {
            const root = await (ds as UnionFindSet).find(x);
            currentResult.value = root === null ? 'null' : String(root);
        } catch (error) {
            addOperationError('查找根节点', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

const handleUnionFindSize = (values: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const x = Number(values.x ?? 0);
    runOp(async () => {
        currentOp.value = OP.UNION_FIND_SIZE;
        addMessage(`查询节点 ${x} 所在集合的大小`, MessageType.INFO);
        try {
            const size = await (ds as UnionFindSet).getSize(x);
            currentResult.value = String(size);
        } catch (error) {
            addOperationError('查询集合大小', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

const handleUnionFindSame = (values: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const u = Number(values.u ?? 0);
    const v = Number(values.v ?? 0);
    runOp(async () => {
        currentOp.value = OP.UNION_FIND_SAME;
        addMessage(`判断节点 ${u} 与节点 ${v} 是否属于同一集合`, MessageType.INFO);
        try {
            const same = await (ds as UnionFindSet).inSameSet(u, v);
            currentResult.value = String(same);
        } catch (error) {
            addOperationError('判断是否同集合', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

const handleUnionFindReset = (): void => {
    runOp(async () => {
        currentOp.value = OP.RESTART;
        unionFindSize = UNION_FIND_DEFAULT_SIZE;
        DataNode.restart();
        visualizerManager.switchVisualizer(VisualizerType.UNION_FIND);
        currentDS = create(UnionFindSet, unionFindSize);
        updateStats();
        addMessage('已重新开始', MessageType.SUCCESS);
    });
};

const handleUnionFindSetSize = (values: Record<string, string>): void => {
    const n = Number(values.n);
    runOp(async () => {
        currentOp.value = '设置规模';
        unionFindSize = n;
        DataNode.restart();
        visualizerManager.switchVisualizer(VisualizerType.UNION_FIND);
        currentDS = create(UnionFindSet, unionFindSize);
        updateStats();
        addMessage(`已初始化 ${n} 个独立元素`, MessageType.SUCCESS);
    });
};

// ---------- 树状数组 ----------
const handleBitAdd = (values: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const idx = Number(values.idx ?? 0);
    const val = Number(values.val ?? 0);
    runOp(async () => {
        currentOp.value = OP.BIT_ADD;
        addMessage(`将 arr[${idx}] 增加 ${val}`, MessageType.INFO);
        try {
            await (ds as BinaryIndexedTree).add(idx, val);
        } catch (error) {
            addOperationError('单点加', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

const handleBitQuery = (values: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const l = Number(values.l ?? 0);
    const r = Number(values.r ?? 0);
    runOp(async () => {
        currentOp.value = OP.BIT_QUERY;
        addMessage(`查询区间 [${l}, ${r}] 的元素和`, MessageType.INFO);
        try {
            const sum = await (ds as BinaryIndexedTree).query(l, r);
            currentResult.value = sum === null ? 'null' : String(sum);
        } catch (error) {
            addOperationError('区间求和', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

const handleBitReset = (): void => {
    runOp(async () => {
        currentOp.value = OP.RESTART;
        bitSize = BIT_DEFAULT_SIZE;
        DataNode.restart();
        visualizerManager.switchVisualizer(VisualizerType.BINARY_INDEXED_TREE);
        currentDS = create(BinaryIndexedTree, bitSize);
        updateStats();
        addMessage('已重新开始', MessageType.SUCCESS);
    });
};

const handleBitSetSize = (values: Record<string, string>): void => {
    const n = Number(values.n);
    runOp(async () => {
        currentOp.value = '设置规模';
        bitSize = n;
        DataNode.restart();
        visualizerManager.switchVisualizer(VisualizerType.BINARY_INDEXED_TREE);
        currentDS = create(BinaryIndexedTree, bitSize);
        updateStats();
        addMessage(`已初始化长度为 ${n} 的树状数组`, MessageType.SUCCESS);
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
            currentResult.value = String(cnt);
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
            currentResult.value = String(cnt);
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
const handleGraphSet = (v: Record<string, string>): void => {
    const key = currentMenu.value;
    if (!isGraphAlgorithm(key)) return;
    const result = parseGraphEdges(v.edges ?? '', !isDirectedGraph(key));
    if (result.error) {
        addMessage(result.error, MessageType.WARNING);
        return;
    }

    runOp(async () => {
        currentOp.value = '设置图';
        graphEdgesByKey.set(key, result.edges);
        DataNode.restart();
        visualizerManager.switchVisualizer(key);
        resetCanvasView();
        currentDS = createGraphDS(key);
        updateStats();
        addMessage(
            `已设置自定义图：${graphNodeCnt} 个节点，${result.edges.length} 条边`,
            MessageType.SUCCESS,
        );
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
        resetCanvasView();
        updateStats();
        addMessage('已重新开始', MessageType.SUCCESS);
    });
};

// ---------- 排序 ----------
const handleSortSet = (v: Record<string, string>): void => {
    const data = parseNumberList(v.sortInput ?? '');
    if (data === null) {
        addMessage('请输入有效数组（逗号分隔的数字）', MessageType.WARNING);
        return;
    }

    const key = currentMenu.value;
    runOp(async () => {
        currentOp.value = '设置数组';
        sortData.value = [...data];
        DataNode.restart();
        visualizerManager.switchVisualizer(key);
        resetCanvasView();
        currentDS = createStructure(key);
        const vis = visualizerManager.getCurrentVisualizer();
        if (vis instanceof SortVisualizer) vis.preview([...data]);
        updateStats();
        addMessage(`数组已设置为：[${data.join(', ')}]`, MessageType.SUCCESS);
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

const handleSortRun = (): void => {
    const data = [...sortData.value];
    if (data.length === 0) {
        addMessage('请先设置数组', MessageType.WARNING);
        return;
    }

    const key = currentMenu.value;
    runOp(async () => {
        currentOp.value = OP.SORT_RUN;
        sortData.value = [...data];
        DataNode.restart();
        visualizerManager.switchVisualizer(key);
        resetCanvasView();
        currentDS = createStructure(key);
        addMessage(`开始对 [${data.join(', ')}] 排序`, MessageType.INFO);
        try {
            const ds = currentDS;
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
        resetCanvasView();
        updateStats();
        addMessage('已重新开始', MessageType.SUCCESS);
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
            currentResult.value = pos === null || pos === undefined ? 'null' : String(pos);
        } catch (error) {
            addOperationError('KMP匹配', error);
        }
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
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
                BinarySearchTree | AVLTree | RedBlackTree | TreapTree | ScapegoatTree | Trie | ArrayStack | LinkedStack |
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
        currentOp.value = '设置数组';
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
                hint: '查找使用升序数组；设置数组会按升序重建',
                inputs: [],
                buttons: [
                    { label: '查找数据', icon: 'search', params: [targetParam], onClick: handleGet },
                    {
                        label: '设置数组',
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
        case VisualizerType.UNION_FIND:
            return [{
                hint: '树中显示 father 指针方向，根节点显示集合大小；father 与 sz 数组同步更新',
                inputs: [],
                buttons: [
                    {
                        label: '合并集合',
                        icon: 'plus',
                        params: [unionFindUParam, unionFindVParam],
                        validate: (v) => validateUnionFindIndex(v.u ?? '') ?? validateUnionFindIndex(v.v ?? ''),
                        onClick: handleUnionFindUnion,
                    },
                    {
                        label: '查找根节点',
                        icon: 'search',
                        params: [unionFindXParam],
                        validate: (v) => validateUnionFindIndex(v.x ?? ''),
                        onClick: handleUnionFindFind,
                    },
                    {
                        label: '集合大小',
                        icon: 'sum',
                        params: [unionFindXParam],
                        validate: (v) => validateUnionFindIndex(v.x ?? ''),
                        onClick: handleUnionFindSize,
                    },
                    {
                        label: '是否同集合',
                        icon: 'eye',
                        params: [unionFindUParam, unionFindVParam],
                        validate: (v) => validateUnionFindIndex(v.u ?? '') ?? validateUnionFindIndex(v.v ?? ''),
                        onClick: handleUnionFindSame,
                    },
                    {
                        label: '设置规模',
                        icon: 'settings',
                        params: [unionFindSizeParam],
                        validate: (v) => validateUnionFindSize(v.n ?? ''),
                        onClick: handleUnionFindSetSize,
                    },
                    { label: '重新开始', icon: 'rotate', onClick: handleUnionFindReset },
                ],
            }];
        case VisualizerType.BINARY_INDEXED_TREE:
            return [{
                hint: '下标从 1 开始，0 号位不使用；覆盖条表示 tree[i] 负责的区间，绿色为累加、红色为减去',
                inputs: [],
                buttons: [
                    {
                        label: '单点加',
                        icon: 'plus',
                        params: [bitIndexParam, bitValueParam],
                        validate: (v) => validateBitIndex(v.idx ?? ''),
                        onClick: handleBitAdd,
                    },
                    {
                        label: '区间求和',
                        icon: 'sum',
                        params: [bitLeftParam, bitRightParam],
                        validate: validateBitRange,
                        onClick: handleBitQuery,
                    },
                    {
                        label: '设置规模',
                        icon: 'settings',
                        params: [bitSizeParam],
                        validate: (v) => validateBitSize(v.n ?? ''),
                        onClick: handleBitSetSize,
                    },
                    { label: '重新开始', icon: 'rotate', onClick: handleBitReset },
                ],
            }];
        case VisualizerType.DIJKSTRA:
        case VisualizerType.FLOYD:
        case VisualizerType.PRIM:
        case VisualizerType.KRUSKAL:
            return [{
                hint: `${isDirectedGraph(currentMenu.value) ? '有向图' : '无向图'}：每行“起点 终点 权值”，节点从 0 开始连续编号；设置后“重新开始”仍会保留该图`,
                inputs: [],
                buttons: [
                    {
                        label: '设置图',
                        icon: 'settings',
                        params: [graphEdgesParam],
                        getInitial: () => ({
                            edges: formatGraphEdges(graphEdgesFor(currentMenu.value)),
                        }),
                        validate: (values) => parseGraphEdges(
                            values.edges ?? '',
                            !isDirectedGraph(currentMenu.value),
                        ).error,
                        onClick: handleGraphSet,
                    },
                    { label: '开始执行', icon: 'play', onClick: handleGraphRun },
                    { label: '重新开始', icon: 'rotate', onClick: handleGraphReset },
                ],
            }];
        case VisualizerType.BUBBLE_SORT:
        case VisualizerType.INSERTION_SORT:
        case VisualizerType.MERGE_SORT:
        case VisualizerType.QUICK_SORT:
            return [{
                hint: '先设置数组再开始排序，输入框中可点击“随机”生成一组数据',
                inputs: [],
                buttons: [
                    {
                        label: '设置数组',
                        icon: 'settings',
                        params: [sortParam],
                        getInitial: () => ({ sortInput: sortData.value.join(',') }),
                        validate: (v) => validateNumberList(v.sortInput ?? ''),
                        onClick: handleSortSet,
                    },
                    {
                        label: '开始排序',
                        icon: 'play',
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
                        label: '开始匹配',
                        icon: 'search',
                        params: [kmpStrParam, kmpTemplateParam],
                        onClick: handleKMPSearch,
                    },
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

    // StepController 在放行下一步前等待可视化层动画队列空闲
    stepController.setAnimationBarrier({
        waitForIdle: () => visualizerManager.waitForAnimations(),
    });

    canvasViewportRef.value?.addEventListener('wheel', handleCanvasWheel, { passive: false });
    window.addEventListener('resize', handleWindowResize);
    handleWindowResize();

    // 二分查找：由可视化器在指针变化时回调，避免轮�?
    visualizerManager.setBinarySearchPointerListener((left, right, mid) => {
        bsVars.value.left = left;
        bsVars.value.right = right;
        bsVars.value.mid = mid;
    });

    await selectMenu(VisualizerType.ARRAY_LIST);
});

onBeforeUnmount(() => {
    canvasViewportRef.value?.removeEventListener('wheel', handleCanvasWheel);
    window.removeEventListener('resize', handleWindowResize);
    visualizerManager.setBinarySearchPointerListener(null);
    stepController.setAnimationBarrier(null);
});
</script>

<template>
    <div ref="appRef" class="app-container">
        <!-- 左侧：树状菜�?-->
        <MenuSidebar
            class="sidebar"
            :style="sidebarStyle"
            :nodes="menuTree"
            :current-key="currentMenu"
            @select="selectMenu"
        />
        <div
            class="splitter splitter-v"
            :class="{ active: resizingTarget === 'sidebar' }"
            role="separator"
            aria-orientation="vertical"
            title="拖拽调整菜单宽度"
            @pointerdown="beginResize('sidebar', $event)"
            @pointermove="moveResize"
            @pointerup="endResize"
            @pointercancel="endResize"
        ></div>

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
                    :result="currentResult"
                    :running="opRunning"
                />
                <StepControls
                    v-if="opRunning"
                    @play="handlePlay"
                    @fast="handleFast"
                    @pause="handlePause"
                    @step="handleStep"
                />
                <div
                    ref="canvasViewportRef"
                    class="canvas-viewport"
                    :class="{ 'can-pan': canvasScale > 1.001, 'is-panning': isCanvasPanning }"
                    title="Ctrl + 滚轮缩放；放大后可拖拽平移；双击复位"
                    @pointerdown="startCanvasPan"
                    @pointermove="moveCanvasPan"
                    @pointerup="endCanvasPan"
                    @pointercancel="endCanvasPan"
                    @dblclick="resetCanvasView"
                >
                    <svg ref="svgRef" class="canvas-svg" :style="{ transform: canvasTransform }"></svg>
                </div>
                <button
                    class="canvas-zoom"
                    type="button"
                    title="点击复位画布缩放"
                    @click="resetCanvasView"
                >
                    {{ canvasZoomLabel }}
                </button>
            </div>
            <div
                class="splitter splitter-h"
                :class="{ active: resizingTarget === 'messages' }"
                role="separator"
                aria-orientation="horizontal"
                title="拖拽调整提示信息高度"
                @pointerdown="beginResize('messages', $event)"
                @pointermove="moveResize"
                @pointerup="endResize"
                @pointercancel="endResize"
            ></div>
            <MessagePanel :style="messageStyle" :messages="messages" @clear="clearMessages" />
        </main>
        <div
            class="splitter splitter-v"
            :class="{ active: resizingTarget === 'control' }"
            role="separator"
            aria-orientation="vertical"
            title="拖拽调整操作台宽度"
            @pointerdown="beginResize('control', $event)"
            @pointermove="moveResize"
            @pointerup="endResize"
            @pointercancel="endResize"
        ></div>

        <!-- 右侧：操作台 -->
        <ControlPanel :style="controlStyle" :groups="controlGroups" :current-menu="currentMenu" />
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
    font-family: 'Times New Roman', SimHei, '黑体', 'Microsoft YaHei', sans-serif;
}

button,
input,
textarea,
select {
    font-family: inherit;
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
    min-width: 0;
    height: 100%;
    overflow-y: auto;
    background: #f7f9fc;
    padding: 12px 0;
}
.splitter {
    position: relative;
    z-index: 10;
    flex: 0 0 5px;
    background: transparent;
    touch-action: none;
}
.splitter-v {
    cursor: col-resize;
}
.splitter-h {
    cursor: row-resize;
}
.splitter::after {
    content: '';
    position: absolute;
    background: #e0e4ea;
    transition: background 0.15s;
}
.splitter-v::after {
    top: 0;
    bottom: 0;
    left: 2px;
    width: 1px;
}
.splitter-h::after {
    left: 0;
    right: 0;
    top: 2px;
    height: 1px;
}
.splitter:hover::after,
.splitter.active::after {
    background: #2b6cb0;
}
.main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.top-header {
    padding: 12px 18px;
    border-bottom: 1px solid #eee;
    background: #fff;
    text-align: center;
}
.page-title {
    font-size: 24px;
    font-weight: 700;
    color: #000;
}
.canvas-container {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    background: #fafafa;
}
.canvas-viewport {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #fafafa;
    touch-action: none;
}
.canvas-viewport.can-pan {
    cursor: grab;
}
.canvas-viewport.is-panning {
    cursor: grabbing;
}
.canvas-svg {
    width: 100%;
    height: 100%;
    display: block;
    overflow: visible;
    transform-origin: 0 0;
    will-change: transform;
    user-select: none;
}
.canvas-zoom {
    position: absolute;
    right: 12px;
    bottom: 12px;
    z-index: 3;
    min-width: 54px;
    padding: 5px 8px;
    border: 1px solid #cfd8e3;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.95);
    font-size: 13px;
    color: #4a5568;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
}
.canvas-zoom:hover {
    background: #eaf2fb;
    border-color: #2b6cb0;
    color: #2b5f9e;
}
</style>
