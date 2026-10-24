<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
// 控制�?
import { StepController, StepStatus, PLAY_TIME_INTERVAL, FAST_TIME_INTERVAL } from './controller/StepController';
import { MessageController, MessageType } from './controller/MessageController';
// 核心
import { create } from './node/factory';
import { DataNode } from './node/DataNode';
import { BinaryTreeTraversalNode } from './node/BinaryTreeNode/impl/BinaryTreeTraversalNode';
import { VisualizerManager, VisualizerType } from './visualizer/VisualizerManager';
import { SortVisualizer } from './visualizer/SortVisualizer';
import { LinkedListVisualizer } from './visualizer/LinkedListVisualizer';
import { createGraphStructure, createStructure, getGraphEdges, getStructureTitle, type DSInstance } from './visualizer/registry';
import { structureInfo } from './content/structureInfo';
// 组件
import MenuSidebar, { type MenuNode } from './components/MenuSidebar.vue';
import StatsPanel from './components/StatsPanel.vue';
import StepControls from './components/StepControls.vue';
import MessagePanel, { type UiMessage } from './components/MessagePanel.vue';
import ControlPanel, { type ControlGroupDef, type ControlInputDef } from './components/ControlPanel.vue';
import CommandPanel from './components/CommandPanel.vue';
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
import { BinaryHeap } from './datastructure/Queue/PriorityQueue/BinaryHeap';
import { HashTable } from './datastructure/HashTable/HashTable';
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

/************************************************** */
// 操作名常量（消除魔法字符串）
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
    HEAP_PUSH: '插入数据',
    HEAP_POP: '弹出堆顶',
    HEAP_TOP: '查看堆顶',
    HASH_ADD: '插入键',
    HASH_FIND: '查找键',
    HASH_REMOVE: '删除键',
    DEQUE_FRONT: '头部入队',
    DEQUE_BACK: '尾部入队',
    DEQUE_POP_FRONT: '头部出队',
    DEQUE_POP_BACK: '尾部出队',
    DEQUE_GET_FRONT: '取队首',
    DEQUE_GET_BACK: '取队尾',
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

/************************************************** */
// 单例
const stepController = StepController.getStepController();
const messageController = MessageController.getMessageController();
const visualizerManager = VisualizerManager.getInstance();

/************************************************** */
// 页面状�?
const currentMenu = ref<VisualizerType>(VisualizerType.ARRAY_LIST);
const currentOp = ref<string>(OP.RESTART);
const currentResult = ref<string | null>(null);
const stats = ref({ size: 0 });
const messages = ref<UiMessage[]>([]);
interface CommandLine {
    text: string;
    type: 'input' | 'output' | 'error' | 'info';
}
interface CommandHelp {
    title: string;
    commands: { command: string; description: string }[];
    notes: string[];
}
type LinearList = ArrayList | SinglyLinkedList | CircularLinkedList | DoubleLinkedList;
const commandLines = ref<CommandLine[]>([]);
const pageInfoOpen = ref(false);
const pageInfoBackdropPressed = ref(false);
const bsVars = ref({ left: 0, right: 9, mid: 4, target: 0 });
const svgRef = ref<SVGSVGElement | null>(null);
const appRef = ref<HTMLElement | null>(null);
const canvasViewportRef = ref<HTMLDivElement | null>(null);

/************************************************** */
// 可拖拽面板尺寸
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
const COMMAND_MIN = 100;
const COMMAND_DEFAULT_HEIGHT = 220;

const sidebarWidth = ref(readStoredSize('dsvisualizer.layout.sidebarWidth', 220));
const controlWidth = ref(readStoredSize('dsvisualizer.layout.controlWidth', 240));
const messageHeight = ref(readStoredSize('dsvisualizer.layout.messageHeight', 180));
const commandHeight = ref(readStoredSize('dsvisualizer.layout.commandHeight', COMMAND_DEFAULT_HEIGHT));

/************************************************** */
// 设置弹窗与本地持久化
interface ShortcutSettings {
    step: string;
    playPause: string;
    fast: string;
}

type ShortcutAction = keyof ShortcutSettings;

interface AppSettings {
    playInterval: number;
    shortcuts: ShortcutSettings;
    theme: ThemeMode;
}

type ThemeMode = 'light' | 'dark';

const PLAY_INTERVAL_MIN = 0.1;
const PLAY_INTERVAL_MAX = 10;
const SETTINGS_STORAGE_KEY = 'dsvisualizer.settings';
const LEGACY_PLAY_INTERVAL_KEY = 'dsvisualizer.settings.playInterval';
const DEFAULT_SHORTCUTS: ShortcutSettings = {
    step: 'Enter',
    playPause: 'Space',
    fast: 'Ctrl+Enter',
};

const validPlayInterval = (value: unknown): number | null => {
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(number) && number >= PLAY_INTERVAL_MIN && number <= PLAY_INTERVAL_MAX
        ? number
        : null;
};

const normalizeShortcutString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const parts = value.split('+').map(part => part.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    const modifiers = new Set<string>();
    let key = '';
    for (const part of parts) {
        const lower = part.toLowerCase();
        if (lower === 'ctrl' || lower === 'control') modifiers.add('Ctrl');
        else if (lower === 'alt' || lower === 'option') modifiers.add('Alt');
        else if (lower === 'shift') modifiers.add('Shift');
        else if (lower === 'meta' || lower === 'cmd' || lower === 'command') modifiers.add('Meta');
        else key = part;
    }
    if (key === '') return null;
    const keyMap: Record<string, string> = {
        space: 'Space',
        enter: 'Enter',
        escape: 'Escape',
        esc: 'Escape',
        tab: 'Tab',
        backspace: 'Backspace',
        delete: 'Delete',
        insert: 'Insert',
        home: 'Home',
        end: 'End',
        pageup: 'PageUp',
        pagedown: 'PageDown',
        arrowup: 'ArrowUp',
        arrowdown: 'ArrowDown',
        arrowleft: 'ArrowLeft',
        arrowright: 'ArrowRight',
    };
    const lowerKey = key.toLowerCase();
    const normalizedKey = keyMap[lowerKey] ?? (key.length === 1 ? key.toUpperCase() : key);
    const order = ['Ctrl', 'Alt', 'Shift', 'Meta'];
    return [...order.filter(modifier => modifiers.has(modifier)), normalizedKey].join('+');
};

const readSettings = (): AppSettings => {
    const defaults: AppSettings = {
        playInterval: PLAY_TIME_INTERVAL,
        shortcuts: { ...DEFAULT_SHORTCUTS },
        theme: 'light',
    };
    let data: Record<string, unknown> | null = null;
    let legacyInterval: number | null = null;
    try {
        legacyInterval = validPlayInterval(window.localStorage.getItem(LEGACY_PLAY_INTERVAL_KEY));
        const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw !== null) {
            const parsed = JSON.parse(raw) as unknown;
            if (parsed !== null && typeof parsed === 'object') {
                data = parsed as Record<string, unknown>;
            }
        }
    } catch {
        data = null;
    }
    if (data !== null) {
        const interval = validPlayInterval(data.playInterval) ?? legacyInterval ?? defaults.playInterval;
        const savedShortcuts = data.shortcuts as Record<string, unknown> | undefined;
        const step = normalizeShortcutString(savedShortcuts?.step) ?? defaults.shortcuts.step;
        const playPause = normalizeShortcutString(savedShortcuts?.playPause) ?? defaults.shortcuts.playPause;
        const fast = normalizeShortcutString(savedShortcuts?.fast) ?? defaults.shortcuts.fast;
        const values = [step, playPause, fast];
        return {
            playInterval: interval,
            shortcuts: new Set(values).size === values.length
                ? { step, playPause, fast }
                : { ...DEFAULT_SHORTCUTS },
            theme: data.theme === 'dark' ? 'dark' : 'light',
        };
    }
    if (legacyInterval !== null) {
        defaults.playInterval = legacyInterval;
    }
    return defaults;
};

const savedSettings = readSettings();
const playInterval = ref(savedSettings.playInterval);
const shortcuts = ref<ShortcutSettings>({ ...savedSettings.shortcuts });
const theme = ref<ThemeMode>(savedSettings.theme);
const settingsOpen = ref(false);
const settingsBackdropPressed = ref(false);
const settingsDraft = ref(String(playInterval.value));
const shortcutDrafts = ref<ShortcutSettings>({ ...shortcuts.value });
const themeDraft = ref<ThemeMode>(theme.value);
const settingsError = ref('');

const applyTheme = (mode: ThemeMode): void => {
    document.documentElement.dataset.theme = mode;
};
applyTheme(theme.value);

const shortcutFromEvent = (event: KeyboardEvent): string | null => {
    if (event.key === 'Control' || event.key === 'Shift' ||
        event.key === 'Alt' || event.key === 'Meta' ||
        event.key === 'Tab' || event.key === 'Dead') {
        return null;
    }
    const key = event.key === ' ' ? 'Space'
        : event.key.length === 1 ? event.key.toUpperCase()
            : event.key;
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    parts.push(key);
    return parts.join('+');
};

const captureShortcut = (action: ShortcutAction, event: KeyboardEvent): void => {
    if (event.key === 'Tab' || event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    event.stopPropagation();
    const value = shortcutFromEvent(event);
    if (value !== null) {
        shortcutDrafts.value[action] = value;
        settingsError.value = '';
    }
};

const resetSettingsDrafts = (): void => {
    settingsDraft.value = String(PLAY_TIME_INTERVAL);
    shortcutDrafts.value = { ...DEFAULT_SHORTCUTS };
    themeDraft.value = 'light';
    applyTheme('light');
    settingsError.value = '';
};

const toggleThemeDraft = (): void => {
    themeDraft.value = themeDraft.value === 'dark' ? 'light' : 'dark';
    applyTheme(themeDraft.value);
};

const cancelSettings = (): void => {
    themeDraft.value = theme.value;
    applyTheme(theme.value);
    settingsOpen.value = false;
};

const persistSettings = (): void => {
    const data: AppSettings = {
        playInterval: playInterval.value,
        shortcuts: { ...shortcuts.value },
        theme: theme.value,
    };
    try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
    } catch {
        // 隐私模式等场景下忽略存储失败
    }
};

const openSettings = (): void => {
    settingsDraft.value = String(playInterval.value);
    shortcutDrafts.value = { ...shortcuts.value };
    themeDraft.value = theme.value;
    applyTheme(theme.value);
    settingsError.value = '';
    settingsBackdropPressed.value = false;
    settingsOpen.value = true;
};

const onSettingsPointerDown = (event: PointerEvent): void => {
    settingsBackdropPressed.value = event.target === event.currentTarget;
};

const onSettingsClick = (event: MouseEvent): void => {
    if (settingsBackdropPressed.value && event.target === event.currentTarget) {
        cancelSettings();
    }
    settingsBackdropPressed.value = false;
};

const applySettings = (): void => {
    const value = validPlayInterval(settingsDraft.value);
    if (value === null) {
        settingsError.value = `请输入 ${PLAY_INTERVAL_MIN} 到 ${PLAY_INTERVAL_MAX} 秒之间的数字`;
        return;
    }
    const nextShortcuts = { ...shortcutDrafts.value };
    const values = Object.values(nextShortcuts);
    if (values.some(item => item.trim() === '')) {
        settingsError.value = '快捷键不能为空';
        return;
    }
    if (new Set(values).size !== values.length) {
        settingsError.value = '快捷键不能重复';
        return;
    }
    playInterval.value = Math.round(value * 100) / 100;
    shortcuts.value = nextShortcuts;
    theme.value = themeDraft.value;
    applyTheme(theme.value);
    if (opRunning.value && stepController.isPlaying() && !stepController.isFastMode()) {
        stepController.setTimeInterval(playInterval.value);
    }
    persistSettings();
    settingsOpen.value = false;
};

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
const commandStyle = computed(() => ({
    height: commandHeight.value + 'px',
    flex: `0 0 ${commandHeight.value}px`,
}));

type ResizeTarget = 'sidebar' | 'control' | 'messages' | 'command';

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
    if (target === 'command') {
        return [COMMAND_MIN, Math.max(COMMAND_MIN, height - 160)];
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
                : target === 'command' ? commandHeight.value
                    : messageHeight.value,
    };
    resizingTarget.value = target;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = target === 'messages' || target === 'command'
        ? 'row-resize'
        : 'col-resize';
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
    } else if (state.target === 'command') {
        commandHeight.value = next;
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
    writeStoredSize('dsvisualizer.layout.commandHeight', commandHeight.value);
    resizeState = null;
    resizingTarget.value = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
};

/************************************************** */
// 画布缩放/平移
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
    commandHeight.value = clampSize('command', commandHeight.value);
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
// 二叉树遍历当前的自定义边序列（u1,v1,u2,v2,...），null 表示默认示例树
let traversalEdges: number[] | null = null;
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

const isSortAlgorithm = (key: VisualizerType): boolean =>
    key === VisualizerType.BUBBLE_SORT || key === VisualizerType.INSERTION_SORT ||
    key === VisualizerType.MERGE_SORT || key === VisualizerType.QUICK_SORT;

const isDirectedGraph = (key: VisualizerType): boolean =>
    key === VisualizerType.DIJKSTRA || key === VisualizerType.FLOYD;

const graphEdgesFor = (key: VisualizerType): number[][] =>
    graphEdgesByKey.get(key) ?? getGraphEdges(key) ?? [];

const createGraphDS = (key: VisualizerType): DSInstance => {
    const edges = graphEdgesFor(key);
    graphNodeCnt = edges.reduce((max, edge) => Math.max(max, edge[0] + 1, edge[1] + 1), 0);
    return createGraphStructure(key, edges);
};

/************************************************** */
// 链表等按下标操作时的输入解析
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

/************************************************** */
// 操作参数与校验（对话框提交前执行）
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

const validateHashKey = (raw: string): string | null =>
    Number.isInteger(Number(raw)) ? null : '键必须为整数';

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

const validateKmpMain = (raw: string): string | null => {
    const text = raw.trim();
    if (text === '') return '主串不能为空';
    return /\s/.test(text) ? '主串不能包含空白字符' : null;
};

const validateKmpTemplate = (raw: string): string | null =>
    /\s/.test(raw.trim()) ? '模式串不能包含空白字符' : null;

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

/************************************************** */
// 随机输入辅助
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

    let maxNode = 0;
    usedNodes.forEach(node => {
        if (node > maxNode) maxNode = node;
    });
    if (maxNode >= 200) {
        return { edges: [], error: '节点数量超过上限200' };
    }
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
const traversalEdgesParam: ControlInputDef = {
    key: 'traversalEdges',
    label: '树边（每两个数 u v，v 是 u 的父节点）',
    placeholder: '2 1 3 1 4 2 5 2',
    type: 'textarea',
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
    required: false,
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

/************************************************** */
// 消息
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

/************************************************** */
// 复合操作串行�?
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

/************************************************** */
// 流程控制
const handlePlay = (): void => {
    if (!opRunning.value) return;
    stepController.setTimeInterval(playInterval.value);
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
    // 单步执行使用播放间隔设置，但当前动作立即放行
    stepController.setTimeInterval(playInterval.value);
    stepController.setStatus(StepStatus.STEP_EXECUTION);
};

const handleGlobalKeydown = (event: KeyboardEvent): void => {
    if (event.repeat || event.isComposing || event.defaultPrevented || !opRunning.value) return;
    const overCommandPanel = document.querySelector<HTMLElement>('.command-panel')?.matches(':hover') === true;
    const target = event.target;
    if (target instanceof HTMLElement) {
        const commandInput = target.closest<HTMLTextAreaElement>('.command-input');
        if (commandInput !== null && commandInput.value.trim() !== '') return;
        const textEditing = target.closest('input, textarea, select, [contenteditable="true"]');
        if (textEditing !== null && commandInput === null) return;
        const interactive = target.closest('button, [role="button"], [role="separator"]');
        if (interactive !== null && !overCommandPanel) return;
    }
    if (settingsOpen.value || pageInfoOpen.value ||
        document.querySelector('.dialog-overlay, .command-help-overlay') !== null) {
        return;
    }

    const shortcut = shortcutFromEvent(event);
    if (shortcut === null) return;
    if (shortcut === shortcuts.value.step) {
        event.preventDefault();
        handleStep();
    } else if (shortcut === shortcuts.value.playPause) {
        event.preventDefault();
        if (stepController.isPlaying()) handlePause();
        else handlePlay();
    } else if (shortcut === shortcuts.value.fast) {
        event.preventDefault();
        handleFast();
    }
};

/************************************************** */
// 菜单树（三栏布局：左侧树状菜单）
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
                    menuItem(VisualizerType.BINARY_HEAP),
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
                    menuItem(VisualizerType.HASH_TABLE),
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

const currentPageInfo = computed(() => structureInfo[currentMenu.value]);
const hasPageInfo = computed(() =>
    currentPageInfo.value.info.trim() !== '' || currentPageInfo.value.notes.trim() !== '');

const openPageInfo = (): void => {
    if (!hasPageInfo.value) return;
    pageInfoBackdropPressed.value = false;
    pageInfoOpen.value = true;
};

const onPageInfoPointerDown = (event: PointerEvent): void => {
    pageInfoBackdropPressed.value = event.target === event.currentTarget;
};

const onPageInfoClick = (event: MouseEvent): void => {
    if (pageInfoBackdropPressed.value && event.target === event.currentTarget) {
        pageInfoOpen.value = false;
    }
    pageInfoBackdropPressed.value = false;
};

/************************************************** */
// 数据创建（实例来自注册表，这里只维护页面级规模状态）
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
            traversalEdges = null;
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

/************************************************** */
// 统计信息（按菜单类型取数，不读取算法层私有字段）
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

/************************************************** */
// 菜单切换（原设计：强制播完再切换�?
const selectMenu = async (key: VisualizerType): Promise<void> => {
    if (key === currentMenu.value && currentDS !== null) return;
    await forceFinishPending();
    currentMenu.value = key;
    currentOp.value = '';
    currentResult.value = null;
    clearMessages();
    clearCommandLines();
    DataNode.restart();
    visualizerManager.switchVisualizer(key);
    resetCanvasView();
    createDS(key);
    updateStats();
    addMessage(`已切换到「${menuTitle(key)}」`, MessageType.INFO);
};

/************************************************** */
// 菜单类型判断
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
const isLinearListDS = computed(() =>
    currentMenu.value === VisualizerType.ARRAY_LIST || isLinkedListDS.value);
const isStackDS = computed(() =>
    currentMenu.value === VisualizerType.ARRAY_STACK ||
    currentMenu.value === VisualizerType.LINKED_STACK);
const isQueueDS = computed(() =>
    currentMenu.value === VisualizerType.ARRAY_QUEUE ||
    currentMenu.value === VisualizerType.LINKED_QUEUE);
const isDequeDS = computed(() =>
    currentMenu.value === VisualizerType.ARRAY_DEQUE ||
    currentMenu.value === VisualizerType.LINKED_DEQUE);
const isBinaryHeapDS = computed(() => currentMenu.value === VisualizerType.BINARY_HEAP);
const isHashDS = computed(() => currentMenu.value === VisualizerType.HASH_TABLE);
const isSegmentTreeDS = computed(() => currentMenu.value === VisualizerType.SEGMENT_TREE);
const isTrieDS = computed(() => currentMenu.value === VisualizerType.TRIE);
const isUnionFindDS = computed(() => currentMenu.value === VisualizerType.UNION_FIND);
const isBitDS = computed(() => currentMenu.value === VisualizerType.BINARY_INDEXED_TREE);
const isLinearListInstance = (ds: DSInstance | null): ds is LinearList =>
    ds instanceof ArrayList || ds instanceof SinglyLinkedList ||
    ds instanceof CircularLinkedList || ds instanceof DoubleLinkedList;
const isStackInstance = (ds: DSInstance | null): ds is ArrayStack | LinkedStack =>
    ds instanceof ArrayStack || ds instanceof LinkedStack;
const isQueueInstance = (ds: DSInstance | null): ds is ArrayQueue | LinkedQueue =>
    ds instanceof ArrayQueue || ds instanceof LinkedQueue;
const isDequeInstance = (ds: DSInstance | null): ds is ArrayDeque | LinkedDeque =>
    ds instanceof ArrayDeque || ds instanceof LinkedDeque;
const isBinaryHeapInstance = (ds: DSInstance | null): ds is BinaryHeap =>
    ds instanceof BinaryHeap;
const isHashTableInstance = (ds: DSInstance | null): ds is HashTable =>
    ds instanceof HashTable;
const isSegmentTreeInstance = (ds: DSInstance | null): ds is SegmentTree =>
    ds instanceof SegmentTree;
const isTrieInstance = (ds: DSInstance | null): ds is Trie =>
    ds instanceof Trie;
const isUnionFindInstance = (ds: DSInstance | null): ds is UnionFindSet =>
    ds instanceof UnionFindSet;
const isBitInstance = (ds: DSInstance | null): ds is BinaryIndexedTree =>
    ds instanceof BinaryIndexedTree;
type BSTFamily = BinarySearchTree | AVLTree | RedBlackTree | TreapTree | ScapegoatTree;
const isBSTFamilyInstance = (ds: DSInstance | null): ds is BSTFamily =>
    ds instanceof BinarySearchTree || ds instanceof AVLTree ||
    ds instanceof RedBlackTree || ds instanceof TreapTree || ds instanceof ScapegoatTree;

/************************************************** */
// 数据操作（统一模板：runOp 串行�?+ 快进排队�?
const handleInsert = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const insertVal = Number(v.val ?? 0);
    const insertIdx = Number(v.idx ?? 0);

    if (isTreeDS.value) {
        handleCommand(`insert ${insertVal}`);
        return;
    }
    if (isLinkedListDS.value) {
        const list = ds as SinglyLinkedList | CircularLinkedList | DoubleLinkedList;
        const rawIdx = (v.idx ?? '').trim();
        const idx = parseIndex(v.idx, list.size());
        handleCommand(rawIdx === '' ? `insert ${insertVal}` : `insert ${idx} ${insertVal}`);
        return;
    }
    handleCommand(`insert ${insertIdx} ${insertVal}`);
};

const handleDelete = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const delVal = Number(v.val ?? 0);
    const delIdx = Number(v.idx ?? 0);

    if (isTreeDS.value) {
        handleCommand(`delete ${delVal}`);
        return;
    }
    if (isLinkedListDS.value) {
        const idx = parseIndex(v.idx, 0);
        handleCommand(`erase ${idx}`);
        return;
    }
    handleCommand(`erase ${delIdx}`);
};

const handleGet = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const getVal = Number(v.val ?? 0);
    const getIdx = Number(v.idx ?? 0);

    // 二分查找
    if (currentMenu.value === VisualizerType.BINARY_SEARCH) {
        handleCommand(`find ${getVal}`);
        return;
    }
    // 树：查找节点是否存在
    if (isTreeDS.value) {
        handleCommand(`contains ${getVal}`);
        return;
    }
    // 链表：按下标取值（并高亮该节点�?
    if (isLinkedListDS.value) {
        const idx = parseIndex(v.idx, 0);
        handleCommand(`at ${idx}`);
        return;
    }
    handleCommand(`at ${getIdx}`);
};

const handleSet = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    const setIdx = Number(v.idx ?? 0);
    const setVal = Number(v.val ?? 0);

    // 链表：按下标修改（并高亮该节点）
    if (isLinkedListDS.value) {
        const idx = parseIndex(v.idx, 0);
        handleCommand(`update ${idx} ${setVal}`);
        return;
    }
    handleCommand(`update ${setIdx} ${setVal}`);
};

/************************************************** */
// 命令行
const commandNotes = [
    'Enter 执行，Shift+Enter 换行。',
    '可以一次粘贴多行命令，将按从上到下的顺序逐条执行。',
    '批次执行期间：点击快进会快速执行完整个批次；点击播放会持续播放到批次结束。',
    '操作台按钮执行的操作也会写入命令历史。',
];

const commandHelp = computed<CommandHelp>(() => {
    if (isLinearListDS.value) {
        return {
            title: menuTitle(currentMenu.value) + '命令（索引从 0 开始）',
            commands: [
                { command: 'insert <值>', description: '在末尾插入' },
                { command: 'insert <索引> <值>', description: '在指定索引插入' },
                { command: 'at <索引>', description: '查询索引处的值' },
                { command: 'update <索引> <值>', description: '修改指定索引的值' },
                { command: 'erase <索引>', description: '删除指定索引的元素' },
                { command: 'clear', description: '清空线性表' },
            ],
            notes: commandNotes,
        };
    }
    if (isStackDS.value) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                { command: 'push <值>', description: '入栈' },
                { command: 'pop', description: '出栈' },
                { command: 'top', description: '查看栈顶' },
                { command: 'clear', description: '清空栈' },
            ],
            notes: commandNotes,
        };
    }
    if (isQueueDS.value) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                { command: 'push <值>', description: '入队' },
                { command: 'pop', description: '出队' },
                { command: 'top', description: '查看队首' },
                { command: 'clear', description: '清空队列' },
            ],
            notes: commandNotes,
        };
    }
    if (isDequeDS.value) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                { command: 'pushFront <值>', description: '头部入队' },
                { command: 'pushBack <值>', description: '尾部入队' },
                { command: 'popFront', description: '头部出队' },
                { command: 'popBack', description: '尾部出队' },
                { command: 'getFront', description: '取队首' },
                { command: 'getBack', description: '取队尾' },
                { command: 'clear', description: '清空队列' },
            ],
            notes: commandNotes,
        };
    }
    if (isTreeDS.value) {
        const commands: CommandHelp['commands'] = [
            { command: 'insert <值>', description: '插入节点' },
            { command: 'delete <值>', description: '删除节点' },
            { command: 'contains <值>', description: '查找值是否存在' },
            { command: 'size', description: '查询节点数量' },
            { command: 'isEmpty', description: '判断树是否为空' },
            { command: 'clear', description: '清空树' },
        ];
        if (currentMenu.value === VisualizerType.SCAPEGOAT) {
            commands.push(
                { command: 'small <值>', description: '统计小于该值的节点数' },
                { command: 'rank <值>', description: '查询值的排名（从 1 开始）' },
                { command: 'index <k>', description: '查询第 k 小的值（从 1 开始）' },
                { command: 'predecessor <值>', description: '查询前驱' },
                { command: 'successor <值>', description: '查询后继' },
            );
        }
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands,
            notes: commandNotes,
        };
    }
    if (isBinaryHeapDS.value) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                { command: 'push <值>', description: '插入元素' },
                { command: 'pop', description: '弹出堆顶' },
                { command: 'top', description: '查看堆顶' },
                { command: 'size', description: '查询元素个数' },
                { command: 'isEmpty', description: '判断堆是否为空' },
                { command: 'clear', description: '清空堆' },
            ],
            notes: commandNotes,
        };
    }
    if (isHashDS.value) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                { command: 'add <键>', description: '插入整数键' },
                { command: 'contains <键>', description: '查找键是否存在' },
                { command: 'remove <键>', description: '删除键' },
                { command: 'size', description: '查询键数量' },
                { command: 'isEmpty', description: '判断哈希表是否为空' },
                { command: 'clear', description: '清空哈希表' },
            ],
            notes: commandNotes,
        };
    }
    if (isSegmentTreeDS.value) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                { command: 'add <l> <r> <增量>', description: '区间加' },
                { command: 'query <l> <r>', description: '区间求和' },
                { command: 'getSize', description: '查询元素个数' },
                { command: 'init <v1> <v2> ...', description: '用数组重建线段树' },
                { command: 'reset', description: '恢复默认数组' },
            ],
            notes: [...commandNotes, '下标从 0 开始，区间为双闭区间。', 'init/reset 为页面层重建命令。'],
        };
    }
    if (isTrieDS.value) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                { command: 'insert <单词>', description: '插入字符串' },
                { command: 'find <单词>', description: '查询字符串出现次数' },
                { command: 'prefix <前缀>', description: '查询前缀数量' },
                { command: 'delete <单词>', description: '删除字符串' },
                { command: 'size', description: '查询字符串总数' },
                { command: 'isEmpty', description: '判断 Trie 是否为空' },
                { command: 'clear', description: '清空 Trie' },
            ],
            notes: [...commandNotes, '单词仅允许小写字母 a-z。'],
        };
    }
    if (isUnionFindDS.value) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                { command: 'union <u> <v>', description: '合并集合' },
                { command: 'find <x>', description: '查找根节点' },
                { command: 'getSize <x>', description: '查询集合大小' },
                { command: 'inSameSet <u> <v>', description: '判断是否同集合' },
                { command: 'init <n>', description: '初始化 n 个独立元素' },
                { command: 'reset', description: '恢复默认规模' },
            ],
            notes: [...commandNotes, '节点编号从 0 开始。', 'init/reset 为页面层重建命令。'],
        };
    }
    if (isBitDS.value) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                { command: 'add <idx> <增量>', description: '单点加' },
                { command: 'query <l> <r>', description: '区间求和' },
                { command: 'init <n> [初始值]', description: '初始化树状数组' },
                { command: 'reset', description: '恢复默认规模' },
            ],
            notes: [...commandNotes, '下标从 1 开始，区间为双闭区间。', 'init/reset 为页面层重建命令。'],
        };
    }
    if (currentMenu.value === VisualizerType.BINARY_SEARCH) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                { command: 'find <目标值>', description: '执行二分查找' },
                { command: 'setData <值1> <值2> ...', description: '设置数组（自动升序）' },
            ],
            notes: [...commandNotes, '查找使用升序数组。'],
        };
    }
    if (currentMenu.value === VisualizerType.BINARY_TREE_TRAVERSAL) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                { command: 'preOrderTraversal', description: '前序遍历' },
                { command: 'inOrderTraversal', description: '中序遍历' },
                { command: 'postOrderTraversal', description: '后序遍历' },
                { command: 'setData <u1> <v1> <u2> <v2> ...', description: '设置树边' },
                { command: 'reset', description: '重新开始当前树' },
            ],
            notes: [...commandNotes, '每两个数 u v 表示 v 是 u 的父节点；第一个孩子为左孩子，第二个为右孩子。'],
        };
    }
    if (isGraphAlgorithm(currentMenu.value)) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                {
                    command: currentMenu.value === VisualizerType.DIJKSTRA
                        ? 'execute [起点]'
                        : 'execute',
                    description: '执行算法',
                },
                { command: 'setData <u1> <v1> <w1> ...', description: '设置图（起点 终点 权值）' },
                { command: 'reset', description: '重新开始' },
            ],
            notes: [...commandNotes, '节点从 0 开始连续编号；setData/reset 为页面层操作。'],
        };
    }
    if (isSortAlgorithm(currentMenu.value)) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                { command: 'setData <值1> <值2> ...', description: '设置排序数组' },
                { command: 'sort', description: '开始排序' },
                { command: 'reset', description: '重新开始' },
            ],
            notes: commandNotes,
        };
    }
    if (currentMenu.value === VisualizerType.KMP) {
        return {
            title: menuTitle(currentMenu.value) + '命令',
            commands: [
                { command: 'setData <主串> [模式串]', description: '设置主串和模式串' },
                { command: 'search', description: '执行 KMP 匹配' },
                { command: 'getNext', description: '计算 next 数组' },
                { command: 'reset', description: '恢复默认字符串' },
            ],
            notes: commandNotes,
        };
    }
    return {
        title: '命令行',
        commands: [],
        notes: ['当前数据结构暂未实现命令行命令。'],
    };
});

const pushCommandLine = (text: string, type: CommandLine['type']): CommandLine => {
    const line: CommandLine = { text, type };
    commandLines.value.push(line);
    if (commandLines.value.length > 200) {
        commandLines.value.splice(0, commandLines.value.length - 200);
    }
    return line;
};

const removeCommandLine = (line: CommandLine): void => {
    const index = commandLines.value.indexOf(line);
    if (index >= 0) {
        commandLines.value.splice(index, 1);
    }
};

const clearCommandLines = (): void => {
    commandLines.value = [];
};


interface CommandBatchItem {
    opName: string;
    action: () => Promise<unknown>;
    output?: (value: unknown) => string;
    highlight?: number;
}

/**
 * 解析一批顺序表命令。
 * 只在这里检查参数数量和格式；下标范围在真正执行时检查，
 * 因此前面的命令改变表长后，后面的命令仍能按最新状态校验。
 */
const parseListBatch = (commands: string[], list: LinearList): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    const linked = !(list instanceof ArrayList);
    const prepareInsert = (index: number): void => {
        if (linked) {
            setListInsertHint(index);
        }
    };
    const integer = (value: string): number | null => {
        const number = Number(value);
        return Number.isInteger(number) ? number : null;
    };
    const numberValue = (value: string): number | null => {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    };

    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();

        if (command === 'clear') {
            if (parts.length !== 0) {
                return { items: [], error: '用法：clear' };
            }
            items.push({
                opName: OP.CLEAR,
                action: async () => list.clear(),
            });
            continue;
        }

        if (command === 'insert') {
            if (parts.length === 1) {
                const value = numberValue(parts[0]);
                if (value === null) {
                    return { items: [], error: '用法：insert <索引> <值> 或 insert <值>' };
                }
                items.push({
                    opName: OP.INSERT,
                    action: () => {
                        const index = list.size();
                        prepareInsert(index);
                        return list.insert(index, value);
                    },
                });
                continue;
            }
            if (parts.length !== 2) {
                return { items: [], error: '用法：insert <索引> <值> 或 insert <值>' };
            }
            const index = integer(parts[0]);
            const value = numberValue(parts[1]);
            if (index === null || value === null) {
                return { items: [], error: '用法：insert <索引> <值> 或 insert <值>' };
            }
            items.push({
                opName: OP.INSERT,
                action: () => {
                    if (index < 0 || index > list.size()) {
                        throw new Error(`插入索引需在 0 到 ${list.size()} 之间`);
                    }
                    prepareInsert(index);
                    return list.insert(index, value);
                },
            });
            continue;
        }

        if (command === 'at') {
            if (parts.length !== 1) {
                return { items: [], error: '用法：at <索引>' };
            }
            const index = integer(parts[0]);
            if (index === null) {
                return { items: [], error: '用法：at <索引>' };
            }
            items.push({
                opName: OP.SEARCH,
                highlight: index,
                action: () => {
                    if (index < 0 || index >= list.size()) {
                        throw new Error(`查找索引需在 0 到 ${list.size() - 1} 之间`);
                    }
                    return list.at(index);
                },
                output: (value) => {
                    currentResult.value = value === null ? 'null' : String(value);
                    return `索引 ${index} 的值为 ${value === null ? 'null' : String(value)}`;
                },
            });
            continue;
        }

        if (command === 'update') {
            if (parts.length !== 2) {
                return { items: [], error: '用法：update <索引> <值>' };
            }
            const index = integer(parts[0]);
            const value = numberValue(parts[1]);
            if (index === null || value === null) {
                return { items: [], error: '用法：update <索引> <值>' };
            }
            items.push({
                opName: OP.UPDATE,
                highlight: index,
                action: () => {
                    if (index < 0 || index >= list.size()) {
                        throw new Error(`修改索引需在 0 到 ${list.size() - 1} 之间`);
                    }
                    return list.update(index, value);
                },
            });
            continue;
        }

        if (command === 'erase') {
            if (parts.length !== 1) {
                return { items: [], error: '用法：erase <索引>' };
            }
            const index = integer(parts[0]);
            if (index === null) {
                return { items: [], error: '用法：erase <索引>' };
            }
            items.push({
                opName: OP.DELETE,
                action: () => {
                    if (index < 0 || index >= list.size()) {
                        throw new Error(`删除索引需在 0 到 ${list.size() - 1} 之间`);
                    }
                    return list.erase(index);
                },
            });
            continue;
        }

        return { items: [], error: '未知命令：' + command };
    }

    return { items, error: null };
};

const parseStackBatch = (commands: string[], stack: ArrayStack | LinkedStack): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    const numberValue = (value: string): number | null => {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    };

    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        if (command === 'push') {
            if (parts.length !== 1) {
                return { items: [], error: '用法：push <值>' };
            }
            const value = numberValue(parts[0]);
            if (value === null) {
                return { items: [], error: 'push 的值必须为数字' };
            }
            items.push({
                opName: OP.STACK_PUSH,
                action: () => {
                    setListInsertHint(0);
                    return stack.push(value);
                },
            });
            continue;
        }
        if (command === 'pop') {
            if (parts.length !== 0) {
                return { items: [], error: '用法：pop' };
            }
            items.push({ opName: OP.STACK_POP, action: () => stack.pop() });
            continue;
        }
        if (command === 'top') {
            if (parts.length !== 0) {
                return { items: [], error: '用法：top' };
            }
            items.push({
                opName: OP.STACK_TOP,
                action: () => stack.top(),
                output: value => {
                    currentResult.value = value === null ? 'null' : String(value);
                    return `栈顶：${value === null ? 'null' : String(value)}`;
                },
            });
            continue;
        }
        if (command === 'clear') {
            if (parts.length !== 0) {
                return { items: [], error: '用法：clear' };
            }
            items.push({ opName: OP.CLEAR, action: async () => stack.clear() });
            continue;
        }
        return { items: [], error: '未知命令：' + command };
    }
    return { items, error: null };
};

const parseQueueBatch = (commands: string[], queue: ArrayQueue | LinkedQueue): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    const numberValue = (value: string): number | null => {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    };

    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        if (command === 'push') {
            if (parts.length !== 1) {
                return { items: [], error: '用法：push <值>' };
            }
            const value = numberValue(parts[0]);
            if (value === null) {
                return { items: [], error: 'push 的值必须为数字' };
            }
            items.push({
                opName: OP.QUEUE_PUSH,
                action: () => {
                    setListInsertHint(queue.size());
                    return queue.push(value);
                },
            });
            continue;
        }
        if (command === 'pop') {
            if (parts.length !== 0) {
                return { items: [], error: '用法：pop' };
            }
            items.push({ opName: OP.QUEUE_POP, action: () => queue.pop() });
            continue;
        }
        if (command === 'top') {
            if (parts.length !== 0) {
                return { items: [], error: '用法：top' };
            }
            items.push({
                opName: OP.QUEUE_FRONT,
                action: () => queue.top(),
                output: value => {
                    currentResult.value = value === null ? 'null' : String(value);
                    return `队首：${value === null ? 'null' : String(value)}`;
                },
            });
            continue;
        }
        if (command === 'clear') {
            if (parts.length !== 0) {
                return { items: [], error: '用法：clear' };
            }
            items.push({ opName: OP.CLEAR, action: async () => queue.clear() });
            continue;
        }
        return { items: [], error: '未知命令：' + command };
    }
    return { items, error: null };
};

const parseDequeBatch = (commands: string[], deque: ArrayDeque | LinkedDeque): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    const numberValue = (value: string): number | null => {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    };

    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        const value = parts.length === 1 ? numberValue(parts[0]) : null;

        if (command === 'pushfront' || command === 'pushback') {
            if (parts.length !== 1 || value === null) {
                return { items: [], error: '用法：' + command + ' <值>' };
            }
            items.push({
                opName: command === 'pushfront' ? OP.DEQUE_FRONT : OP.DEQUE_BACK,
                action: () => {
                    setListInsertHint(command === 'pushfront' ? 0 : deque.size());
                    return command === 'pushfront' ? deque.pushFront(value) : deque.pushBack(value);
                },
            });
            continue;
        }
        if (command === 'popfront' || command === 'popback') {
            if (parts.length !== 0) {
                return { items: [], error: '用法：' + command };
            }
            items.push({
                opName: command === 'popfront' ? OP.DEQUE_POP_FRONT : OP.DEQUE_POP_BACK,
                action: () => command === 'popfront' ? deque.popFront() : deque.popBack(),
            });
            continue;
        }
        if (command === 'getfront' || command === 'getback') {
            if (parts.length !== 0) {
                return { items: [], error: '用法：' + command };
            }
            items.push({
                opName: command === 'getfront' ? OP.DEQUE_GET_FRONT : OP.DEQUE_GET_BACK,
                action: () => command === 'getfront' ? deque.getFront() : deque.getBack(),
                output: result => {
                    currentResult.value = result === null ? 'null' : String(result);
                    return (command === 'getfront' ? '队首：' : '队尾：') +
                        (result === null ? 'null' : String(result));
                },
            });
            continue;
        }
        if (command === 'clear') {
            if (parts.length !== 0) {
                return { items: [], error: '用法：clear' };
            }
            items.push({ opName: OP.CLEAR, action: async () => deque.clear() });
            continue;
        }
        return { items: [], error: '未知命令：' + command };
    }
    return { items, error: null };
};

const parseBSTBatch = (commands: string[], tree: BSTFamily): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    const numberValue = (text: string): number | null => {
        const number = Number(text);
        return Number.isFinite(number) ? number : null;
    };
    const resultText = (value: unknown): string => value === null ? 'null' : String(value);
    const scapegoat = tree instanceof ScapegoatTree ? tree : null;
    const pushQuery = (
        opName: string,
        label: string,
        action: () => Promise<unknown>,
    ): void => {
        items.push({
            opName,
            action,
            output: value => {
                const text = resultText(value);
                currentResult.value = text;
                return `${label}：${text}`;
            },
        });
    };

    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();

        if (command === 'insert' || command === 'delete' || command === 'contains') {
            if (parts.length !== 1) {
                return { items: [], error: `用法：${command} <值>` };
            }
            const value = numberValue(parts[0]);
            if (value === null) {
                return { items: [], error: `${command} 的参数必须为数字` };
            }
            if (command === 'insert') {
                items.push({
                    opName: OP.INSERT,
                    action: async () => {
                        const no = treeInsertCounter++;
                        addMessage(`将节点 ${value}（第${no}个）加入${menuTitle(currentMenu.value)}`, MessageType.INFO);
                        await tree.insert(value);
                    },
                });
            } else if (command === 'delete') {
                items.push({
                    opName: OP.DELETE,
                    action: () => tree.delete(value),
                });
            } else {
                pushQuery(OP.SEARCH, `contains ${value}`, () => tree.contains(value));
            }
            continue;
        }

        if (command === 'clear') {
            if (parts.length !== 0) {
                return { items: [], error: '用法：clear' };
            }
            items.push({ opName: OP.CLEAR, action: async () => tree.clear() });
            continue;
        }

        if (command === 'size') {
            if (parts.length !== 0) {
                return { items: [], error: '用法：size' };
            }
            pushQuery('查询大小', 'size', async () => tree.size());
            continue;
        }

        if (command === 'isempty') {
            if (parts.length !== 0) {
                return { items: [], error: '用法：isEmpty' };
            }
            pushQuery('判断为空', 'isEmpty', async () => tree.isEmpty());
            continue;
        }

        if (command === 'small' || command === 'rank' || command === 'index' ||
            command === 'predecessor' || command === 'successor') {
            if (scapegoat === null) {
                return { items: [], error: `当前结构不支持 ${command} 命令` };
            }
            const argumentName = command === 'index' ? 'k' : '值';
            if (parts.length !== 1) {
                return { items: [], error: `用法：${command} <${argumentName}>` };
            }
            const value = numberValue(parts[0]);
            if (value === null || (command === 'index' && !Number.isInteger(value))) {
                return { items: [], error: `${command} 的参数必须为${command === 'index' ? '整数' : '数字'}` };
            }
            if (command === 'small') {
                pushQuery('统计更小值', `small ${value}`, () => scapegoat.small(value));
            } else if (command === 'rank') {
                pushQuery('查询排名', `rank ${value}`, () => scapegoat.rank(value));
            } else if (command === 'index') {
                pushQuery('按排名查询', `index ${value}`, () => scapegoat.index(value));
            } else if (command === 'predecessor') {
                pushQuery('查询前驱', `predecessor ${value}`, () => scapegoat.predecessor(value));
            } else {
                pushQuery('查询后继', `successor ${value}`, () => scapegoat.successor(value));
            }
            continue;
        }

        return { items: [], error: `未知命令：${command}` };
    }

    return { items, error: null };
};

const makeQueryItem = (
    opName: string,
    label: string,
    action: () => Promise<unknown>,
): CommandBatchItem => ({
    opName,
    action,
    output: value => {
        const text = value === null ? 'null' : String(value);
        currentResult.value = text;
        return `${label}：${text}`;
    },
});

const rebuildSegmentTree = (data: number[]): void => {
    segDataLen = data.length;
    DataNode.restart();
    visualizerManager.switchVisualizer(VisualizerType.SEGMENT_TREE);
    resetCanvasView();
    currentDS = create(SegmentTree, data);
    updateStats();
    addMessage(`已用 [${data.join(', ')}] 重建线段树`, MessageType.SUCCESS);
};

const rebuildUnionFind = (n: number): void => {
    unionFindSize = n;
    DataNode.restart();
    visualizerManager.switchVisualizer(VisualizerType.UNION_FIND);
    resetCanvasView();
    currentDS = create(UnionFindSet, n);
    updateStats();
    addMessage(`已初始化 ${n} 个独立元素`, MessageType.SUCCESS);
};

const rebuildBit = (n: number, initialValue = 1): void => {
    bitSize = n;
    DataNode.restart();
    visualizerManager.switchVisualizer(VisualizerType.BINARY_INDEXED_TREE);
    resetCanvasView();
    currentDS = create(BinaryIndexedTree, n, initialValue);
    updateStats();
    addMessage(`已初始化长度为 ${n} 的树状数组`, MessageType.SUCCESS);
};

const requireSegmentTree = (): SegmentTree => {
    if (!(currentDS instanceof SegmentTree)) throw new Error('线段树实例不可用');
    return currentDS;
};

const requireUnionFind = (): UnionFindSet => {
    if (!(currentDS instanceof UnionFindSet)) throw new Error('并查集实例不可用');
    return currentDS;
};

const requireBit = (): BinaryIndexedTree => {
    if (!(currentDS instanceof BinaryIndexedTree)) throw new Error('树状数组实例不可用');
    return currentDS;
};

const parseHeapBatch = (commands: string[], heap: BinaryHeap): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    const numberValue = (text: string): number | null => {
        const number = Number(text);
        return Number.isFinite(number) ? number : null;
    };

    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        if (command === 'push') {
            if (parts.length !== 1) return { items: [], error: '用法：push <值>' };
            const value = numberValue(parts[0]);
            if (value === null) return { items: [], error: 'push 的值必须为数字' };
            items.push({ opName: OP.HEAP_PUSH, action: () => heap.push(value) });
            continue;
        }
        if (command === 'pop') {
            if (parts.length !== 0) return { items: [], error: '用法：pop' };
            items.push({ opName: OP.HEAP_POP, action: () => heap.pop() });
            continue;
        }
        if (command === 'top') {
            if (parts.length !== 0) return { items: [], error: '用法：top' };
            items.push(makeQueryItem(OP.HEAP_TOP, 'top', () => heap.top()));
            continue;
        }
        if (command === 'size') {
            if (parts.length !== 0) return { items: [], error: '用法：size' };
            items.push(makeQueryItem('查询大小', 'size', async () => heap.size()));
            continue;
        }
        if (command === 'isempty') {
            if (parts.length !== 0) return { items: [], error: '用法：isEmpty' };
            items.push(makeQueryItem('判断为空', 'isEmpty', async () => heap.isEmpty()));
            continue;
        }
        if (command === 'clear') {
            if (parts.length !== 0) return { items: [], error: '用法：clear' };
            items.push({ opName: OP.CLEAR, action: async () => heap.clear() });
            continue;
        }
        return { items: [], error: `未知命令：${command}` };
    }
    return { items, error: null };
};

const parseHashBatch = (commands: string[], table: HashTable): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    const integerValue = (text: string): number | null => {
        const number = Number(text);
        return Number.isInteger(number) ? number : null;
    };

    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        if (command === 'add' || command === 'contains' || command === 'remove') {
            if (parts.length !== 1) return { items: [], error: `用法：${command} <键>` };
            const key = integerValue(parts[0]);
            if (key === null) return { items: [], error: `${command} 的键必须为整数` };
            if (command === 'add') {
                items.push({ opName: OP.HASH_ADD, action: () => table.add(key) });
            } else if (command === 'contains') {
                items.push(makeQueryItem(OP.HASH_FIND, `contains ${key}`, () => table.contains(key)));
            } else {
                items.push({ opName: OP.HASH_REMOVE, action: () => table.remove(key) });
            }
            continue;
        }
        if (command === 'size') {
            if (parts.length !== 0) return { items: [], error: '用法：size' };
            items.push(makeQueryItem('查询大小', 'size', async () => table.size()));
            continue;
        }
        if (command === 'isempty') {
            if (parts.length !== 0) return { items: [], error: '用法：isEmpty' };
            items.push(makeQueryItem('判断为空', 'isEmpty', async () => table.isEmpty()));
            continue;
        }
        if (command === 'clear') {
            if (parts.length !== 0) return { items: [], error: '用法：clear' };
            items.push({ opName: OP.CLEAR, action: async () => table.clear() });
            continue;
        }
        return { items: [], error: `未知命令：${command}` };
    }
    return { items, error: null };
};

const parseTrieBatch = (commands: string[], trie: Trie): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    const wordValue = (text: string): string | null => /^[a-z]+$/.test(text) ? text : null;

    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        if (command === 'insert' || command === 'find' || command === 'prefix' || command === 'delete') {
            if (parts.length !== 1) return { items: [], error: `用法：${command} <单词>` };
            const word = wordValue(parts[0]);
            if (word === null) return { items: [], error: '单词只能包含小写字母 a-z' };
            if (command === 'insert') {
                items.push({ opName: OP.TRIE_INSERT, action: () => trie.insert(word) });
            } else if (command === 'find') {
                items.push(makeQueryItem(OP.TRIE_FIND, `find ${word}`, () => trie.find(word)));
            } else if (command === 'prefix') {
                items.push(makeQueryItem(OP.TRIE_PREFIX, `prefix ${word}`, () => trie.prefix(word)));
            } else {
                items.push({ opName: OP.TRIE_DELETE, action: () => trie.delete(word) });
            }
            continue;
        }
        if (command === 'size') {
            if (parts.length !== 0) return { items: [], error: '用法：size' };
            items.push(makeQueryItem('查询大小', 'size', async () => trie.size()));
            continue;
        }
        if (command === 'isempty') {
            if (parts.length !== 0) return { items: [], error: '用法：isEmpty' };
            items.push(makeQueryItem('判断为空', 'isEmpty', async () => trie.isEmpty()));
            continue;
        }
        if (command === 'clear') {
            if (parts.length !== 0) return { items: [], error: '用法：clear' };
            items.push({ opName: OP.CLEAR, action: async () => trie.clear() });
            continue;
        }
        return { items: [], error: `未知命令：${command}` };
    }
    return { items, error: null };
};

const parseSegmentBatch = (commands: string[]): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    const numberValue = (text: string): number | null => {
        const number = Number(text);
        return Number.isFinite(number) ? number : null;
    };
    const integerValue = (text: string): number | null => {
        const number = Number(text);
        return Number.isInteger(number) ? number : null;
    };
    const checkRange = (l: number, r: number): void => {
        const n = requireSegmentTree().getSize();
        if (l < 0 || r >= n || l > r) {
            throw new Error(`区间需在 0 到 ${n - 1} 之间，且左端点不大于右端点`);
        }
    };

    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        if (command === 'add') {
            if (parts.length !== 3) return { items: [], error: '用法：add <l> <r> <增量>' };
            const l = integerValue(parts[0]);
            const r = integerValue(parts[1]);
            const value = numberValue(parts[2]);
            if (l === null || r === null || value === null) {
                return { items: [], error: 'add 的端点和增量必须为数字，端点还需为整数' };
            }
            items.push({
                opName: OP.SEG_ADD,
                action: () => {
                    checkRange(l, r);
                    return requireSegmentTree().add(l, r, value);
                },
            });
            continue;
        }
        if (command === 'query') {
            if (parts.length !== 2) return { items: [], error: '用法：query <l> <r>' };
            const l = integerValue(parts[0]);
            const r = integerValue(parts[1]);
            if (l === null || r === null) return { items: [], error: 'query 的端点必须为整数' };
            items.push(makeQueryItem(OP.SEG_QUERY, `query [${l}, ${r}]`, () => {
                checkRange(l, r);
                return requireSegmentTree().query(l, r);
            }));
            continue;
        }
        if (command === 'getsize') {
            if (parts.length !== 0) return { items: [], error: '用法：getSize' };
            items.push(makeQueryItem('查询大小', 'getSize', async () => requireSegmentTree().getSize()));
            continue;
        }
        if (command === 'init') {
            if (parts.length === 0) return { items: [], error: '用法：init <v1> <v2> ...' };
            const data: number[] = [];
            for (const token of parts.join(' ').split(/[,，\s]+/)) {
                if (token === '') continue;
                const value = numberValue(token);
                if (value === null) return { items: [], error: 'init 的值必须为数字' };
                data.push(value);
            }
            if (data.length === 0) return { items: [], error: '用法：init <v1> <v2> ...' };
            items.push({ opName: OP.RESTART, action: async () => rebuildSegmentTree(data) });
            continue;
        }
        if (command === 'reset') {
            if (parts.length !== 0) return { items: [], error: '用法：reset' };
            items.push({
                opName: OP.RESTART,
                action: async () => rebuildSegmentTree([1, 1, 1, 1, 1, 1, 1, 1]),
            });
            continue;
        }
        return { items: [], error: `未知命令：${command}` };
    }
    return { items, error: null };
};

const parseUnionFindBatch = (commands: string[]): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    const integerValue = (text: string): number | null => {
        const number = Number(text);
        return Number.isInteger(number) ? number : null;
    };
    const checkIndex = (index: number): void => {
        if (index < 0 || index >= unionFindSize) {
            throw new Error(`节点编号需在 0 到 ${unionFindSize - 1} 之间`);
        }
    };

    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        if (command === 'union' || command === 'insameset') {
            if (parts.length !== 2) return { items: [], error: `用法：${command} <u> <v>` };
            const u = integerValue(parts[0]);
            const v = integerValue(parts[1]);
            if (u === null || v === null) return { items: [], error: `${command} 的节点编号必须为整数` };
            if (command === 'union') {
                items.push({
                    opName: OP.UNION_FIND_UNION,
                    action: () => {
                        checkIndex(u);
                        checkIndex(v);
                        return requireUnionFind().union(u, v);
                    },
                });
            } else {
                items.push(makeQueryItem(
                    OP.UNION_FIND_SAME,
                    `inSameSet ${u} ${v}`,
                    () => {
                        checkIndex(u);
                        checkIndex(v);
                        return requireUnionFind().inSameSet(u, v);
                    },
                ));
            }
            continue;
        }
        if (command === 'find' || command === 'getsize') {
            if (parts.length !== 1) return { items: [], error: `用法：${command} <x>` };
            const x = integerValue(parts[0]);
            if (x === null) return { items: [], error: `${command} 的节点编号必须为整数` };
            if (command === 'find') {
                items.push(makeQueryItem(OP.UNION_FIND_FIND, `find ${x}`, () => {
                    checkIndex(x);
                    return requireUnionFind().find(x);
                }));
            } else {
                items.push(makeQueryItem(OP.UNION_FIND_SIZE, `getSize ${x}`, () => {
                    checkIndex(x);
                    return requireUnionFind().getSize(x);
                }));
            }
            continue;
        }
        if (command === 'init') {
            if (parts.length !== 1) return { items: [], error: '用法：init <n>' };
            const n = integerValue(parts[0]);
            if (n === null || n < 2 || n > 20) {
                return { items: [], error: '元素个数必须为 2 到 20 之间的整数' };
            }
            items.push({ opName: '设置规模', action: async () => rebuildUnionFind(n) });
            continue;
        }
        if (command === 'reset') {
            if (parts.length !== 0) return { items: [], error: '用法：reset' };
            items.push({
                opName: OP.RESTART,
                action: async () => rebuildUnionFind(UNION_FIND_DEFAULT_SIZE),
            });
            continue;
        }
        return { items: [], error: `未知命令：${command}` };
    }
    return { items, error: null };
};

const parseBitBatch = (commands: string[]): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    const numberValue = (text: string): number | null => {
        const number = Number(text);
        return Number.isFinite(number) ? number : null;
    };
    const integerValue = (text: string): number | null => {
        const number = Number(text);
        return Number.isInteger(number) ? number : null;
    };
    const checkIndex = (index: number): void => {
        if (index < 1 || index > bitSize) {
            throw new Error(`下标需在 1 到 ${bitSize} 之间`);
        }
    };
    const checkRange = (l: number, r: number): void => {
        if (l < 1 || r > bitSize || l > r) {
            throw new Error(`区间需在 1 到 ${bitSize} 之间，且左端点不大于右端点`);
        }
    };

    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        if (command === 'add') {
            if (parts.length !== 2) return { items: [], error: '用法：add <idx> <增量>' };
            const index = integerValue(parts[0]);
            const value = numberValue(parts[1]);
            if (index === null || value === null) {
                return { items: [], error: 'add 的下标必须为整数，增量必须为数字' };
            }
            items.push({
                opName: OP.BIT_ADD,
                action: () => {
                    checkIndex(index);
                    return requireBit().add(index, value);
                },
            });
            continue;
        }
        if (command === 'query') {
            if (parts.length !== 2) return { items: [], error: '用法：query <l> <r>' };
            const l = integerValue(parts[0]);
            const r = integerValue(parts[1]);
            if (l === null || r === null) return { items: [], error: 'query 的端点必须为整数' };
            items.push(makeQueryItem(OP.BIT_QUERY, `query [${l}, ${r}]`, () => {
                checkRange(l, r);
                return requireBit().query(l, r);
            }));
            continue;
        }
        if (command === 'init') {
            if (parts.length !== 1 && parts.length !== 2) {
                return { items: [], error: '用法：init <n> [初始值]' };
            }
            const n = integerValue(parts[0]);
            if (n === null || n < 1 || n > 20) {
                return { items: [], error: '元素个数必须为 1 到 20 之间的整数' };
            }
            const initial = parts.length === 2 ? numberValue(parts[1]) : 1;
            if (initial === null) return { items: [], error: '初始值必须为数字' };
            items.push({ opName: '设置规模', action: async () => rebuildBit(n, initial) });
            continue;
        }
        if (command === 'reset') {
            if (parts.length !== 0) return { items: [], error: '用法：reset' };
            items.push({
                opName: OP.RESTART,
                action: async () => rebuildBit(BIT_DEFAULT_SIZE, 1),
            });
            continue;
        }
        return { items: [], error: `未知命令：${command}` };
    }
    return { items, error: null };
};

/************************************************** */
// 算法命令辅助
const requireBinarySearch = (): BinarySearch => {
    if (!(currentDS instanceof BinarySearch)) throw new Error('二分查找实例不可用');
    return currentDS;
};

const requireTraversal = (): BinaryTreeTraversal => {
    if (!(currentDS instanceof BinaryTreeTraversal)) throw new Error('二叉树遍历实例不可用');
    return currentDS;
};

const requireKMP = (): KMP => {
    if (!(currentDS instanceof KMP)) throw new Error('KMP 实例不可用');
    return currentDS;
};

const requireSort = (): BubbleSort | InsertionSort | MergeSort | QuickSort => {
    const ds = currentDS;
    if (ds instanceof BubbleSort || ds instanceof InsertionSort ||
        ds instanceof MergeSort || ds instanceof QuickSort) {
        return ds;
    }
    throw new Error('排序实例不可用');
};

const rebuildBinarySearch = (data: number[]): void => {
    bsDataLen = data.length;
    bsVars.value = {
        left: 0,
        right: bsDataLen - 1,
        mid: Math.floor((bsDataLen - 1) / 2),
        target: bsVars.value.target,
    };
    DataNode.restart();
    visualizerManager.switchVisualizer(VisualizerType.BINARY_SEARCH);
    resetCanvasView();
    currentDS = create(BinarySearch, data);
    updateStats();
    addMessage(`已用 [${data.join(', ')}] 重建数据`, MessageType.SUCCESS);
};

interface TraversalStructure {
    rootId: number;
    nodeIds: number[];
    children: Map<number, number[]>;
    error: string | null;
}

const parseTraversalStructure = (values: number[]): TraversalStructure => {
    const empty: TraversalStructure = { rootId: -1, nodeIds: [], children: new Map(), error: null };
    if (values.length === 0 || values.length % 2 !== 0) {
        return { ...empty, error: '边序列长度必须为偶数，每两个数表示一条边 u v' };
    }
    if (values.some(value => !Number.isInteger(value) || value < 0)) {
        return { ...empty, error: '节点编号必须为非负整数' };
    }

    const nodeIds = Array.from(new Set(values)).sort((a, b) => a - b);
    const parentOf = new Map<number, number>();
    const children = new Map<number, number[]>();
    for (let i = 0; i < values.length; i += 2) {
        const u = values[i];
        const v = values[i + 1];
        if (u === v) {
            return { ...empty, error: `节点 ${u} 不能以自己为父节点` };
        }
        if (parentOf.has(u)) {
            return { ...empty, error: `节点 ${u} 有多个父节点` };
        }
        parentOf.set(u, v);
        const kids = children.get(v) ?? [];
        kids.push(u);
        if (kids.length > 2) {
            return { ...empty, error: `节点 ${v} 超过两个子节点` };
        }
        children.set(v, kids);
    }

    const roots = nodeIds.filter(id => !parentOf.has(id));
    if (roots.length !== 1) {
        return { ...empty, error: `必须恰好有一个根节点，当前有 ${roots.length} 个` };
    }

    const rootId = roots[0];
    const visited = new Set<number>();
    const stack = [rootId];
    while (stack.length > 0) {
        const id = stack.pop()!;
        if (visited.has(id)) {
            return { ...empty, error: '树中存在环' };
        }
        visited.add(id);
        for (const child of children.get(id) ?? []) {
            stack.push(child);
        }
    }
    if (visited.size !== nodeIds.length) {
        return { ...empty, error: '所有节点必须连通到根节点' };
    }

    return { rootId, nodeIds, children, error: null };
};

const parseTraversalInput = (raw: string): { values: number[]; error: string | null } => {
    const tokens = raw.trim().split(/[,，\s]+/).filter(Boolean);
    if (tokens.length === 0) {
        return { values: [], error: '请输入树边序列' };
    }
    const values = tokens.map(Number);
    const structure = parseTraversalStructure(values);
    return { values, error: structure.error };
};

const validateTraversalInput = (raw: string): string | null =>
    parseTraversalInput(raw).error;

const rebuildTraversalFromEdges = (values: number[]): void => {
    const parsed = parseTraversalStructure(values);
    if (parsed.error !== null) throw new Error(parsed.error);

    DataNode.restart();
    visualizerManager.switchVisualizer(VisualizerType.BINARY_TREE_TRAVERSAL);
    resetCanvasView();

    const nodes = new Map<number, BinaryTreeTraversalNode>();
    for (const id of parsed.nodeIds) {
        nodes.set(id, create(BinaryTreeTraversalNode, null, null, id));
    }
    for (const id of parsed.nodeIds) {
        const children = parsed.children.get(id) ?? [];
        const node = nodes.get(id)!;
        if (children[0] !== undefined) node._set_left(nodes.get(children[0])!);
        if (children[1] !== undefined) node._set_right(nodes.get(children[1])!);
    }

    const root = nodes.get(parsed.rootId)!;
    currentDS = create(BinaryTreeTraversal, root);
    traversalNodeCount = parsed.nodeIds.length;
    traversalEdges = [...values];
    updateStats();
    addMessage(`已设置包含 ${traversalNodeCount} 个节点的二叉树`, MessageType.SUCCESS);
};

const resetTraversal = (): void => {
    if (traversalEdges !== null) {
        rebuildTraversalFromEdges(traversalEdges);
        addMessage('已重新开始', MessageType.SUCCESS);
        return;
    }
    DataNode.restart();
    visualizerManager.switchVisualizer(VisualizerType.BINARY_TREE_TRAVERSAL);
    resetCanvasView();
    currentDS = createStructure(VisualizerType.BINARY_TREE_TRAVERSAL);
    traversalNodeCount = 7;
    updateStats();
    addMessage('已重新开始', MessageType.SUCCESS);
};

const rebuildGraph = (key: VisualizerType, edges: number[][]): void => {
    graphEdgesByKey.set(key, edges);
    DataNode.restart();
    visualizerManager.switchVisualizer(key);
    resetCanvasView();
    currentDS = createGraphDS(key);
    updateStats();
    addMessage(
        `已设置自定义图：${graphNodeCnt} 个节点，${edges.length} 条边`,
        MessageType.SUCCESS,
    );
};

const resetGraph = (key: VisualizerType): void => {
    DataNode.restart();
    visualizerManager.switchVisualizer(key);
    createDS(key);
    resetCanvasView();
    updateStats();
    addMessage('已重新开始', MessageType.SUCCESS);
};

const runGraphAlgorithm = async (key: VisualizerType, start: number): Promise<void> => {
    const ds = currentDS;
    if (!ds) throw new Error('图实例不可用');
    switch (key) {
        case VisualizerType.DIJKSTRA:
            await (ds as dijkstra).execute(start);
            break;
        case VisualizerType.FLOYD:
            await (ds as floyd).execute();
            break;
        case VisualizerType.PRIM:
            await (ds as prim).execute();
            break;
        case VisualizerType.KRUSKAL:
            await (ds as kruskal).execute();
            break;
        default:
            throw new Error('当前不是图算法');
    }
};

const parseGraphCommandValues = (values: number[], key: VisualizerType): GraphParseResult => {
    if (values.length === 0 || values.length % 3 !== 0) {
        return { edges: [], error: '边序列长度必须是 3 的倍数（起点 终点 权值）' };
    }
    const lines: string[] = [];
    for (let i = 0; i < values.length; i += 3) {
        lines.push(`${values[i]} ${values[i + 1]} ${values[i + 2]}`);
    }
    return parseGraphEdges(lines.join('\n'), !isDirectedGraph(key));
};

const rebuildSort = (key: VisualizerType, data: number[]): void => {
    sortData.value = [...data];
    DataNode.restart();
    visualizerManager.switchVisualizer(key);
    resetCanvasView();
    currentDS = createStructure(key);
    const vis = visualizerManager.getCurrentVisualizer();
    if (vis instanceof SortVisualizer) vis.preview([...data]);
    updateStats();
    addMessage(`数组已设置为：[${data.join(', ')}]`, MessageType.SUCCESS);
};

const resetSort = (key: VisualizerType): void => {
    DataNode.restart();
    visualizerManager.switchVisualizer(key);
    createDS(key);
    resetCanvasView();
    updateStats();
    addMessage('已重新开始', MessageType.SUCCESS);
};

const runSortAlgorithm = async (key: VisualizerType, data: number[]): Promise<void> => {
    DataNode.restart();
    visualizerManager.switchVisualizer(key);
    resetCanvasView();
    currentDS = createStructure(key);
    addMessage(`开始对 [${data.join(', ')}] 排序`, MessageType.INFO);
    const ds = requireSort();
    if (key === VisualizerType.BUBBLE_SORT) await (ds as BubbleSort).sort(data);
    else if (key === VisualizerType.INSERTION_SORT) await (ds as InsertionSort).sort(data);
    else if (key === VisualizerType.MERGE_SORT) await (ds as MergeSort).sort(data);
    else await (ds as QuickSort).sort(data);
};

const rebuildKMP = (str: string, template: string): void => {
    lastKmpStr = str;
    lastKmpTemplate = template;
    DataNode.restart();
    visualizerManager.switchVisualizer(VisualizerType.KMP);
    resetCanvasView();
    currentDS = create(KMP, str, template);
    updateStats();
    addMessage(`已设置主串「${str}」和模式串「${template}」`, MessageType.SUCCESS);
};

const resetKMP = (): void => {
    rebuildKMP('ababcabab', 'abab');
};

const numberListFromParts = (parts: string[]): number[] | null => {
    const tokens = parts.join(' ').split(/[,，\s]+/).filter(Boolean);
    if (tokens.length === 0) return null;
    const values = tokens.map(Number);
    return values.every(Number.isFinite) ? values : null;
};

const integerListFromParts = (parts: string[]): number[] | null => {
    const values = numberListFromParts(parts);
    return values !== null && values.every(Number.isInteger) ? values : null;
};

const parseBinarySearchBatch = (commands: string[]): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    const numberValue = (text: string): number | null => {
        const value = Number(text);
        return Number.isFinite(value) ? value : null;
    };

    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        if (command === 'find') {
            if (parts.length !== 1) return { items: [], error: '用法：find <目标值>' };
            const target = numberValue(parts[0]);
            if (target === null) return { items: [], error: 'find 的目标值必须为数字' };
            items.push(makeQueryItem(OP.SEARCH, `find ${target}`, async () => {
                bsVars.value.target = target;
                addMessage(`开始二分查找 target=${target}`, MessageType.INFO);
                return requireBinarySearch().find(target);
            }));
            continue;
        }
        if (command === 'setdata') {
            const values = numberListFromParts(parts);
            if (values === null || values.length === 0) {
                return { items: [], error: '用法：setData <值1> <值2> ...' };
            }
            values.sort((a, b) => a - b);
            items.push({
                opName: '设置数组',
                action: async () => rebuildBinarySearch(values),
            });
            continue;
        }
        return { items: [], error: `未知命令：${command}` };
    }
    return { items, error: null };
};

const parseTraversalBatch = (commands: string[]): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        if (command === 'setdata') {
            const values = integerListFromParts(parts);
            if (values === null) {
                return { items: [], error: '用法：setData <u1> <v1> <u2> <v2> ...' };
            }
            const structure = parseTraversalStructure(values);
            if (structure.error !== null) return { items: [], error: structure.error };
            items.push({
                opName: '设置数据',
                action: async () => rebuildTraversalFromEdges(values),
            });
            continue;
        }
        if (command === 'preordertraversal' || command === 'inordertraversal' ||
            command === 'postordertraversal') {
            if (parts.length !== 0) return { items: [], error: `用法：${command}` };
            const opName = command === 'preordertraversal' ? OP.PRE_ORDER
                : command === 'inordertraversal' ? OP.IN_ORDER : OP.POST_ORDER;
            items.push({
                opName,
                action: async () => {
                    const ds = requireTraversal();
                    if (command === 'preordertraversal') await ds.preOrderTraversal();
                    else if (command === 'inordertraversal') await ds.inOrderTraversal();
                    else await ds.postOrderTraversal();
                },
            });
            continue;
        }
        if (command === 'reset') {
            if (parts.length !== 0) return { items: [], error: '用法：reset' };
            items.push({ opName: OP.RESTART, action: async () => resetTraversal() });
            continue;
        }
        return { items: [], error: `未知命令：${command}` };
    }
    return { items, error: null };
};

const parseGraphBatch = (commands: string[], key: VisualizerType): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        if (command === 'setdata') {
            const values = numberListFromParts(parts);
            if (values === null) {
                return { items: [], error: '用法：setData <u1> <v1> <w1> ...' };
            }
            const parsed = parseGraphCommandValues(values, key);
            if (parsed.error !== null) return { items: [], error: parsed.error };
            items.push({
                opName: '设置图',
                action: async () => rebuildGraph(key, parsed.edges),
            });
            continue;
        }
        if (command === 'execute') {
            if (parts.length > 1) return { items: [], error: '用法：execute [起点]' };
            let start = 0;
            if (parts.length === 1) {
                if (key !== VisualizerType.DIJKSTRA) {
                    return { items: [], error: '只有 Dijkstra 的 execute 支持起点参数' };
                }
                const value = Number(parts[0]);
                if (!Number.isInteger(value)) return { items: [], error: '起点必须为整数' };
                start = value;
            }
            items.push({
                opName: OP.GRAPH_RUN,
                action: async () => {
                    addMessage(`开始执行 ${menuTitle(key)} 算法`, MessageType.INFO);
                    await runGraphAlgorithm(key, start);
                },
            });
            continue;
        }
        if (command === 'reset') {
            if (parts.length !== 0) return { items: [], error: '用法：reset' };
            items.push({ opName: OP.RESTART, action: async () => resetGraph(key) });
            continue;
        }
        return { items: [], error: `未知命令：${command}` };
    }
    return { items, error: null };
};

const parseSortBatch = (commands: string[], key: VisualizerType): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        if (command === 'setdata') {
            const values = numberListFromParts(parts);
            if (values === null) {
                return { items: [], error: '用法：setData <值1> <值2> ...' };
            }
            items.push({
                opName: '设置数组',
                action: async () => rebuildSort(key, values),
            });
            continue;
        }
        if (command === 'sort') {
            if (parts.length !== 0) return { items: [], error: '用法：sort' };
            items.push({
                opName: OP.SORT_RUN,
                action: async () => {
                    if (sortData.value.length === 0) throw new Error('请先使用 setData 设置数组');
                    await runSortAlgorithm(key, [...sortData.value]);
                },
            });
            continue;
        }
        if (command === 'reset') {
            if (parts.length !== 0) return { items: [], error: '用法：reset' };
            items.push({ opName: OP.RESTART, action: async () => resetSort(key) });
            continue;
        }
        return { items: [], error: `未知命令：${command}` };
    }
    return { items, error: null };
};

const parseKMPBatch = (commands: string[]): {
    items: CommandBatchItem[];
    error: string | null;
} => {
    const items: CommandBatchItem[] = [];
    for (const text of commands) {
        const parts = text.split(/\s+/);
        const command = (parts.shift() ?? '').toLowerCase();
        if (command === 'setdata') {
            if (parts.length < 1 || parts.length > 2) {
                return { items: [], error: '用法：setData <主串> [模式串]' };
            }
            const str = parts[0];
            const template = parts[1] ?? '';
            if (str === '') return { items: [], error: '主串不能为空' };
            items.push({
                opName: '设置数据',
                action: async () => rebuildKMP(str, template),
            });
            continue;
        }
        if (command === 'search') {
            if (parts.length !== 0) return { items: [], error: '用法：search' };
            items.push(makeQueryItem(OP.KMP_SEARCH, 'search', async () => {
                addMessage('开始 KMP 匹配', MessageType.INFO);
                return requireKMP().search();
            }));
            continue;
        }
        if (command === 'getnext') {
            if (parts.length !== 0) return { items: [], error: '用法：getNext' };
            items.push({
                opName: OP.KMP_NEXT,
                action: async () => requireKMP().getNext(),
            });
            continue;
        }
        if (command === 'reset') {
            if (parts.length !== 0) return { items: [], error: '用法：reset' };
            items.push({ opName: OP.RESTART, action: async () => resetKMP() });
            continue;
        }
        return { items: [], error: `未知命令：${command}` };
    }
    return { items, error: null };
};

const executeCommandBatch = (items: CommandBatchItem[]): void => {
    runOp(async () => {
        const runningLine = pushCommandLine('执行中...', 'info');
        try {
            for (const item of items) {
                currentOp.value = item.opName;
                const value = await item.action();
                if (item.highlight !== undefined && isLinkedListDS.value) {
                    highlightListIndex(item.highlight);
                }
                if (item.output) {
                    pushCommandLine(item.output(value), 'output');
                }
            }
        } catch (error) {
            pushCommandLine('命令执行失败：' +
                (error instanceof Error ? error.message : String(error)), 'error');
        } finally {
            removeCommandLine(runningLine);
            updateStats();
        }
    });
};

const handleCommand = (raw: string): void => {
    const commands = raw
        .split(/\r?\n/)
        .map(command => command.trim())
        .filter(command => command !== '');
    if (commands.length === 0) return;
    for (const command of commands) {
        pushCommandLine(command, 'input');
    }

    let parsed: { items: CommandBatchItem[]; error: string | null } | null = null;
    if (isLinearListInstance(currentDS)) {
        parsed = parseListBatch(commands, currentDS);
    } else if (isStackInstance(currentDS)) {
        parsed = parseStackBatch(commands, currentDS);
    } else if (isQueueInstance(currentDS)) {
        parsed = parseQueueBatch(commands, currentDS);
    } else if (isDequeInstance(currentDS)) {
        parsed = parseDequeBatch(commands, currentDS);
    } else if (isBSTFamilyInstance(currentDS)) {
        parsed = parseBSTBatch(commands, currentDS);
    } else if (isBinaryHeapInstance(currentDS)) {
        parsed = parseHeapBatch(commands, currentDS);
    } else if (isHashTableInstance(currentDS)) {
        parsed = parseHashBatch(commands, currentDS);
    } else if (isTrieInstance(currentDS)) {
        parsed = parseTrieBatch(commands, currentDS);
    } else if (isSegmentTreeInstance(currentDS)) {
        parsed = parseSegmentBatch(commands);
    } else if (isUnionFindInstance(currentDS)) {
        parsed = parseUnionFindBatch(commands);
    } else if (isBitInstance(currentDS)) {
        parsed = parseBitBatch(commands);
    } else if (currentMenu.value === VisualizerType.BINARY_SEARCH) {
        parsed = parseBinarySearchBatch(commands);
    } else if (currentMenu.value === VisualizerType.BINARY_TREE_TRAVERSAL) {
        parsed = parseTraversalBatch(commands);
    } else if (isGraphAlgorithm(currentMenu.value)) {
        parsed = parseGraphBatch(commands, currentMenu.value);
    } else if (isSortAlgorithm(currentMenu.value)) {
        parsed = parseSortBatch(commands, currentMenu.value);
    } else if (currentMenu.value === VisualizerType.KMP) {
        parsed = parseKMPBatch(commands);
    }

    if (parsed === null) {
        pushCommandLine('当前数据结构暂未实现命令行命令', 'error');
        return;
    }
    if (parsed.error !== null) {
        pushCommandLine(parsed.error, 'error');
        return;
    }
    executeCommandBatch(parsed.items);
};

/************************************************** */
// 栈 / 队列 / 双端队列
const handleStackPush = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    handleCommand(`push ${Number(v.val ?? 0)}`);
};
const handleStackPop = (): void => {
    const ds = currentDS;
    if (!ds) return;
    handleCommand('pop');
};
const handleStackTop = (): void => {
    const ds = currentDS;
    if (!ds) return;
    handleCommand('top');
};

const handleQueuePush = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    handleCommand(`push ${Number(v.val ?? 0)}`);
};
const handleQueuePop = (): void => {
    const ds = currentDS;
    if (!ds) return;
    handleCommand('pop');
};
const handleQueueFront = (): void => {
    const ds = currentDS;
    if (!ds) return;
    handleCommand('top');
};

const handleHeapPush = (v: Record<string, string>): void => {
    if (!currentDS) return;
    handleCommand(`push ${Number(v.val ?? 0)}`);
};
const handleHeapPop = (): void => {
    if (!currentDS) return;
    handleCommand('pop');
};
const handleHeapTop = (): void => {
    if (!currentDS) return;
    handleCommand('top');
};

const handleHashAdd = (v: Record<string, string>): void => {
    if (!currentDS) return;
    handleCommand(`add ${Number(v.val ?? 0)}`);
};
const handleHashFind = (v: Record<string, string>): void => {
    if (!currentDS) return;
    handleCommand(`contains ${Number(v.val ?? 0)}`);
};
const handleHashRemove = (v: Record<string, string>): void => {
    if (!currentDS) return;
    handleCommand(`remove ${Number(v.val ?? 0)}`);
};

const handleDequePushFront = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    handleCommand(`pushFront ${Number(v.val ?? 0)}`);
};
const handleDequePushBack = (v: Record<string, string>): void => {
    const ds = currentDS;
    if (!ds) return;
    handleCommand(`pushBack ${Number(v.val ?? 0)}`);
};
const handleDequePopFront = (): void => {
    const ds = currentDS;
    if (!ds) return;
    handleCommand('popFront');
};
const handleDequePopBack = (): void => {
    const ds = currentDS;
    if (!ds) return;
    handleCommand('popBack');
};
const handleDequeGetFront = (): void => {
    const ds = currentDS;
    if (!ds) return;
    handleCommand('getFront');
};
const handleDequeGetBack = (): void => {
    const ds = currentDS;
    if (!ds) return;
    handleCommand('getBack');
};

const handleSegAdd = (v: Record<string, string>): void => {
    if (!currentDS) return;
    handleCommand(`add ${Number(v.l ?? 0)} ${Number(v.r ?? 0)} ${Number(v.val ?? 0)}`);
};
const handleSegQuery = (v: Record<string, string>): void => {
    if (!currentDS) return;
    handleCommand(`query ${Number(v.l ?? 0)} ${Number(v.r ?? 0)}`);
};
const handleSegReset = (): void => {
    handleCommand('reset');
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
    handleCommand(`init ${data.join(' ')}`);
};

const handleUnionFindUnion = (values: Record<string, string>): void => {
    if (!currentDS) return;
    handleCommand(`union ${Number(values.u ?? 0)} ${Number(values.v ?? 0)}`);
};
const handleUnionFindFind = (values: Record<string, string>): void => {
    if (!currentDS) return;
    handleCommand(`find ${Number(values.x ?? 0)}`);
};
const handleUnionFindSize = (values: Record<string, string>): void => {
    if (!currentDS) return;
    handleCommand(`getSize ${Number(values.x ?? 0)}`);
};
const handleUnionFindSame = (values: Record<string, string>): void => {
    if (!currentDS) return;
    handleCommand(`inSameSet ${Number(values.u ?? 0)} ${Number(values.v ?? 0)}`);
};
const handleUnionFindReset = (): void => {
    handleCommand('reset');
};
const handleUnionFindSetSize = (values: Record<string, string>): void => {
    handleCommand(`init ${Number(values.n)}`);
};

const handleBitAdd = (values: Record<string, string>): void => {
    if (!currentDS) return;
    handleCommand(`add ${Number(values.idx ?? 0)} ${Number(values.val ?? 0)}`);
};
const handleBitQuery = (values: Record<string, string>): void => {
    if (!currentDS) return;
    handleCommand(`query ${Number(values.l ?? 0)} ${Number(values.r ?? 0)}`);
};
const handleBitReset = (): void => {
    handleCommand('reset');
};
const handleBitSetSize = (values: Record<string, string>): void => {
    handleCommand(`init ${Number(values.n)}`);
};

const handleTrieInsert = (v: Record<string, string>): void => {
    if (!currentDS) return;
    const word = (v.word ?? '').trim();
    if (!word) return;
    handleCommand(`insert ${word}`);
};
const handleTrieFind = (v: Record<string, string>): void => {
    if (!currentDS) return;
    const word = (v.word ?? '').trim();
    if (!word) return;
    handleCommand(`find ${word}`);
};
const handleTriePrefix = (v: Record<string, string>): void => {
    if (!currentDS) return;
    const word = (v.word ?? '').trim();
    if (!word) return;
    handleCommand(`prefix ${word}`);
};
const handleTrieDelete = (v: Record<string, string>): void => {
    if (!currentDS) return;
    const word = (v.word ?? '').trim();
    if (!word) return;
    handleCommand(`delete ${word}`);
};

const handleGraphRun = (): void => {
    const key = currentMenu.value;
    if (!isGraphAlgorithm(key)) return;
    handleCommand(key === VisualizerType.DIJKSTRA ? 'execute 0' : 'execute');
};
const handleGraphSet = (v: Record<string, string>): void => {
    const key = currentMenu.value;
    if (!isGraphAlgorithm(key)) return;
    const result = parseGraphEdges(v.edges ?? '', !isDirectedGraph(key));
    if (result.error) {
        addMessage(result.error, MessageType.WARNING);
        return;
    }
    handleCommand(`setData ${result.edges.flat().join(' ')}`);
};

const handleGraphReset = (): void => {
    handleCommand('reset');
};

const handleSortSet = (v: Record<string, string>): void => {
    const raw = (v.sortInput ?? '').trim();
    if (raw === '') {
        addMessage('请输入有效数组（逗号分隔的数字）', MessageType.WARNING);
        return;
    }
    handleCommand(`setData ${raw}`);
};

const handleSortRun = (): void => {
    handleCommand('sort');
};
const handleSortReset = (): void => {
    handleCommand('reset');
};

const handleKMPSearch = (v: Record<string, string>): void => {
    const str = (v.str ?? lastKmpStr).trim();
    const template = (v.template ?? lastKmpTemplate).trim();
    if (str === '') {
        addMessage('主串不能为空', MessageType.WARNING);
        return;
    }
    const changed = str !== lastKmpStr || template !== lastKmpTemplate;
    handleCommand(changed
        ? `setData ${str}${template === '' ? '' : ' ' + template}\nsearch`
        : 'search');
};
/************************************************** */
// 二叉树遍�?
const handleTraversalSetData = (v: Record<string, string>): void => {
    const parsed = parseTraversalInput(v.traversalEdges ?? '');
    if (parsed.error !== null) {
        addMessage(parsed.error, MessageType.WARNING);
        return;
    }
    handleCommand(`setData ${parsed.values.join(' ')}`);
};
const handlePreOrder = (): void => {
    if (!currentDS) return;
    handleCommand('preOrderTraversal');
};
const handleInOrder = (): void => {
    if (!currentDS) return;
    handleCommand('inOrderTraversal');
};
const handlePostOrder = (): void => {
    if (!currentDS) return;
    handleCommand('postOrderTraversal');
};

/************************************************** */
// 清空 / 重新开�?
const handleClear = (): void => {
    const key = currentMenu.value;
    // 二分查找：重建页面
    if (key === VisualizerType.BINARY_SEARCH) {
        runOp(async () => {
            currentOp.value = OP.RESTART;
            DataNode.restart();
            visualizerManager.switchVisualizer(key);
            resetCanvasView();
            createDS(key);
            addMessage('已重新开始', MessageType.SUCCESS);
        });
        return;
    }
    // 二叉树遍历：通过命令行重建（保留自定义树）
    if (key === VisualizerType.BINARY_TREE_TRAVERSAL) {
        handleCommand('reset');
        return;
    }
    const ds = currentDS;
    if (!ds) return;
    if (isLinearListDS.value || isStackDS.value || isQueueDS.value || isDequeDS.value ||
        isTreeDS.value || isBinaryHeapDS.value || isHashDS.value || isTrieDS.value) {
        handleCommand('clear');
        return;
    }
    runOp(async () => {
        currentOp.value = OP.CLEAR;
        addMessage(`清空${menuTitle(key)}数据`, MessageType.INFO);
        try {
            await (ds as ArrayList | SinglyLinkedList | CircularLinkedList | DoubleLinkedList |
                BinarySearchTree | AVLTree | RedBlackTree | TreapTree | ScapegoatTree | Trie | ArrayStack | LinkedStack |
                ArrayQueue | LinkedQueue | ArrayDeque | LinkedDeque | BinaryHeap | HashTable).clear();
        } catch (error) {
            addOperationError('清空操作', error);
        }
        updateStats();
        stepController.setStatus(StepStatus.PAUSE_OR_FREE);
    });
};

/************************************************** */
// 二分查找：设置数据并重新开�?
const handleSetData = (v: Record<string, string>): void => {
    const input = (v.data ?? '').trim();
    if (input === '') {
        addMessage('请输入升序数组（逗号分隔）', MessageType.WARNING);
        return;
    }
    handleCommand(`setData ${input}`);
};

/************************************************** */
// 操作台配置（数据驱动，消除重复样板）
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
                hint: '每两个数 u v 表示 v 是 u 的父节点；第一个孩子为左孩子，第二个为右孩子',
                inputs: [],
                buttons: [
                    {
                        label: '设置数据',
                        icon: 'settings',
                        params: [traversalEdgesParam],
                        getInitial: () => ({ traversalEdges: traversalEdges?.join(' ') ?? '' }),
                        validate: (v) => validateTraversalInput(v.traversalEdges ?? ''),
                        onClick: handleTraversalSetData,
                    },
                    { label: '前序遍历', icon: 'list', onClick: handlePreOrder },
                    { label: '中序遍历', icon: 'list', onClick: handleInOrder },
                    { label: '后序遍历', icon: 'list', onClick: handlePostOrder },
                    { label: '重新开始', icon: 'rotate', onClick: handleClear },
                ],
            }];
        case VisualizerType.HASH_TABLE:
            return [{
                hint: '链地址法：数字键直接作为哈希值，桶下标 = (桶数量-1) & 哈希值',
                inputs: [{ key: 'val', placeholder: '键（整数）' }],
                buttons: [
                    { label: '插入键', icon: 'plus', params: [valParam], validate: (v) => validateHashKey(v.val ?? ''), onClick: handleHashAdd },
                    { label: '查找键', icon: 'search', params: [valParam], validate: (v) => validateHashKey(v.val ?? ''), onClick: handleHashFind },
                    { label: '删除键', icon: 'minus', params: [valParam], validate: (v) => validateHashKey(v.val ?? ''), onClick: handleHashRemove },
                    { label: '清空哈希表', icon: 'trash', onClick: handleClear },
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
                        validate: (v) => validateKmpMain(v.str ?? '') ?? validateKmpTemplate(v.template ?? ''),
                        onClick: handleKMPSearch,
                    },
                    { label: '重新开始', icon: 'rotate', onClick: () => handleCommand('reset') },
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
        case VisualizerType.BINARY_HEAP:
            return [{
                hint: '小根堆：父节点不大于孩子；数组下标从 1 开始，0 号位不使用',
                inputs: [{ key: 'val', placeholder: '数值' }],
                buttons: [
                    { label: '插入数据', icon: 'plus', params: [valParam], onClick: handleHeapPush },
                    { label: '弹出堆顶', icon: 'minus', onClick: handleHeapPop },
                    { label: '查看堆顶', icon: 'search', onClick: handleHeapTop },
                    { label: '清空堆', icon: 'trash', onClick: handleClear },
                ],
            }];
        case VisualizerType.ARRAY_DEQUE:
        case VisualizerType.LINKED_DEQUE:
            return [{
                inputs: [{ key: 'val', placeholder: '数值' }],
                buttons: [
                    { label: '头部入队', icon: 'plus', params: [valParam], onClick: handleDequePushFront },
                    { label: '尾部入队', icon: 'plus', params: [valParam], onClick: handleDequePushBack },
                    { label: '头部出队', icon: 'minus', onClick: handleDequePopFront },
                    { label: '尾部出队', icon: 'minus', onClick: handleDequePopBack },
                    { label: '取队首', icon: 'search', onClick: handleDequeGetFront },
                    { label: '取队尾', icon: 'search', onClick: handleDequeGetBack },
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

/************************************************** */
// 生命周期
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
    window.addEventListener('keydown', handleGlobalKeydown);
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
    window.removeEventListener('keydown', handleGlobalKeydown);
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
            @settings="openSettings"
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
                <div class="page-title-row">
                    <h1 class="page-title">{{ menuTitle(currentMenu) }}</h1>
                    <button
                        v-if="hasPageInfo"
                        type="button"
                        class="page-info-btn"
                        title="查看提示信息"
                        aria-label="查看提示信息"
                        @click="openPageInfo"
                    >i</button>
                </div>
            </div>
            <Teleport to="body">
                <div
                    v-if="pageInfoOpen"
                    class="page-info-overlay"
                    @pointerdown="onPageInfoPointerDown"
                    @click="onPageInfoClick"
                >
                    <div class="page-info-dialog" role="dialog" aria-modal="true" :aria-label="menuTitle(currentMenu)">
                        <h3 class="page-info-title">{{ menuTitle(currentMenu) }}</h3>
                        <div class="page-info-content">
                            <div v-if="currentPageInfo.info.trim() !== ''" class="page-info-summary">
                                <p class="page-info-text">{{ currentPageInfo.info }}</p>
                            </div>
                            <p v-if="currentPageInfo.notes.trim() !== ''" class="page-info-notes">{{ currentPageInfo.notes }}</p>
                        </div>
                        <div class="page-info-actions">
                            <button type="button" class="page-info-close" @click="pageInfoOpen = false">关闭</button>
                        </div>
                    </div>
                </div>
            </Teleport>
            <Teleport to="body">
                <div
                    v-if="settingsOpen"
                    class="settings-overlay"
                    @pointerdown="onSettingsPointerDown"
                    @click="onSettingsClick"
                >
                    <div class="settings-dialog" role="dialog" aria-modal="true" aria-label="设置">
                        <div class="settings-header">
                            <h3 class="settings-title">设置</h3>
                            <div class="settings-header-actions">
                                <span class="settings-persist-hint">设置保存至浏览器本地存储</span>
                                <button
                                    type="button"
                                    class="settings-reset-settings"
                                    @click="resetSettingsDrafts"
                                >恢复默认</button>
                            </div>
                        </div>
                        <div class="settings-content">
                            <div class="settings-section">
                                <label class="settings-field">
                                    <span class="settings-label">播放时间间隔</span>
                                    <span class="settings-input-row">
                                        <input
                                            v-model="settingsDraft"
                                            class="settings-input"
                                            type="number"
                                            min="0.1"
                                            max="10"
                                            step="0.1"
                                            inputmode="decimal"
                                            @input="settingsError = ''"
                                            @keydown.enter="applySettings"
                                        >
                                        <span class="settings-unit">秒</span>
                                    </span>
                                </label>
                                <p class="settings-hint">
                                    点击“播放”后，每执行一步等待的时间。允许范围 0.1 到 10 秒。
                                </p>
                            </div>
                            <div class="settings-section">
                                <label class="settings-field">
                                    <span class="settings-label">夜间模式</span>
                                    <button
                                        type="button"
                                        class="settings-switch"
                                        :class="{ on: themeDraft === 'dark' }"
                                        role="switch"
                                        :aria-checked="themeDraft === 'dark'"
                                        @click="toggleThemeDraft"
                                    >
                                        <span class="settings-switch-thumb"></span>
                                    </button>
                                </label>
                                <p class="settings-hint">
                                    开启后使用深色背景和浅色文字/图形。
                                </p>
                            </div>
                            <div class="settings-section">
                                <div class="settings-label">快捷键</div>
                                <div class="settings-shortcut-row">
                                    <span class="settings-shortcut-label">单步执行</span>
                                    <input
                                        readonly
                                        class="settings-shortcut-input"
                                        title="点击后按下快捷键"
                                        :value="shortcutDrafts.step"
                                        @keydown="captureShortcut('step', $event)"
                                    >
                                </div>
                                <div class="settings-shortcut-row">
                                    <span class="settings-shortcut-label">播放 / 暂停</span>
                                    <input
                                        readonly
                                        class="settings-shortcut-input"
                                        title="点击后按下快捷键"
                                        :value="shortcutDrafts.playPause"
                                        @keydown="captureShortcut('playPause', $event)"
                                    >
                                </div>
                                <div class="settings-shortcut-row">
                                    <span class="settings-shortcut-label">快速执行</span>
                                    <input
                                        readonly
                                        class="settings-shortcut-input"
                                        title="点击后按下快捷键"
                                        :value="shortcutDrafts.fast"
                                        @keydown="captureShortcut('fast', $event)"
                                    >
                                </div>
                                <p class="settings-hint">
                                    点击快捷键输入框后按下新的组合键，保存后生效；快捷键仅在输入框外触发。
                                </p>
                            </div>
                            <p v-if="settingsError !== ''" class="settings-error">{{ settingsError }}</p>
                        </div>
                        <div class="settings-actions">
                            <button type="button" class="settings-btn" @click="cancelSettings">取消</button>
                            <button type="button" class="settings-btn primary" @click="applySettings">保存</button>
                        </div>
                    </div>
                </div>
            </Teleport>
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
        <aside class="control-area" :style="controlStyle">
            <ControlPanel :groups="controlGroups" :current-menu="currentMenu" />
            <div
                class="splitter splitter-h command-splitter"
                :class="{ active: resizingTarget === 'command' }"
                role="separator"
                aria-orientation="horizontal"
                title="拖拽调整命令行高度"
                @pointerdown="beginResize('command', $event)"
                @pointermove="moveResize"
                @pointerup="endResize"
                @pointercancel="endResize"
            ></div>
            <CommandPanel
                :style="commandStyle"
                :lines="commandLines"
                :help="commandHelp"
                :running="opRunning"
                @submit="handleCommand"
                @clear="clearCommandLines"
            />
        </aside>
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
.control-area {
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: 100%;
    overflow: hidden;
    background: #f7f9fc;
}
.sidebar {
    width: 220px;
    min-width: 0;
    height: 100%;
    overflow: hidden;
    background: #f7f9fc;
    padding: 0;
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
.page-title-row {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    max-width: 100%;
}
.page-title {
    font-size: 24px;
    font-weight: 700;
    color: #000;
}
.page-info-btn {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 17px;
    height: 17px;
    padding: 0;
    color: #64748b;
    background: #fff;
    border: 1px solid #cfd8e3;
    border-radius: 50%;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 12px;
    font-style: italic;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.page-info-btn:hover {
    color: #2b6cb0;
    background: #eaf2fb;
    border-color: #2b6cb0;
}
.page-info-btn:focus-visible {
    outline: 2px solid #2b6cb0;
    outline-offset: 2px;
}
.page-info-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.35);
}
.page-info-dialog {
    display: flex;
    flex-direction: column;
    width: min(540px, calc(100vw - 32px));
    max-height: min(620px, calc(100vh - 48px));
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.24);
    font-family: 'JetBrains Mono', Consolas, 'Microsoft YaHei', monospace;
}
.page-info-title {
    margin-bottom: 14px;
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
}
.page-info-content {
    flex: 1;
    min-height: 80px;
    overflow-y: auto;
}
.page-info-summary {
    padding: 16px;
    color: #334155;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 15px;
    line-height: 1.75;
}
.page-info-text {
    margin: 0;
    color: #374151;
    font-size: 15px;
    line-height: 1.75;
    white-space: pre-wrap;
    word-break: break-word;
}
.page-info-notes {
    margin: 0 2px;
    color: #4a5568;
    font-size: 15px;
    line-height: 1.75;
    white-space: pre-wrap;
    word-break: break-word;
}
.page-info-summary + .page-info-notes {
    margin-top: 14px;
}
.page-info-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid #eef2f7;
}
.page-info-close {
    padding: 6px 16px;
    color: #374151;
    background: #fff;
    border: 1px solid #cfd8e3;
    border-radius: 5px;
    font-size: 14px;
    cursor: pointer;
}
.page-info-close:hover {
    color: #2b6cb0;
    border-color: #2b6cb0;
}
.settings-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.35);
}
.settings-dialog {
    display: flex;
    flex-direction: column;
    width: min(460px, calc(100vw - 32px));
    max-height: min(720px, calc(100vh - 48px));
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.24);
}
.settings-title {
    margin-bottom: 0;
    color: #1f2937;
    font-size: 18px;
    font-weight: 600;
}
.settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
}
.settings-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}
.settings-reset-settings {
    padding: 5px 10px;
    color: #374151;
    background: #fff;
    border: 1px solid #cfd8e3;
    border-radius: 5px;
    font-size: 12px;
    cursor: pointer;
}
.settings-reset-settings:hover {
    color: #2b6cb0;
    border-color: #2b6cb0;
}
.settings-content {
    flex: 1;
    min-height: 108px;
    overflow-y: auto;
    padding-right: 2px;
}
.settings-section + .settings-section {
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid #eef2f7;
}
.settings-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}
.settings-label {
    color: #374151;
    font-size: 15px;
}
.settings-input-row {
    display: inline-flex;
    align-items: center;
    gap: 7px;
}
.settings-input {
    width: 110px;
    padding: 7px 10px;
    color: #1f2937;
    background: #fff;
    border: 1px solid #cfd8e3;
    border-radius: 5px;
    outline: none;
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 14px;
}
.settings-input:focus {
    border-color: #2b6cb0;
    box-shadow: 0 0 0 2px rgba(43, 108, 176, 0.14);
}
.settings-unit {
    color: #64748b;
    font-size: 14px;
}
.settings-switch {
    position: relative;
    flex: none;
    width: 44px;
    height: 24px;
    padding: 0;
    background: #cbd5e1;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.15s;
}
.settings-switch.on {
    background: #2b6cb0;
}
.settings-switch-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
    transition: transform 0.15s;
}
.settings-switch.on .settings-switch-thumb {
    transform: translateX(20px);
}
.settings-switch:focus-visible {
    outline: 2px solid #2b6cb0;
    outline-offset: 2px;
}
.settings-shortcut-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 10px;
}
.settings-shortcut-label {
    color: #4b5563;
    font-size: 14px;
}
.settings-shortcut-input {
    width: 160px;
    padding: 7px 10px;
    color: #1f2937;
    background: #fff;
    border: 1px solid #cfd8e3;
    border-radius: 5px;
    outline: none;
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 13px;
    text-align: center;
    cursor: pointer;
}
.settings-shortcut-input:focus {
    border-color: #2b6cb0;
    box-shadow: 0 0 0 2px rgba(43, 108, 176, 0.14);
}
.settings-hint {
    margin-top: 10px;
    color: #64748b;
    font-size: 13px;
    line-height: 1.6;
}
.settings-error {
    margin-top: 8px;
    color: #dc2626;
    font-size: 13px;
}
.settings-persist-hint {
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.5;
    white-space: nowrap;
}
.settings-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid #eef2f7;
}
.settings-btn {
    padding: 7px 16px;
    color: #374151;
    background: #fff;
    border: 1px solid #cfd8e3;
    border-radius: 5px;
    font-size: 14px;
    cursor: pointer;
}
.settings-btn:hover {
    color: #2b6cb0;
    border-color: #2b6cb0;
}
.settings-btn.primary {
    color: #fff;
    background: #2b6cb0;
    border-color: #2b6cb0;
}
.settings-btn.primary:hover {
    background: #24598f;
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
<style>
/* 夜间模式 */
html[data-theme='dark'] {
    color-scheme: dark;
    background: #0b1220;
}

html[data-theme='dark'] body,
html[data-theme='dark'] #app {
    color: #e5e7eb;
    background: #0b1220;
}

html[data-theme='dark'] .app-container,
html[data-theme='dark'] .main-area {
    background: #0b1220;
}

html[data-theme='dark'] .sidebar,
html[data-theme='dark'] .control-area,
html[data-theme='dark'] .control-panel,
html[data-theme='dark'] .command-panel {
    background: #0f172a;
    color: #cbd5e1;
}

html[data-theme='dark'] .top-header {
    background: #111827;
    border-bottom-color: #1f2937;
}

html[data-theme='dark'] .page-title,
html[data-theme='dark'] .menu-title {
    color: #f3f4f6;
}

html[data-theme='dark'] .menu-group {
    color: #e5e7eb;
}

html[data-theme='dark'] .menu-group:hover,
html[data-theme='dark'] .menu-leaf:hover,
html[data-theme='dark'] .menu-settings:hover {
    color: #93c5fd;
    background: #1e293b;
}

html[data-theme='dark'] .menu-leaf {
    color: #cbd5e1;
}

html[data-theme='dark'] .menu-leaf.active {
    color: #93c5fd;
    background: #1e3a5f;
    border-left-color: #60a5fa;
}

html[data-theme='dark'] .menu-settings {
    color: #94a3b8;
}

html[data-theme='dark'] .canvas-container,
html[data-theme='dark'] .canvas-viewport {
    background: #0b1220;
}

html[data-theme='dark'] .canvas-svg {
    background: transparent !important;
    filter: invert(1) hue-rotate(180deg) brightness(1.12);
}

html[data-theme='dark'] .splitter::after {
    background: #334155;
}

html[data-theme='dark'] .splitter:hover::after,
html[data-theme='dark'] .splitter.active::after {
    background: #60a5fa;
}

html[data-theme='dark'] .panel-title,
html[data-theme='dark'] .command-title,
html[data-theme='dark'] .command-header,
html[data-theme='dark'] .message-header,
html[data-theme='dark'] .message-clear {
    color: #cbd5e1;
}

html[data-theme='dark'] .action-btn,
html[data-theme='dark'] .control-btn,
html[data-theme='dark'] .canvas-zoom,
html[data-theme='dark'] .dialog-btn.secondary,
html[data-theme='dark'] .dialog-random,
html[data-theme='dark'] .page-info-btn,
html[data-theme='dark'] .page-info-close,
html[data-theme='dark'] .settings-btn,
html[data-theme='dark'] .settings-reset-settings,
html[data-theme='dark'] .settings-shortcut-input,
html[data-theme='dark'] .settings-input,
html[data-theme='dark'] .command-help-btn {
    color: #cbd5e1;
    background: #1e293b;
    border-color: #475569;
}

html[data-theme='dark'] .action-btn:hover,
html[data-theme='dark'] .control-btn:hover,
html[data-theme='dark'] .canvas-zoom:hover,
html[data-theme='dark'] .dialog-btn.secondary:hover,
html[data-theme='dark'] .dialog-random:hover,
html[data-theme='dark'] .page-info-btn:hover,
html[data-theme='dark'] .page-info-close:hover,
html[data-theme='dark'] .settings-btn:hover,
html[data-theme='dark'] .settings-reset-settings:hover,
html[data-theme='dark'] .command-help-btn:hover {
    color: #93c5fd;
    background: #243449;
    border-color: #60a5fa;
}

html[data-theme='dark'] .settings-btn.primary,
html[data-theme='dark'] .dialog-btn.primary,
html[data-theme='dark'] .command-help-close {
    color: #f8fafc;
    background: #2563eb;
    border-color: #2563eb;
}

html[data-theme='dark'] .settings-btn.primary:hover,
html[data-theme='dark'] .dialog-btn.primary:hover,
html[data-theme='dark'] .command-help-close:hover {
    background: #1d4ed8;
}

html[data-theme='dark'] .control-btn:hover,
html[data-theme='dark'] .command-clear,
html[data-theme='dark'] .message-clear {
    color: #94a3b8;
}

html[data-theme='dark'] .command-clear:hover,
html[data-theme='dark'] .message-clear:hover {
    color: #93c5fd;
    background: #1e293b;
}

html[data-theme='dark'] .message-panel {
    background: #111827;
}

html[data-theme='dark'] .message-header {
    border-bottom-color: #1f2937;
}

html[data-theme='dark'] .message-item {
    color: #cbd5e1;
}

html[data-theme='dark'] .message-item.is-warning {
    color: #fbbf24;
}

html[data-theme='dark'] .message-item.is-error {
    color: #f87171;
}

html[data-theme='dark'] .message-item.is-success {
    color: #4ade80;
}

html[data-theme='dark'] .message-item.is-new {
    animation: none;
}

html[data-theme='dark'] .stats-panel,
html[data-theme='dark'] .operation-panel,
html[data-theme='dark'] .step-controls {
    color: #e5e7eb;
    background: rgba(17, 24, 39, 0.92);
    border-color: #334155;
}

html[data-theme='dark'] .operation-label {
    color: #94a3b8;
}

html[data-theme='dark'] .operation-value {
    color: #e5e7eb;
}

html[data-theme='dark'] .operation-panel.is-result .operation-label,
html[data-theme='dark'] .operation-panel.is-result .operation-value {
    color: #4ade80;
}

html[data-theme='dark'] .command-panel {
    border-top-color: #334155;
}

html[data-theme='dark'] .command-header,
html[data-theme='dark'] .command-history,
html[data-theme='dark'] .command-input-row {
    color: #cbd5e1;
}

html[data-theme='dark'] .command-echo,
html[data-theme='dark'] .command-output {
    color: #e5e7eb;
}

html[data-theme='dark'] .command-info {
    color: #94a3b8;
}

html[data-theme='dark'] .command-error {
    color: #f87171;
}

html[data-theme='dark'] .command-prompt {
    color: #60a5fa;
}

html[data-theme='dark'] .command-input-row {
    background: #0f172a;
    border-top-color: #334155;
}

html[data-theme='dark'] .command-input {
    color: #e5e7eb;
    background: transparent;
}

html[data-theme='dark'] .command-input::placeholder {
    color: #94a3b8;
}

html[data-theme='dark'] .dialog,
html[data-theme='dark'] .command-help-dialog,
html[data-theme='dark'] .page-info-dialog,
html[data-theme='dark'] .settings-dialog {
    color: #cbd5e1;
    background: #111827;
}

html[data-theme='dark'] .dialog-title,
html[data-theme='dark'] .command-help-title,
html[data-theme='dark'] .page-info-title,
html[data-theme='dark'] .settings-title {
    color: #f3f4f6;
}

html[data-theme='dark'] .dialog-field,
html[data-theme='dark'] .settings-label,
html[data-theme='dark'] .settings-shortcut-label {
    color: #cbd5e1;
}

html[data-theme='dark'] .dialog-field input,
html[data-theme='dark'] .dialog-field textarea,
html[data-theme='dark'] .settings-input,
html[data-theme='dark'] .settings-shortcut-input {
    color: #e5e7eb;
    background: #0f172a;
    border-color: #475569;
}

html[data-theme='dark'] .dialog-field input:focus,
html[data-theme='dark'] .dialog-field textarea:focus,
html[data-theme='dark'] .settings-input:focus,
html[data-theme='dark'] .settings-shortcut-input:focus {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.18);
}

html[data-theme='dark'] .dialog-error,
html[data-theme='dark'] .settings-error {
    color: #f87171;
}

html[data-theme='dark'] .command-help-content,
html[data-theme='dark'] .page-info-summary {
    color: #cbd5e1;
    background: #1e293b;
    border-color: #334155;
}

html[data-theme='dark'] .command-help-subtitle,
html[data-theme='dark'] .command-help-code {
    color: #f3f4f6;
}

html[data-theme='dark'] .command-help-desc,
html[data-theme='dark'] .command-help-note,
html[data-theme='dark'] .page-info-text,
html[data-theme='dark'] .page-info-notes {
    color: #cbd5e1;
}

html[data-theme='dark'] .command-help-actions,
html[data-theme='dark'] .page-info-actions,
html[data-theme='dark'] .settings-actions,
html[data-theme='dark'] .settings-section + .settings-section {
    border-top-color: #334155;
}

html[data-theme='dark'] .settings-hint,
html[data-theme='dark'] .settings-unit,
html[data-theme='dark'] .settings-persist-hint {
    color: #94a3b8;
}

html[data-theme='dark'] .settings-switch {
    background: #475569;
}

html[data-theme='dark'] .settings-switch.on {
    background: #3b82f6;
}

html[data-theme='dark'] .settings-switch-thumb {
    background: #f8fafc;
}

html[data-theme='dark'] .page-info-actions {
    border-top-color: #334155;
}
</style>
