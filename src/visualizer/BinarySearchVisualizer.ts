import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
import { BinarySearchNode } from '../node/ArrayNode/impl/BinarySearchNode';

const COLOR_MID = '#ffeaa7';     // mid 高亮
const COLOR_RANGE = '#dfe6e9';   // 搜索范围底色

/**
 * 二分查找可视化器
 * 显示数组 + left/right/mid 三个指针，并高亮当前 mid 单元格
 */
export class BinarySearchVisualizer extends BaseVisualizer {
    private arrNode: BinarySearchNode | null = null;
    private group: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

    // 暴露当前变量值供UI显示
    public currentLeft: number | null = null;
    public currentRight: number | null = null;
    public currentMid: number | null = null;

    // 指针变化回调，避免页面层轮询
    private pointerListener: ((left: number, right: number, mid: number) => void) | null = null;

    /**
     * 注册或清除指针变化监听器
     * @param listener 监听器，传null表示清除
     */
    public setPointerListener(listener: ((left: number, right: number, mid: number) => void) | null): void {
        this.pointerListener = listener;
        this.notifyPointers();
    }

    private notifyPointers(): void {
        if (this.pointerListener !== null &&
            this.currentLeft !== null && this.currentRight !== null && this.currentMid !== null) {
            this.pointerListener(this.currentLeft, this.currentRight, this.currentMid);
        }
    }

    private static readonly CELL_WIDTH = 40;
    private static readonly CELL_HEIGHT = 40;
    // 数组左右至少留出的边距（保证整行不贴边、不超出画布边界）
    private static readonly MARGIN = 60;
    private static readonly START_Y = 255;
    private static readonly CANVAS_W = 1200;

    onOp(node: object, method: string, _args: unknown[]): void {
        if (!(node instanceof BinarySearchNode)) {
            return;
        }

        switch (method) {
            case '_create':
                this.handleCreate(node);
                break;
            case '_set_left':
            case '_set_right':
            case '_set_mid':
                this.render();
                break;
            default:
                break;
        }
    }

    private handleCreate(node: BinarySearchNode): void {
        this.arrNode = node;
        this.group = this.mainGroup.append('g').attr('class', 'binary-search-group');
        if (this.mainGroup.select('#bs-pointer-arrow').empty()) {
            this.mainGroup.append('defs').append('marker')
                .attr('id', 'bs-pointer-arrow')
                .attr('viewBox', '0 0 10 10')
                .attr('refX', 9)
                .attr('refY', 5)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M 0 0 L 10 5 L 0 10 z')
                .attr('fill', '#2196F3');
        }
        this.render();
    }

    private render(): void {
        if (!this.arrNode || !this.group) return;
        const node = this.arrNode;
        const g = this.group;
        const data = node.data;

        // 更新暴露的变量值
        this.currentLeft = node.left;
        this.currentRight = node.right;
        this.currentMid = node.mid;
        this.notifyPointers();

        const cellH = BinarySearchVisualizer.CELL_HEIGHT;

        // 数组较长时按可用宽度收缩单元格：保证整行（含左右边距）不超出画布边界
        const maxRowW = BinarySearchVisualizer.CANVAS_W - BinarySearchVisualizer.MARGIN * 2;
        const cellW = data.length > 0
            ? Math.min(BinarySearchVisualizer.CELL_WIDTH, maxRowW / data.length)
            : BinarySearchVisualizer.CELL_WIDTH;
        // 字号跟随格子宽度缩放，避免收缩后数字相互重叠
        const fontSize = Math.max(9, Math.min(13, cellW * 0.5));

        // 数组整体以画布中心水平居中（缩小后依然保持居中）
        const totalW = data.length * cellW;
        const startX = (BinarySearchVisualizer.CANVAS_W - totalW) / 2;
        const startY = BinarySearchVisualizer.START_Y;

        // 1. 渲染数组单元格
        const cells = g.selectAll<SVGGElement, number | null>('.bs-cell')
            .data<number | null>(data, (_d: number | null, i: number) => i);

        const enterCells = cells.enter()
            .append('g')
            .attr('class', 'bs-cell');

        enterCells.append('rect')
            .attr('class', 'bs-cell-rect')
            .attr('height', cellH)
            .attr('fill', '#fff')
            .attr('stroke', '#666')
            .attr('stroke-width', 1.5);

        enterCells.append('text')
            .attr('class', 'cell-value')
            .attr('text-anchor', 'middle')
            .attr('y', cellH / 2 + 5)
            .style('font-family', 'monospace');

        // enter与update统一更新：位置、宽度、字号、范围底色与mid高亮
        const merged = enterCells.merge(cells);

        merged.attr('transform', (_d: number | null, i: number) => `translate(${startX + i * cellW}, ${startY})`);

        merged.select('.bs-cell-rect')
            .attr('width', cellW)
            .attr('fill', (_d: number | null, i: number) => {
                const inRange = node.left !== null && node.right !== null && i >= node.left && i <= node.right;
                if (node.mid !== null && i === node.mid) return COLOR_MID;
                return inRange ? COLOR_RANGE : '#fff';
            });

        merged.select('.cell-value')
            .attr('x', cellW / 2)
            .style('font-size', fontSize + 'px')
            .text((d: number | null) => d !== null ? String(d) : '');

        cells.exit().remove();

        // 2. 先移除旧的指针
        g.selectAll('.pointer').remove();

        // 3. 渲染指针；left 与 right 重合时共用一个箭头，指针名纵向排列
        const sameLR = node.left !== null && node.right !== null && node.left === node.right;
        if (sameLR) {
            this.renderSharedPointer(g, node.left, ['left', 'right'], startX, startY, cellW, cellH, '#2196F3');
        } else {
            this.renderPointer(g, node.left, 'left', startX, startY, cellW, cellH, '#2196F3');
            this.renderPointer(g, node.right, 'right', startX, startY, cellW, cellH, '#2196F3');
        }
        this.renderPointer(g, node.mid, 'mid', startX, startY, cellW, cellH, '#2196F3');
    }

    private renderSharedPointer(
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        idx: number | null,
        labels: string[],
        startX: number,
        startY: number,
        cellW: number,
        cellH: number,
        color: string
    ): void {
        if (idx === null) return;

        const x = startX + idx * cellW + cellW / 2;
        const cellBottom = startY + cellH;

        g.append('line')
            .attr('class', 'pointer')
            .attr('x1', x)
            .attr('y1', cellBottom + 20)
            .attr('x2', x)
            .attr('y2', cellBottom + 3)
            .attr('stroke', color)
            .attr('stroke-width', 1.5)
            .attr('marker-end', 'url(#bs-pointer-arrow)');

        labels.forEach((label, i) => {
            g.append('text')
                .attr('class', 'pointer')
                .attr('x', x)
                .attr('y', cellBottom + 34 + i * 16)
                .attr('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('fill', color)
                .text(label);
        });
    }

    private renderPointer(
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        idx: number | null,
        label: string,
        startX: number,
        startY: number,
        cellW: number,
        cellH: number,
        color: string
    ): void {
        if (idx === null) return;

        const x = startX + idx * cellW + cellW / 2;

        if (label === 'mid') {
            g.append('text')
                .attr('class', 'pointer')
                .attr('x', x)
                .attr('y', startY - 32)
                .attr('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('fill', color)
                .text('mid');
            g.append('line')
                .attr('class', 'pointer')
                .attr('x1', x)
                .attr('y1', startY - 26)
                .attr('x2', x)
                .attr('y2', startY - 3)
                .attr('stroke', color)
                .attr('stroke-width', 1.5)
                .attr('marker-end', 'url(#bs-pointer-arrow)');
        } else {
            g.append('text')
                .attr('class', 'pointer')
                .attr('x', x)
                .attr('y', startY + cellH + 36)
                .attr('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('fill', color)
                .text(label);
            g.append('line')
                .attr('class', 'pointer')
                .attr('x1', x)
                .attr('y1', startY + cellH + 25)
                .attr('x2', x)
                .attr('y2', startY + cellH + 3)
                .attr('stroke', color)
                .attr('stroke-width', 1.5)
                .attr('marker-end', 'url(#bs-pointer-arrow)');
        }
    }

    clear(): void {
        super.clear();
        this.arrNode = null;
        this.group = null;
    }
}
