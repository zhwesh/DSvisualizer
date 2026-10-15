import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
import { DataNode } from '../node/DataNode';
import { ArrayNode } from '../node/ArrayNode/ArrayNode';
import { ArrayStackNode } from '../node/ArrayNode/impl/ArrayStackNode';
import { ArrayQueueNode } from '../node/ArrayNode/impl/ArrayQueueNode';
import { UnionFindSetNode } from '../node/ArrayNode/impl/UnionFindSetNode';
import {
    BinaryIndexedTreeNode,
    BinaryIndexedTree_TREE_GREEN,
    BinaryIndexedTree_TREE_RED,
} from '../node/ArrayNode/impl/BinaryIndexedTreeNode';
import { KMPNode } from '../node/ArrayNode/impl/KMPNode';
import { QuickSortNode } from '../node/ArrayNode/impl/QuickSortNode';

// ---------- 配色常量（与设计图风格一致） ----------
const COLOR_DEFAULT = '#ffffff';
const COLOR_HIGHLIGHT = '#ffeaa7';   // 修改/新增闪黄色
const COLOR_COMPARE = '#74b9ff';     // 比较/交换闪蓝色
const COLOR_GREEN = '#2ecc71';
const COLOR_RED = '#e74c3c';
const COLOR_GRAY = '#bdc3c7';
const COLOR_BLUE = '#3498db';
const COLOR_POINTER = '#e67e22';     // 指针用橙色，区分于数据

interface ArrayGroupInfo {
    node: ArrayNode;
    group: d3.Selection<SVGGElement, unknown, null, undefined>;
    cellWidth: number;
    cellHeight: number;
    startX: number;
    startY: number;
    label: string;
}

/**
 * 数组可视化器
 * 处理ArrayNode及其子类（栈/队列/堆/并查集/树状数组/排序算法/KMP节点）的渲染和动画
 */
export class ArrayVisualizer extends BaseVisualizer {
    // 数组节点ID -> 渲染信息
    private arrayNodes: Map<number, ArrayGroupInfo> = new Map();

    private nextArrayY: number = 80;
    private static readonly CELL_WIDTH = 60;
    private static readonly CELL_HEIGHT = 50;
    private static readonly CANVAS_W = 1200;
    private static readonly ROW_GAP = 24;       // 附加行与主行的垂直间距
    private static readonly ARRAY_GAP = 130;    // 两个数组之间的垂直间距

    onOp(node: DataNode, method: string, args: any[]): void {
        // 只处理ArrayNode类型的节点
        if (!(node instanceof ArrayNode)) {
            return;
        }
        const arrNode = node as ArrayNode;

        switch (method) {
            case '_create':
                this.handleCreate(arrNode);
                break;
            case '_add_value':
                this.handleAddValue(arrNode, args[0]);
                break;
            case '_set_value':
                this.handleSetValue(arrNode, args[0] as number, args[1]);
                break;
            case '_swap_value':
                this.handleSwapValue(arrNode, args[0] as number, args[1] as ArrayNode, args[2] as number);
                break;
            case '_swap_array':
                this.handleSwapArray(arrNode, args[0] as ArrayNode);
                break;
            case '_delete':
                this.handleDelete(arrNode);
                break;
            case '_set_top':        // 栈顶指针
            case '_set_head':       // 队首指针
            case '_set_tail':       // 队尾指针
            case '_set_pivot':      // 快排枢轴
            case '_set_str_ptr':    // KMP待匹配串指针
            case '_set_template_ptr': // KMP模式串指针
            case '_align':          // KMP对齐
                this.renderGroup(this.arrayNodes.get(arrNode.getId()));
                break;
            case '_set_size':       // 并查集合集大小
                this.renderGroup(this.arrayNodes.get(arrNode.getId()));
                break;
            case '_set_tree':       // 树状数组值
            case '_set_tree_color': // 树状数组覆盖条颜色
            case '_set_data_color': // 树状数组原始数据颜色
            case '_clear_color':    // 清空颜色
            case '_set_color':      // 排序节点数据颜色
            case '_set_prefix_color': // KMP前缀色
            case '_set_suffix_color': // KMP后缀色
                this.renderGroup(this.arrayNodes.get(arrNode.getId()));
                break;
            default:
                break;
        }
    }

    /**
     * 获取数组标签
     */
    private getLabel(node: ArrayNode): string {
        if (node instanceof ArrayStackNode) return 'stack';
        if (node instanceof ArrayQueueNode) return 'queue';
        if (node instanceof UnionFindSetNode) return 'father';
        if (node instanceof BinaryIndexedTreeNode) return 'data';
        if (node instanceof KMPNode) return 'str';
        return 'arr';
    }

    /**
     * 计算一个数组节点需要渲染的所有行
     */
    private buildRows(node: ArrayNode): { key: string; label: string; values: (string | number | null)[] }[] {
        const rows: { key: string; label: string; values: (string | number | null)[] }[] = [];

        // 主行：data 数组
        const mainValues: (string | number | null)[] = (node as any).str !== undefined
            ? Array.from((node as any).str as string)
            : [...node.data];
        rows.push({ key: 'data', label: this.getLabel(node), values: mainValues });

        // KMP：模式串行 + next 数组行
        if (node instanceof KMPNode) {
            rows.push({ key: 'template', label: 'template', values: Array.from(node.template) });
            rows.push({ key: 'next', label: 'next', values: [...node.data] });
        }
        // 并查集：sz 数组行
        if (node instanceof UnionFindSetNode) {
            rows.push({ key: 'sz', label: 'sz', values: node.sz.map(v => v as number | null) });
        }
        // 树状数组：tree 数组行
        if (node instanceof BinaryIndexedTreeNode) {
            rows.push({ key: 'tree', label: 'tree', values: node.tree.map(v => v as number | null) });
        }
        return rows;
    }

    /**
     * 计算单元格填充颜色（依据节点状态）
     */
    private cellFill(node: ArrayNode, rowKey: string, idx: number, isCover: boolean): string {
        const n: any = node;
        if (rowKey === 'data') {
            if (node instanceof BinaryIndexedTreeNode) {
                if (n.dataColor && n.dataColor[idx] === true) return COLOR_GREEN;
            } else if (node instanceof KMPNode) {
                // data 行即 next 数组：无色
                return COLOR_DEFAULT;
            } else if (n.color && n.color[idx] === true) {
                // 排序节点：绿色高亮
                return COLOR_GREEN;
            }
        }
        if (rowKey === 'template' && node instanceof KMPNode) {
            if (n.prefixColor[idx] === true) return COLOR_BLUE;
            if (n.suffixColor[idx] === true) return COLOR_GREEN;
        }
        if (rowKey === 'tree' && node instanceof BinaryIndexedTreeNode) {
            const c = n.treeColor[idx];
            if (c === BinaryIndexedTree_TREE_GREEN) return COLOR_GREEN;
            if (c === BinaryIndexedTree_TREE_RED) return COLOR_RED;
            return COLOR_GRAY;
        }
        if (isCover) {
            const c = n.treeColor?.[idx];
            if (c === BinaryIndexedTree_TREE_GREEN) return COLOR_GREEN;
            if (c === BinaryIndexedTree_TREE_RED) return COLOR_RED;
            return COLOR_GRAY;
        }
        return COLOR_DEFAULT;
    }

    /**
     * 处理数组创建
     */
    private handleCreate(node: ArrayNode): void {
        const id = node.getId();
        const startX = 80;
        const startY = this.nextArrayY;
        const cellWidth = ArrayVisualizer.CELL_WIDTH;
        const cellHeight = ArrayVisualizer.CELL_HEIGHT;

        // 创建数组组
        const group = this.mainGroup.append('g')
            .attr('class', 'array-group')
            .attr('data-id', id);

        const rows = this.buildRows(node);
        this.arrayNodes.set(id, { node, group, cellWidth, cellHeight, startX, startY, label: rows[0].label });

        this.renderGroup(this.arrayNodes.get(id)!);
        this.nextArrayY += ArrayVisualizer.ARRAY_GAP;
    }

    /**
     * 渲染一个数组组（主行 + 附加行 + 指针 + 覆盖条）
     */
    private renderGroup(info: ArrayGroupInfo | undefined): void {
        if (!info) return;
        const { node, group, startY, cellWidth, cellHeight } = info;
        // 每次渲染基于节点当前状态动态重建行（扩容/交换数组后数据会变化）
        const rows = this.buildRows(node);

        // 数组整体以画布中心水平居中（按最长一行宽度计算），数据少时居中、多时保持可读
        const maxLen = Math.max(...rows.map(r => r.values.length));
        const startX = Math.max(80, (ArrayVisualizer.CANVAS_W - maxLen * cellWidth) / 2);
        info.startX = startX;   // 写回，供指针/覆盖条渲染保持同一起点

        // 1. 数组标签
        group.selectAll('.array-label').remove();
        group.append('text')
            .attr('class', 'array-label')
            .attr('x', startX - 52)
            .attr('y', startY + cellHeight / 2 + 5)
            .style('font-size', '14px')
            .style('font-family', 'monospace')
            .style('fill', '#555')
            .text(info.label);

        // 2. 逐行渲染单元格
        rows.forEach((row, r) => {
            const rowY = startY + r * (cellHeight + ArrayVisualizer.ROW_GAP);
            const cells = group.selectAll(`.cell.row-${row.key}`)
                .data(row.values, (_d: any, i: number) => i);

            // enter：创建单元格（一次捕获 enter 选择，后续合并复用）
            const enterCells = cells.enter()
                .append('g')
                .attr('class', `cell row-${row.key}`)
                .attr('transform', (_d: any, i: number) => `translate(${startX + i * cellWidth}, ${rowY})`);

            enterCells.each(function(this: SVGGElement, _d: any) {
                const g = d3.select(this);
                g.append('rect')
                    .attr('class', 'cell-rect')
                    .attr('width', cellWidth)
                    .attr('height', cellHeight)
                    .attr('fill', COLOR_DEFAULT)
                    .attr('stroke', '#333')
                    .attr('stroke-width', 1.5);
                g.append('text')
                    .attr('class', 'cell-value')
                    .attr('x', cellWidth / 2)
                    .attr('y', cellHeight / 2 + 5)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '15px')
                    .style('font-family', 'monospace')
                    .text((d: any) => d !== null && d !== undefined ? String(d) : '');
            });

            // 更新：位置 + 值 + 颜色（enter 与 update 合并）
            cells.merge(enterCells as any)
                .attr('transform', (_d: any, i: number) => `translate(${startX + i * cellWidth}, ${rowY})`)
                .select('.cell-value')
                .text((d: any) => d !== null && d !== undefined ? String(d) : '');

            cells.select('.cell-rect')
                .attr('fill', (_d: any, i: number) => this.cellFill(node, row.key, i, false));

            cells.exit().remove();
        });

        // 3. 树状数组覆盖条（渲染在 data 行上方）
        if (node instanceof BinaryIndexedTreeNode) {
            group.selectAll('.cover-bar').remove();
            const n = node as any;
            const rowY = startY;
            for (let i = 1; i < n.data.length; ++i) {
                const lb = i & -i;
                const x1 = startX + (i - lb) * cellWidth;
                const x2 = startX + i * cellWidth;
                const bar = group.append('g').attr('class', 'cover-bar');
                bar.append('rect')
                    .attr('x', x1)
                    .attr('y', rowY - 14)
                    .attr('width', Math.max(2, x2 - x1))
                    .attr('height', 8)
                    .attr('rx', 2)
                    .attr('fill', this.cellFill(node, 'tree', i, true))
                    .attr('stroke', '#888')
                    .attr('stroke-width', 0.5)
                    .style('opacity', 0.85);
                // 覆盖条右端标注 tree 值
                if (n.tree[i] !== null && n.tree[i] !== undefined) {
                    bar.append('text')
                        .attr('x', x2 + 2)
                        .attr('y', rowY - 8)
                        .style('font-size', '10px')
                        .style('font-family', 'monospace')
                        .style('fill', '#666')
                        .text(String(n.tree[i]));
                }
            }
        }

        // 4. 指针渲染
        this.renderPointers(info);

        // 5. 自适应 viewBox：数组包围盒自动填满画布，任何窗口宽度下数值都清晰可读
        this.fitViewBox();
    }

    /**
     * 根据当前所有数组的实际包围盒自适应 viewBox，使数组始终填满画布中心
     */
    private fitViewBox(): void {
        if (this.arrayNodes.size === 0) {
            this.svg.attr('viewBox', '0 0 1200 600');
            return;
        }
        const PAD_X = 28;
        const PAD_Y = 42;   // 上方容纳指针（-34）
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        this.arrayNodes.forEach(info => {
            const rows = this.buildRows(info.node);
            const maxLen = Math.max(...rows.map(r => r.values.length));
            const startX = Math.max(80, (ArrayVisualizer.CANVAS_W - maxLen * info.cellWidth) / 2);
            const totalW = maxLen * info.cellWidth;
            const totalH = rows.length * info.cellHeight + (rows.length - 1) * ArrayVisualizer.ROW_GAP;
            minX = Math.min(minX, startX);
            maxX = Math.max(maxX, startX + totalW);
            minY = Math.min(minY, info.startY);
            maxY = Math.max(maxY, info.startY + totalH);
        });
        const contentW = (maxX - minX) + 2 * PAD_X;
        const contentH = (maxY - minY) + 2 * PAD_Y;
        let w = Math.max(contentW, 340);
        const h = Math.max(contentH, 160);
        // 保持水平居中：视图不小于内容宽度时，把数组水平置于视图中央
        let x0 = minX - PAD_X;
        if (w > contentW) {
            x0 = minX - PAD_X - (w - contentW) / 2;
        }
        this.svg.attr('viewBox', `${x0} ${minY - PAD_Y} ${w} ${h}`);
    }

    /**
     * 渲染指针（栈顶/队首队尾/快排枢轴/KMP指针）
     */
    private renderPointers(info: ArrayGroupInfo): void {
        const { node, group, startX, startY, cellWidth, cellHeight } = info;
        group.selectAll('.pointer').remove();
        const n: any = node;

        // 主行下方渲染指针
        const rowY = startY;
        const bottomY = rowY + cellHeight;

        const addPointer = (idx: number | null | undefined, label: string, above: boolean): void => {
            if (idx === null || idx === undefined) return;
            const x = startX + idx * cellWidth + cellWidth / 2;
            const g = group.append('g').attr('class', 'pointer');
            if (above) {
                g.attr('transform', `translate(${x}, ${rowY - 34})`);
                g.append('text')
                    .attr('text-anchor', 'middle')
                    .style('font-size', '12px')
                    .style('fill', COLOR_POINTER)
                    .text(label);
                g.append('path')
                    .attr('d', 'M 0 12 L -6 20 L 6 20 Z')
                    .attr('fill', COLOR_POINTER);
            } else {
                g.attr('transform', `translate(${x}, ${bottomY + 22})`);
                g.append('text')
                    .attr('text-anchor', 'middle')
                    .style('font-size', '12px')
                    .style('fill', COLOR_POINTER)
                    .text(label);
                g.append('path')
                    .attr('d', 'M 0 -12 L -6 -20 L 6 -20 Z')
                    .attr('fill', COLOR_POINTER);
            }
        };

        if (node instanceof ArrayStackNode) {
            addPointer(n.top, 'top', true);
        }
        if (node instanceof ArrayQueueNode) {
            addPointer(n.head, 'head', false);
            addPointer(n.tail, 'tail', false);
        }
        if (node instanceof QuickSortNode) {
            addPointer(n.pivot, 'pivot', true);
        }
        if (node instanceof KMPNode) {
            // str 指针指向 str 行
            if (n.strPtr !== null && n.strPtr !== undefined) {
                const x = startX + n.strPtr * cellWidth + cellWidth / 2;
                const g = group.append('g').attr('class', 'pointer');
                g.attr('transform', `translate(${x}, ${startY + cellHeight + 22})`);
                g.append('text').attr('text-anchor', 'middle').style('font-size', '12px').style('fill', COLOR_POINTER).text('strPtr');
                g.append('path').attr('d', 'M 0 -12 L -6 -20 L 6 -20 Z').attr('fill', COLOR_POINTER);
            }
            // template 指针指向 template 行
            if (n.templatePtr !== null && n.templatePtr !== undefined) {
                const rowY2 = startY + (cellHeight + ArrayVisualizer.ROW_GAP);
                const x = startX + n.templatePtr * cellWidth + cellWidth / 2;
                const g = group.append('g').attr('class', 'pointer');
                g.attr('transform', `translate(${x}, ${rowY2 + cellHeight + 22})`);
                g.append('text').attr('text-anchor', 'middle').style('font-size', '12px').style('fill', COLOR_POINTER).text('tPtr');
                g.append('path').attr('d', 'M 0 -12 L -6 -20 L 6 -20 Z').attr('fill', COLOR_POINTER);
            }
        }
    }

    /**
     * 处理添加值
     */
    private handleAddValue(node: ArrayNode, _val: number | null): void {
        this.renderGroup(this.arrayNodes.get(node.getId()));
    }

    /**
     * 处理设置值
     */
    private handleSetValue(node: ArrayNode, idx: number, _val: number | null): void {
        const info = this.arrayNodes.get(node.getId());
        if (!info) return;

        // 找到对应单元格，高亮后刷新
        const cell = info.group.selectAll('.cell.row-data').filter((_d: any, i: number) => i === idx);
        cell.select('.cell-rect')
            .transition()
            .duration(150)
            .attr('fill', COLOR_HIGHLIGHT)
            .transition()
            .duration(250)
            .attr('fill', (_d: any) => this.cellFill(node, 'data', idx, false));

        cell.select('.cell-value')
            .text(node.data[idx] !== null && node.data[idx] !== undefined ? String(node.data[idx]) : '');

        this.renderPointers(info);
    }

    /**
     * 处理交换值（带位置交换动画）
     */
    private handleSwapValue(node: ArrayNode, idx1: number, other: ArrayNode, idx2: number): void {
        const info1 = this.arrayNodes.get(node.getId());
        const info2 = this.arrayNodes.get(other.getId());
        if (!info1 || !info2) return;

        const cell1 = info1.group.selectAll('.cell.row-data').filter((_d: any, i: number) => i === idx1);
        const cell2 = info2.group.selectAll('.cell.row-data').filter((_d: any, i: number) => i === idx2);
        if (cell1.empty() || cell2.empty()) {
            this.renderGroup(info1);
            this.renderGroup(info2);
            return;
        }

        // 高亮两个交换的单元格
        cell1.select('.cell-rect').transition().duration(120).attr('fill', COLOR_COMPARE);
        cell2.select('.cell-rect').transition().duration(120).attr('fill', COLOR_COMPARE);

        // 交换位置动画
        const t1 = cell1.attr('transform');
        const t2 = cell2.attr('transform');
        cell1.transition().duration(260).attr('transform', t2);
        cell2.transition().duration(260).attr('transform', t1);

        // 动画结束后重渲染，恢复正确布局与颜色
        setTimeout(() => {
            this.renderGroup(info1);
            this.renderGroup(info2);
        }, 320);
    }

    /**
     * 处理删除数组
     */
    private handleDelete(node: ArrayNode): void {
        const id = node.getId();
        const info = this.arrayNodes.get(id);
        if (!info) return;

        // 淡出动画后移除
        info.group
            .transition()
            .duration(300)
            .style('opacity', 0)
            .remove();

        this.arrayNodes.delete(id);
    }

    /**
     * 处理交换整个数组
     */
    private handleSwapArray(node: ArrayNode, other: ArrayNode): void {
        const info1 = this.arrayNodes.get(node.getId());
        const info2 = this.arrayNodes.get(other.getId());
        if (!info1 || !info2) return;

        // 重新渲染两个数组
        this.renderGroup(info1);
        this.renderGroup(info2);
    }

    clear(): void {
        super.clear();
        this.arrayNodes.clear();
        this.nextArrayY = 80;
    }
}
