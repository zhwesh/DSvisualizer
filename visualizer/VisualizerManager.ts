import * as d3 from 'd3';
import { setOpHook } from '../node/factory';
import { DataNode } from '../node/DataNode';
import { BaseVisualizer } from './BaseVisualizer';
import { ArrayVisualizer } from './ArrayVisualizer';
import { LinkedListVisualizer } from './LinkedListVisualizer';
import { TreeVisualizer } from './TreeVisualizer';
import { BinarySearchVisualizer } from './BinarySearchVisualizer';

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
        setOpHook((node: DataNode, method: string, args: any[]) => {
            this.handleOp(node, method, args);
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
            case VisualizerType.BINARY_SEARCH:
                this.currentVisualizer = new BinarySearchVisualizer(this.svg);
                break;
            default:
                console.warn('Unknown visualizer type:', type);
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
