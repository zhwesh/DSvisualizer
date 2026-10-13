import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
import { DataNode } from '../node/DataNode';
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

    private static readonly CELL_WIDTH = 40;
    private static readonly CELL_HEIGHT = 40;
    private static readonly START_Y = 255;
    private static readonly CANVAS_W = 1200;

    onOp(node: DataNode, method: string, _args: any[]): void {
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

        const cellW = BinarySearchVisualizer.CELL_WIDTH;
        const cellH = BinarySearchVisualizer.CELL_HEIGHT;

        // 数组整体以画布中心水平居中（缩小后依然保持居中）
        const totalW = data.length * cellW;
        const startX = (BinarySearchVisualizer.CANVAS_W - totalW) / 2;
        const startY = BinarySearchVisualizer.START_Y;

        // 1. 渲染数组单元格
        const cells = g.selectAll('.bs-cell').data(data, (_d: any, i: number) => i);

        const enterCells = cells.enter()
            .append('g')
            .attr('class', 'bs-cell')
            .attr('transform', (_d: any, i: number) => `translate(${startX + i * cellW}, ${startY})`);

        enterCells.append('rect')
            .attr('class', 'bs-cell-rect')
            .attr('width', cellW)
            .attr('height', cellH)
            .attr('fill', '#fff')
            .attr('stroke', '#666')
            .attr('stroke-width', 1.5);

        enterCells.append('text')
            .attr('class', 'cell-value')
            .attr('x', cellW / 2)
            .attr('y', cellH / 2 + 5)
            .attr('text-anchor', 'middle')
            .style('font-size', '13px')
            .style('font-family', 'monospace')
            .text((d: any) => d !== null ? String(d) : '');

        // 更新：范围底色 + mid 高亮
        g.selectAll('.bs-cell').select('.bs-cell-rect')
            .attr('fill', (_d: any, i: number) => {
                const inRange = node.left !== null && node.right !== null && i >= node.left && i <= node.right;
                if (node.mid !== null && i === node.mid) return COLOR_MID;
                return inRange ? COLOR_RANGE : '#fff';
            });

        // 更新已有单元格的值
        g.selectAll('.bs-cell').select('.cell-value').text((d: any) => d !== null ? String(d) : '');

        cells.exit().remove();

        // 2. 先移除旧的指针
        g.selectAll('.pointer').remove();

        // 3. 渲染指针
        this.renderPointer(g, node.left, 'left', startX, startY, cellW, cellH, '#2196F3');
        this.renderPointer(g, node.right, 'right', startX, startY, cellW, cellH, '#2196F3');
        this.renderPointer(g, node.mid, 'mid', startX, startY, cellW, cellH, '#2196F3');
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
            // mid指针在上方，向下箭头
            g.append('g')
                .attr('class', 'pointer')
                .attr('transform', `translate(${x}, ${startY - 35})`)
                .call((g) => {
                    g.append('text')
                        .attr('text-anchor', 'middle')
                        .style('font-size', '14px')
                        .style('fill', color)
                        .text('mid');
                    g.append('path')
                        .attr('d', `M 0 10 L -5 20 L 5 20 Z`)
                        .attr('fill', color);
                });
        } else {
            // left和right指针在下方，向上箭头
            g.append('g')
                .attr('class', 'pointer')
                .attr('transform', `translate(${x}, ${startY + cellH + 15})`)
                .call((g) => {
                    g.append('text')
                        .attr('text-anchor', 'middle')
                        .style('font-size', '14px')
                        .style('fill', color)
                        .text(label);
                    g.append('path')
                        .attr('d', `M 0 -10 L -5 -20 L 5 -20 Z`)
                        .attr('fill', color);
                });
        }
    }

    clear(): void {
        super.clear();
        this.arrNode = null;
        this.group = null;
    }
}
