import * as d3 from 'd3';
import { setOpHook } from '../node/factory';
import { DataNode } from '../node/DataNode';
import { BaseVisualizer } from './BaseVisualizer';
import { ArrayVisualizer } from './ArrayVisualizer';
import { LinkedListVisualizer } from './LinkedListVisualizer';
import { TreeVisualizer } from './TreeVisualizer';
import { BinarySearchVisualizer } from './BinarySearchVisualizer';
import { GraphVisualizer } from './GraphVisualizer';
import { SortVisualizer } from './SortVisualizer';
import { KMPVisualizer } from './KMPVisualizer';

/**
 * 可视化器类型（值即类型，兼容 erasableSyntaxOnly）
 */
export const VisualizerType = {
    ARRAY_LIST: 'array_list',
    SINGLY_LINKED_LIST: 'singly_linked_list',
    CIRCULAR_LINKED_LIST: 'circular_linked_list',
    DOUBLE_LINKED_LIST: 'double_linked_list',
    STACK: 'stack',
    QUEUE: 'queue',
    BST: 'bst',
    AVL: 'avl',
    RED_BLACK: 'red_black',
    BINARY_SEARCH: 'binary_search',
    BINARY_TREE_TRAVERSAL: 'binary_tree_traversal',
    SEGMENT_TREE: 'segment_tree',
    ARRAY_QUEUE: 'array_queue',
    ARRAY_DEQUE: 'array_deque',
    ARRAY_STACK: 'array_stack',
    TRIE: 'trie',
    DIJKSTRA: 'dijkstra',
    FLOYD: 'floyd',
    PRIM: 'prim',
    KRUSKAL: 'kruskal',
    BUBBLE_SORT: 'bubble_sort',
    INSERTION_SORT: 'insertion_sort',
    MERGE_SORT: 'merge_sort',
    QUICK_SORT: 'quick_sort',
    KMP: 'kmp',
} as const;

export type VisualizerType = typeof VisualizerType[keyof typeof VisualizerType];

/**
 * 全局可视化管理器
 * 负责注册opHook、管理当前活跃的visualizer、切换数据结构视图
 */
export class VisualizerManager {
    private static instance: VisualizerManager | null = null;

    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
    private currentVisualizer: BaseVisualizer | null = null;
    private currentType: VisualizerType | null = null;
    private binarySearchPointerListener: ((left: number, right: number, mid: number) => void) | null = null;

    private constructor() {}

    public static getInstance(): VisualizerManager {
        if (!VisualizerManager.instance) {
            VisualizerManager.instance = new VisualizerManager();
        }
        return VisualizerManager.instance;
    }

    /**
     * 初始化：绑定SVG容器，注册全局opHook
     * @param svgElement SVG DOM元素
     */
    init(svgElement: SVGSVGElement): void {
        this.svg = d3.select(svgElement);
        // 设置SVG默认样式
        this.svg
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', '0 0 1200 600')
            .style('background', '#fafafa');

        // 注册全局opHook
        setOpHook((target: object, method: string, args: any[]) => {
            this.handleOp(target as DataNode, method, args);
        });
    }

    /**
     * 切换可视化类型
     * @param type 新的可视化类型
     */
    switchVisualizer(type: VisualizerType): void {
        if (!this.svg) {
            throw new Error('VisualizerManager not initialized');
        }

        // 销毁旧的可视化器
        if (this.currentVisualizer) {
            this.currentVisualizer.destroy();
            this.currentVisualizer = null;
        }

        // 重置视图：树/链表会按自身包围盒自适应viewBox，
        // 若沿用上一个可视化器的viewBox，数组、图等会被裁切到画布之外
        this.svg.attr('viewBox', '0 0 1200 600');

        this.currentType = type;

        // 创建新的可视化器
        switch (type) {
            case VisualizerType.ARRAY_LIST:
                this.currentVisualizer = new ArrayVisualizer(this.svg);
                break;
            case VisualizerType.SINGLY_LINKED_LIST:
            case VisualizerType.CIRCULAR_LINKED_LIST:
            case VisualizerType.DOUBLE_LINKED_LIST:
                this.currentVisualizer = new LinkedListVisualizer(this.svg);
                break;
            case VisualizerType.BST:
            case VisualizerType.AVL:
            case VisualizerType.RED_BLACK:
            case VisualizerType.BINARY_TREE_TRAVERSAL:
                this.currentVisualizer = new TreeVisualizer(this.svg);
                break;
            case VisualizerType.BINARY_SEARCH: {
                const visualizer = new BinarySearchVisualizer(this.svg);
                visualizer.setPointerListener(this.binarySearchPointerListener);
                this.currentVisualizer = visualizer;
                break;
            }
            case VisualizerType.ARRAY_QUEUE:
            case VisualizerType.ARRAY_DEQUE:
            case VisualizerType.ARRAY_STACK:
                this.currentVisualizer = new ArrayVisualizer(this.svg);
                break;
            case VisualizerType.SEGMENT_TREE:
            case VisualizerType.TRIE:
                this.currentVisualizer = new TreeVisualizer(this.svg);
                break;
            case VisualizerType.DIJKSTRA:
            case VisualizerType.FLOYD:
            case VisualizerType.PRIM:
            case VisualizerType.KRUSKAL:
                this.currentVisualizer = new GraphVisualizer(this.svg);
                break;
            case VisualizerType.BUBBLE_SORT:
            case VisualizerType.INSERTION_SORT:
            case VisualizerType.MERGE_SORT:
            case VisualizerType.QUICK_SORT:
                this.currentVisualizer = new SortVisualizer(this.svg);
                break;
            case VisualizerType.KMP:
                this.currentVisualizer = new KMPVisualizer(this.svg);
                break;
            default:
                console.warn('未知的可视化类型：', type);
        }
    }

    /**
     * 注册二分查找指针变化监听器
     * @param listener 监听器，传null表示清除
     */
    setBinarySearchPointerListener(listener: ((left: number, right: number, mid: number) => void) | null): void {
        this.binarySearchPointerListener = listener;
        if (this.currentVisualizer instanceof BinarySearchVisualizer) {
            this.currentVisualizer.setPointerListener(listener);
        }
    }

    /**
     * 获取当前可视化类型
     */
    getCurrentType(): VisualizerType | null {
        return this.currentType;
    }

    /**
     * 获取当前可视化器实例
     */
    getCurrentVisualizer(): BaseVisualizer | null {
        return this.currentVisualizer;
    }

    /**
     * 处理原子操作回调（全局分发）
     */
    private handleOp(node: DataNode, method: string, args: any[]): void {
        if (this.currentVisualizer) {
            this.currentVisualizer.onOp(node, method, args);
        }
    }

    /**
     * 清空画布
     */
    clear(): void {
        if (this.currentVisualizer) {
            this.currentVisualizer.clear();
        }
    }
}
