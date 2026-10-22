import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
import { BinaryHeapNode } from '../node/ArrayNode/impl/BinaryHeapNode';

/************************************************** */
// 配色
const COLOR_BG = '#ffffff';
const COLOR_TEXT = '#333333';
const COLOR_EDGE = '#999999';
const COLOR_NODE_STROKE = '#666666';
const COLOR_NODE_VALUE = '#333333';
const COLOR_EMPTY = '#f8fafc';
const COLOR_EMPTY_STROKE = '#cbd5e1';
const COLOR_INDEX = '#98a2b3';
const COLOR_INSERT = '#ffeaa7';
const COLOR_SWAP = '#74b9ff';

interface HeapView {
    node: BinaryHeapNode;
    group: d3.Selection<SVGGElement, unknown, null, undefined>;
    isMain: boolean;
}

interface FlashTarget {
    nodeId: number;
    indices: number[];
    color: string;
}

/**
 * 二叉堆可视化器
 *
 * 同时展示：
 * - 完全二叉树：节点编号 i 的左右孩子为 i<<1、i<<1|1
 * - 堆数组：data[0] 不使用，data[1..n] 为有效元素
 *
 * 数组扩容时会临时创建第二个 BinaryHeapNode，这里将它作为 tmp 数组显示，
 * 扩容完成后随 _delete 移除。
 */
export class BinaryHeapVisualizer extends BaseVisualizer {
    // 节点 id -> 视图（主堆 + 扩容临时数组）
    private views: Map<number, HeapView> = new Map();
    // 主堆节点 id
    private mainId: number | null = null;
    // 扩容复制期间主堆的显示快照：算法用 _swap_value 把值搬到临时数组，
    // 但主堆逻辑上仍是原堆，所以树和主数组在交换前保持原值，避免消失再出现。
    private stableMainData: (number | null)[] | null = null;

    private static readonly TREE_CENTER_X = 600;
    private static readonly TREE_START_Y = 90;
    private static readonly TREE_H_GAP = 50;
    private static readonly TREE_V_GAP = 60;
    private static readonly NODE_RADIUS = 15;
    private static readonly CELL_W = 44;
    private static readonly CELL_H = 42;
    private static readonly ARRAY_GAP = 82;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
        super(svg);
    }

    /************************************************** */
    // 原子操作分发
    onOp(node: object, method: string, args: unknown[]): void {
        if (!(node instanceof BinaryHeapNode)) {
            return;
        }

        switch (method) {
            case '_create':
                this.animations.enqueue(() => this.handleCreate(node));
                break;
            case '_set_value': {
                const idx = Number(args[0]);
                this.enqueueRender([{
                    nodeId: node.getId(),
                    indices: [idx],
                    color: COLOR_INSERT,
                }], 140);
                break;
            }
            case '_swap_value': {
                const idx1 = Number(args[0]);
                const other = args[1] as BinaryHeapNode;
                const idx2 = Number(args[2]);
                this.enqueueRender([
                    { nodeId: node.getId(), indices: [idx1], color: COLOR_SWAP },
                    { nodeId: other.getId(), indices: [idx2], color: COLOR_SWAP },
                ], 200);
                break;
            }
            case '_swap_array': {
                // 临时数组已与主数组交换，主堆恢复使用真实数据
                this.stableMainData = null;
                this.enqueueRender([], 120);
                break;
            }
            case '_delete':
                this.animations.enqueue(() => this.handleDelete(node));
                break;
            default:
                break;
        }
    }

    /**
     * 渲染全部堆视图并闪烁受影响的单元格/树节点。
     */
    private enqueueRender(flashes: FlashTarget[], wait: number): void {
        this.animations.enqueue(async () => {
            this.renderAll();
            this.flashTargets(flashes);
            await this.delay(wait);
        });
    }

    private handleCreate(node: BinaryHeapNode): void {
        const isMain = this.mainId === null;
        if (isMain) {
            this.mainId = node.getId();
            this.stableMainData = null;
        } else if (this.mainId !== null) {
            const main = this.views.get(this.mainId);
            this.stableMainData = main ? [...this.viewData(main)] : null;
        }

        const group = this.mainGroup.append('g')
            .attr('class', 'heap-view')
            .attr('data-id', node.getId());

        this.views.set(node.getId(), { node, group, isMain });
        this.renderAll();
    }

    private async handleDelete(node: BinaryHeapNode): Promise<void> {
        const view = this.views.get(node.getId());
        if (!view) return;

        // 主数组在 clear 时也会走 _delete，但堆实例后续仍继续复用这个节点；
        // 因此只清空渲染内容，不移除主视图。
        if (this.mainId === node.getId()) {
            this.stableMainData = null;
            this.renderAll();
            return;
        }

        await view.group
            .transition()
            .duration(this.duration(160))
            .style('opacity', 0)
            .end()
            .catch(() => undefined);

        view.group.remove();
        this.views.delete(node.getId());
        this.renderAll();
    }

    private clearViews(): void {
        this.views.forEach(view => view.group.remove());
        this.views.clear();
        this.mainId = null;
        this.stableMainData = null;
        this.svg.attr('viewBox', '0 0 1200 600');
    }

    private renderAll(): void {
        if (this.views.size === 0) {
            this.svg.attr('viewBox', '0 0 1200 600');
            return;
        }

        this.views.forEach(view => {
            if (view.isMain) {
                this.renderTree(view);
            }
            this.renderArray(view);
        });
        this.fitViewBox();
    }

    /************************************************** */
    // 完全二叉树
    private renderTree(view: HeapView): void {
        const { group } = view;
        let layer = group.select<SVGGElement>('g.heap-tree-layer');
        if (layer.empty()) {
            layer = group.append('g').attr('class', 'heap-tree-layer');
        }

        // 边单独放在节点下层，避免后新增的边覆盖已有节点圆圈
        let edgeLayer = layer.select<SVGGElement>('g.heap-tree-edge-layer');
        if (edgeLayer.empty()) {
            edgeLayer = layer.append('g').attr('class', 'heap-tree-edge-layer');
        }
        edgeLayer.lower();

        const data = this.viewData(view);
        const size = this.heapSize(data);
        const indices = Array.from({ length: size }, (_, i) => i + 1);
        const positions = this.treePositions(size);

        const edges = indices
            .filter(i => i > 1)
            .map(i => {
                const from = positions.get(i >> 1)!;
                const to = positions.get(i)!;
                return { i, from, to };
            });

        const lines = edgeLayer.selectAll<SVGLineElement, { i: number; from: { x: number; y: number }; to: { x: number; y: number } }>('line.heap-edge')
            .data(edges, d => d.i);

        lines.enter()
            .append('line')
            .attr('class', 'heap-edge')
            .attr('stroke', COLOR_EDGE)
            .attr('stroke-width', 1.5)
            .merge(lines)
            .transition('heap-edge-move')
            .duration(this.duration(220))
            .attr('x1', d => d.from.x)
            .attr('y1', d => d.from.y)
            .attr('x2', d => d.to.x)
            .attr('y2', d => d.to.y);

        lines.exit().remove();

        const nodes = layer.selectAll<SVGGElement, number>('g.heap-tree-node')
            .data(indices, d => d);

        const enter = nodes.enter()
            .append('g')
            .attr('class', 'heap-tree-node')
            .attr('data-i', d => d)
            .attr('transform', d => {
                const p = positions.get(d)!;
                return `translate(${p.x}, ${p.y})`;
            })
            .style('opacity', 1);

        enter.append('circle')
            .attr('r', BinaryHeapVisualizer.NODE_RADIUS)
            .attr('fill', COLOR_BG)
            .attr('stroke', COLOR_NODE_STROKE)
            .attr('stroke-width', 1.5);

        enter.append('text')
            .attr('class', 'heap-node-value')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('fill', COLOR_NODE_VALUE);

        nodes.merge(enter)
            .transition('heap-node-move')
            .duration(this.duration(220))
            .attr('transform', d => {
                const p = positions.get(d)!;
                return `translate(${p.x}, ${p.y})`;
            });

        nodes.merge(enter)
            .select('.heap-node-value')
            .text(d => String(data[d] ?? ''));

        nodes.exit().remove();
    }

    private treePositions(size: number): Map<number, { x: number; y: number }> {
        // 与 TreeVisualizer 一致：按中序遍历顺序分配水平位置，深度决定纵坐标
        const flat: { index: number; depth: number }[] = [];
        const traverse = (index: number, depth: number): void => {
            if (index > size) return;
            traverse(index << 1, depth + 1);
            flat.push({ index, depth });
            traverse((index << 1) | 1, depth + 1);
        };
        traverse(1, 0);

        const positions = new Map<number, { x: number; y: number }>();
        const firstX = BinaryHeapVisualizer.TREE_CENTER_X -
            (flat.length - 1) * BinaryHeapVisualizer.TREE_H_GAP / 2;
        flat.forEach((item, order) => {
            positions.set(item.index, {
                x: firstX + order * BinaryHeapVisualizer.TREE_H_GAP,
                y: BinaryHeapVisualizer.TREE_START_Y +
                    item.depth * BinaryHeapVisualizer.TREE_V_GAP,
            });
        });
        return positions;
    }

    /************************************************** */
    // 堆数组
    private renderArray(view: HeapView): void {
        const { group, isMain } = view;
        const data = this.viewData(view);
        let layer = group.select<SVGGElement>('g.heap-array-layer');
        if (layer.empty()) {
            layer = group.append('g').attr('class', 'heap-array-layer');
        }

        const capacity = Math.max(0, data.length - 1);
        const y = this.arrayY(view);
        const startX = BinaryHeapVisualizer.TREE_CENTER_X -
            capacity * BinaryHeapVisualizer.CELL_W / 2;

        let label = layer.select<SVGTextElement>('text.heap-array-label');
        if (label.empty()) {
            label = layer.append('text').attr('class', 'heap-array-label');
        }
        label
            .attr('x', startX - 14)
            .attr('y', y + BinaryHeapVisualizer.CELL_H / 2 + 5)
            .attr('text-anchor', 'end')
            .style('font-size', '14px')
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('fill', '#555')
            .text(isMain ? 'heap' : 'tmp');

        if (capacity === 0) {
            layer.selectAll('g.heap-cell').remove();
            layer.selectAll('text.heap-empty').remove();
            label.remove();
            return;
        }
        layer.selectAll('text.heap-empty').remove();

        const indices = Array.from({ length: capacity }, (_, i) => i + 1);
        const cells = layer.selectAll<SVGGElement, number>('g.heap-cell')
            .data(indices, d => d);

        const enter = cells.enter()
            .append('g')
            .attr('class', 'heap-cell')
            .attr('data-i', d => d)
            .attr('transform', d => this.cellTransform(d, startX, y));

        enter.append('rect')
            .attr('width', BinaryHeapVisualizer.CELL_W - 4)
            .attr('height', BinaryHeapVisualizer.CELL_H)
            .attr('rx', 3)
            .attr('stroke-width', 1.4);

        enter.append('text')
            .attr('class', 'heap-cell-value')
            .attr('x', (BinaryHeapVisualizer.CELL_W - 4) / 2)
            .attr('y', BinaryHeapVisualizer.CELL_H / 2 + 5)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('fill', COLOR_TEXT);

        enter.append('text')
            .attr('class', 'heap-cell-index')
            .attr('x', (BinaryHeapVisualizer.CELL_W - 4) / 2)
            .attr('y', BinaryHeapVisualizer.CELL_H + 15)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('fill', COLOR_INDEX);

        const merged = cells.merge(enter);
        merged.attr('transform', d => this.cellTransform(d, startX, y));
        merged.each(function (index) {
            const cell = d3.select(this);
            const value = data[index];
            const empty = value === null || value === undefined;
            cell.select('rect')
                .attr('fill', empty ? COLOR_EMPTY : COLOR_BG)
                .attr('stroke', empty ? COLOR_EMPTY_STROKE : '#666666');
            cell.select('.heap-cell-value')
                .text(empty ? '' : String(value))
                .style('fill', empty ? COLOR_INDEX : COLOR_TEXT);
            cell.select('.heap-cell-index').text(String(index));
        });

        cells.exit().remove();
    }

    private cellTransform(index: number, startX: number, y: number): string {
        return `translate(${startX + (index - 1) * BinaryHeapVisualizer.CELL_W}, ${y})`;
    }

    /************************************************** */
    // 布局/尺寸
    private viewData(view: HeapView): (number | null)[] {
        return view.isMain && this.stableMainData !== null
            ? this.stableMainData
            : view.node.data;
    }

    private heapSize(data: (number | null)[]): number {
        let size = Math.max(0, data.length - 1);
        while (size > 0 && (data[size] === null || data[size] === undefined)) {
            --size;
        }
        return size;
    }

    private mainView(): HeapView | null {
        return this.mainId === null ? null : this.views.get(this.mainId) ?? null;
    }

    private arrayY(view: HeapView): number {
        const main = this.mainView();
        const size = main ? this.heapSize(this.viewData(main)) : 0;
        const depth = size > 0 ? Math.floor(Math.log2(size)) : 0;
        const base = BinaryHeapVisualizer.TREE_START_Y +
            depth * BinaryHeapVisualizer.TREE_V_GAP + 95;
        return view.isMain ? base : base + BinaryHeapVisualizer.ARRAY_GAP;
    }

    private fitViewBox(): void {
        const main = this.mainView();
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        if (main) {
            const size = this.heapSize(this.viewData(main));
            const treeHalfW = size > 1
                ? (size - 1) * BinaryHeapVisualizer.TREE_H_GAP / 2
                : 0;
            minX = Math.min(minX, BinaryHeapVisualizer.TREE_CENTER_X - treeHalfW - 35);
            maxX = Math.max(maxX, BinaryHeapVisualizer.TREE_CENTER_X + treeHalfW + 35);
            minY = Math.min(minY, BinaryHeapVisualizer.TREE_START_Y -
                BinaryHeapVisualizer.NODE_RADIUS - 30);
        }

        this.views.forEach(view => {
            const data = this.viewData(view);
            const capacity = Math.max(0, data.length - 1);
            const rowW = capacity * BinaryHeapVisualizer.CELL_W;
            const startX = BinaryHeapVisualizer.TREE_CENTER_X - rowW / 2;
            const y = this.arrayY(view);
            minX = Math.min(minX, startX - 80);
            maxX = Math.max(maxX, startX + rowW + 25);
            minY = Math.min(minY, y - 25);
            maxY = Math.max(maxY, y + BinaryHeapVisualizer.CELL_H + 35);
        });

        if (!isFinite(minX)) {
            this.svg.attr('viewBox', '0 0 1200 600');
            return;
        }

        const contentW = maxX - minX;
        const contentH = maxY - minY;
        const w = Math.max(contentW + 80, 360);
        const h = Math.max(contentH + 80, 240);
        const x0 = (minX + maxX) / 2 - w / 2;
        const y0 = (minY + maxY) / 2 - h / 2;
        this.svg.attr('viewBox', `${x0} ${y0} ${w} ${h}`);
    }

    /************************************************** */
    // 高亮
    private flashTargets(targets: FlashTarget[]): void {
        targets.forEach(target => {
            const view = this.views.get(target.nodeId);
            if (!view) return;

            target.indices.forEach(index => {
                if (index <= 0) return;

                const cell = view.group.select(`.heap-cell[data-i="${index}"] rect`);
                if (!cell.empty()) {
                    const value = this.viewData(view)[index];
                    const empty = value === null || value === undefined;
                    cell
                        .interrupt()
                        .attr('fill', target.color)
                        .transition()
                        .duration(this.duration(220))
                        .attr('fill', empty ? COLOR_EMPTY : COLOR_BG);
                }

                if (view.isMain) {
                    const treeNode = view.group.select(`.heap-tree-node[data-i="${index}"] circle`);
                    if (!treeNode.empty()) {
                        treeNode
                            .interrupt()
                            .attr('fill', target.color)
                            .transition()
                            .duration(this.duration(220))
                            .attr('fill', COLOR_BG);
                    }
                }
            });
        });
    }

    clear(): void {
        super.clear();
        this.clearViews();
    }
}
