import * as d3 from 'd3';
import { setOpHook } from '../node/factory';
import { BaseVisualizer } from './BaseVisualizer';
import { BinarySearchVisualizer } from './BinarySearchVisualizer';
import { VisualizerType } from './VisualizerType';
import { REGISTRY } from './registry';

export { VisualizerType } from './VisualizerType';
export type { VisualizerType as VisualizerTypeValue } from './VisualizerType';

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
        setOpHook((target: object, method: string, args: unknown[]) => {
            this.handleOp(target, method, args);
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

        // 通过注册表创建可视化器
        const entry = REGISTRY[type];
        if (!entry) {
            console.warn('未知的可视化类型：', type);
            return;
        }
        const visualizer = new entry.visualizer(this.svg);
        if (visualizer instanceof BinarySearchVisualizer) {
            visualizer.setPointerListener(this.binarySearchPointerListener);
        }
        this.currentVisualizer = visualizer;
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
    private handleOp(node: object, method: string, args: unknown[]): void {
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
