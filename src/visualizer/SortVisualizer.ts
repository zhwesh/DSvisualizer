import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
import { ArrayNode } from '../node/ArrayNode/ArrayNode';
import { QuickSortNode } from '../node/ArrayNode/impl/QuickSortNode';
import { BubbleSortNode } from '../node/ArrayNode/impl/BubbleSortNode';
import { InsertionSortNode } from '../node/ArrayNode/impl/InsertionSortNode';
import { MergeSortNode } from '../node/ArrayNode/impl/MergeSortNode';

// 排序算法节点联合类型（均有 color 染色数组）
type SortArrayNode = QuickSortNode | BubbleSortNode | InsertionSortNode | MergeSortNode;

const COLOR_ITEM = '#ffffff';
const COLOR_ACTIVE = '#2ecc71';
const COLOR_TEXT = '#2c3e50';
const COLOR_BORDER = '#95a5a6';
const COLOR_PIVOT = '#e74c3c';

/**
 * 排序可视化器（冒泡/插入/归并/快速排序）
 * - 数组 → 方框 + 数值（居中显示），整体居中
 * - color[i] 为 true 的方框染绿色（当前比较）
 * - QuickSort 额外渲染枢轴（红色边框 + P 标记）
 * - _swap_value / _set_value 触发数值文本过渡动画
 */
export class SortVisualizer extends BaseVisualizer {
    private ds: ArrayNode | null = null;
    private previewData: (number | null)[] | null = null;   // 未执行时的预览数据

    private static readonly CANVAS_W = 1200;
    private static readonly NODE_W = 46;   // 单格宽
    private static readonly NODE_H = 46;   // 单格高

    constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
        super(svg);
    }

    /**
     * 预览模式：外部传入数组直接渲染（不绑定算法节点）
     */
    public preview(data: number[]): void {
        this.previewData = data;
        this.render();
    }

    /**
     * 当前绑定节点是否为排序节点（含 color 数组）
     */
    private get sortNode(): SortArrayNode | null {
        const ds = this.ds;
        if (ds instanceof QuickSortNode || ds instanceof BubbleSortNode ||
            ds instanceof InsertionSortNode || ds instanceof MergeSortNode) {
            return ds;
        }
        return null;
    }

    onOp(node: object, method: string, args: unknown[]): void {
        if (method === '_create') {
            // 只绑定第一个数组（主数组；归并的临时数组忽略）
            if (node instanceof ArrayNode && !this.ds) {
                this.ds = node;
            }
            this.render();
            return;
        }
        if (!this.ds) return;
        switch (method) {
            case '_set_color':
                this.animateColor(args[0] as number);
                break;
            case '_swap_value':
                this.animateSwap(args[0] as number, args[2] as number);
                break;
            case '_set_value':
                this.animateValue(args[0] as number);
                break;
            case '_set_pivot':
                this.render();
                break;
            case '_clear_color':
                this.render();
                break;
            case '_add_value':
            case '_delete':
            case '_clear':
                break;
            default:
                break;
        }
    }

    private render(): void {
        if (!this.ds && !this.previewData) {
            this.mainGroup.selectAll('*').remove();
            return;
        }
        this.mainGroup.selectAll('*').remove();
        const data: (number | null)[] = (this.ds && this.ds.data) || this.previewData || [];
        const n = data.length;
        if (n === 0) {
            this.svg.attr('viewBox', '0 0 400 200');
            return;
        }

        const totalW = n * SortVisualizer.NODE_W;
        const x0 = (SortVisualizer.CANVAS_W - totalW) / 2;
        const yBase = 230; // 方框行中心

        for (let i = 0; i < n; ++i) {
            const v = data[i];
            const sortDs = this.sortNode;
            const isActive = (sortDs?.color?.[i] ?? false) === true;
            const isPivot = this.ds instanceof QuickSortNode && this.ds.pivot === i;
            const g = this.mainGroup.append('g')
                .attr('class', 'sort-item')
                .attr('data-idx', i);
            // 方框
            g.append('rect')
                .attr('class', 'sort-bar')
                .attr('data-idx', i)
                .attr('x', x0 + i * SortVisualizer.NODE_W + 2)
                .attr('y', yBase - SortVisualizer.NODE_H / 2)
                .attr('width', SortVisualizer.NODE_W - 4)
                .attr('height', SortVisualizer.NODE_H - 4)
                .attr('fill', isActive ? COLOR_ACTIVE : COLOR_ITEM)
                .attr('stroke', isPivot ? COLOR_PIVOT : COLOR_BORDER)
                .attr('stroke-width', isPivot ? 3 : 1.5)
                .attr('rx', 4);
            // 数值文本（居中）
            g.append('text')
                .attr('class', 'sort-val')
                .attr('data-idx', i)
                .attr('x', x0 + i * SortVisualizer.NODE_W + SortVisualizer.NODE_W / 2)
                .attr('y', yBase + 5)
                .attr('text-anchor', 'middle')
                .style('font-size', '17px')
                .style('font-family', 'monospace')
                .style('font-weight', 'bold')
                .style('fill', COLOR_TEXT)
                .text(v === null || v === undefined ? '' : String(v));
            // 枢轴标记
            if (isPivot) {
                g.append('text')
                    .attr('class', 'sort-pivot-tag')
                    .attr('x', x0 + i * SortVisualizer.NODE_W + SortVisualizer.NODE_W / 2)
                    .attr('y', yBase + SortVisualizer.NODE_H / 2 + 16)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '13px')
                    .style('font-weight', 'bold')
                    .style('fill', COLOR_PIVOT)
                    .text('P');
            }
        }
        this.fitViewBox();
    }

    /**
     * 单方框颜色过渡
     */
    private animateColor(i: number): void {
        const sortDs = this.sortNode;
        if (!sortDs) return;
        const bar = this.mainGroup.select(`rect.sort-bar[data-idx="${i}"]`);
        if (!bar.empty()) {
            bar.transition()
                .duration(160)
                .attr('fill', sortDs.color?.[i] ? COLOR_ACTIVE : COLOR_ITEM);
        }
    }

    /**
     * 值交换动画（数值文本过渡）
     */
    private animateSwap(_a: number, _b: number): void {
        if (!this.ds) return;
        this.updateBars();
    }

    /**
     * 单值更新动画
     */
    private animateValue(_i: number): void {
        if (!this.ds) return;
        this.updateBars();
    }

    /**
     * 按当前 data 全量更新数值文本与颜色（位置固定）
     */
    private updateBars(): void {
        if (!this.ds) return;
        const data: (number | null)[] = this.ds.data || [];
        const n = data.length;
        if (n === 0) {
            this.render();
            return;
        }
        // 如果长度变化（归并写回后），全量重渲染
        if (this.mainGroup.selectAll('rect.sort-bar').size() !== n) {
            this.render();
            return;
        }
        for (let i = 0; i < n; ++i) {
            const v = data[i];
            const sortDs = this.sortNode;
            const isActive = (sortDs?.color?.[i] ?? false) === true;
            const isPivot = this.ds instanceof QuickSortNode && this.ds.pivot === i;
            const bar = this.mainGroup.select(`rect.sort-bar[data-idx="${i}"]`);
            const val = this.mainGroup.select(`text.sort-val[data-idx="${i}"]`);
            if (!bar.empty()) {
                bar.transition().duration(160)
                    .attr('fill', isActive ? COLOR_ACTIVE : COLOR_ITEM)
                    .attr('stroke', isPivot ? COLOR_PIVOT : COLOR_BORDER)
                    .attr('stroke-width', isPivot ? 3 : 1.5);
            }
            if (!val.empty()) {
                val.transition().duration(160)
                    .text(v === null || v === undefined ? '' : String(v));
            }
        }
    }

    /**
     * 自适应居中
     */
    private fitViewBox(): void {
        const data = (this.ds && this.ds.data) || this.previewData || [];
        if (!data.length) {
            this.svg.attr('viewBox', '0 0 400 200');
            return;
        }
        const n = data.length;
        const totalW = n * SortVisualizer.NODE_W;
        const x0 = (SortVisualizer.CANVAS_W - totalW) / 2;
        const x1 = x0 + totalW;
        this.svg.attr('viewBox', `${Math.max(0, x0 - 20)} 30 ${Math.min(SortVisualizer.CANVAS_W, x1 - x0 + 40)} 460`);
    }

    clear(): void {
        super.clear();
        this.ds = null;
        this.previewData = null;
    }
}
