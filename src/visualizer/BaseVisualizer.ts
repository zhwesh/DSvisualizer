import * as d3 from 'd3';

/**
 * 可视化器基类
 * 每个数据结构对应一个具体的Visualizer
 */
export abstract class BaseVisualizer {
    protected svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    protected mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
        this.svg = svg;
        this.mainGroup = svg.append('g').attr('class', 'main-group');
    }

    /**
     * 处理原子操作回调
     * @param node 触发操作的节点
     * @param method 方法名
     * @param args 参数
     */
    abstract onOp(node: object, method: string, args: unknown[]): void;

    /**
     * 清空画布
     */
    clear(): void {
        this.mainGroup.interrupt();
        this.mainGroup.selectAll('*').interrupt();
        this.mainGroup.selectAll('*').remove();
    }

    /**
     * 销毁可视化器，释放资源
     */
    destroy(): void {
        this.clear();
        this.mainGroup.remove();
    }
}
