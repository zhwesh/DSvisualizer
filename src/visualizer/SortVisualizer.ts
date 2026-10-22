import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
import { ArrayNode } from '../node/ArrayNode/ArrayNode';
import { QuickSortNode } from '../node/ArrayNode/impl/QuickSortNode';
import { BubbleSortNode } from '../node/ArrayNode/impl/BubbleSortNode';
import { InsertionSortNode } from '../node/ArrayNode/impl/InsertionSortNode';
import { MergeSortNode } from '../node/ArrayNode/impl/MergeSortNode';

// 排序算法节点联合类型（均带有 color 染色数组）
type SortArrayNode = QuickSortNode | BubbleSortNode | InsertionSortNode | MergeSortNode;

// 一次交换动作：支持同数组内部交换和 arr ↔ tmp 跨数组交换
interface SwapAction {
    nodeId: number;
    idx1: number;
    otherId: number;
    idx2: number;
}

/************************************************** */
// 配色
const COLOR_ITEM = '#ffffff';
const COLOR_ACTIVE = '#2ecc71';
const COLOR_TEXT = '#2c3e50';
const COLOR_BORDER = '#95a5a6';
const COLOR_PIVOT = '#e74c3c';
const COLOR_LABEL = '#555555';

/**
 * 排序算法可视化器
 *
 * 所有原子操作都转换成动画 effect，统一交给 BaseVisualizer.animations 串行执行：
 * - 交换：先移动两个单元格，再交换快照并重绘；
 * - 临时数组：_create / _add_value / _delete 分别对应建立、追加、删除 tmp 行；
 * - 颜色：按顺序更新可视化颜色快照，不直接读取算法层可能已经超前的 color；
 * - 写回：支持 _swap_value(arrIdx, tmp, tmpIdx) 的跨行交换。
 *
 * StepController 在放行下一步前会等待动画队列空闲，因此算法层的步骤和动画
 * 播放顺序是一致的。
 */
export class SortVisualizer extends BaseVisualizer {
    // 主数组节点
    private mainNode: ArrayNode | null = null;
    // 主数组显示快照
    private mainData: (number | null)[] = [];
    // 主数组颜色显示快照（与算法层 color 分离，防止颜色提前）
    private visualColor: boolean[] = [];
    // 快速排序枢轴显示快照
    private visualPivot: number | null = null;

    // 临时数组：节点 id -> 显示数据
    private tempData: Map<number, (number | null)[]> = new Map();
    // 临时数组创建顺序
    private tempOrder: number[] = [];

    // 未开始排序时的预览数据
    private previewData: (number | null)[] | null = null;

    // 当前布局：节点 id -> 行中心 y
    private rowYById: Map<number, number> = new Map();
    // 所有行共用的起始 x
    private startX: number = 0;

    private static readonly CANVAS_W = 1200;
    private static readonly NODE_W = 46;
    private static readonly NODE_H = 46;
    private static readonly MAIN_Y = 200;
    private static readonly TEMP_Y = 320;
    private static readonly TEMP_GAP = 90;
    private static readonly SWAP_BUDGET_MS = 600;
    private static readonly SWAP_MIN_MS = 60;
    private static readonly SWAP_MAX_MS = 160;
    private static readonly ACTION_GAP_MS = 60;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
        super(svg);
    }

    /**
     * 预览模式：外部传入数组直接渲染，不绑定算法节点。
     * @param data 初始数组
     */
    public preview(data: number[]): void {
        this.animations.clear();
        this.mainNode = null;
        this.mainData = [...data];
        this.visualColor = new Array(data.length).fill(false);
        this.visualPivot = null;
        this.previewData = data;
        this.tempData.clear();
        this.tempOrder = [];
        this.render();
    }

    /************************************************** */
    // 原子操作分发

    /**
     * 接收算法层原子操作的回调入口。
     * 数据型和展示型操作全部入队，不允许直接修改 DOM。
     *
     * @param node 触发原子操作的节点
     * @param method 原子方法名
     * @param args 原子方法参数
     */
    onOp(node: object, method: string, args: unknown[]): void {
        if (method === '_create') {
            if (!(node instanceof ArrayNode)) return;

            if (!this.mainNode) {
                // 主数组创建：重置本次排序的可视化状态
                this.animations.clear();
                this.mainNode = node;
                this.mainData = [...node.data];
                const sortNode = this.asSortNode(node);
                this.visualColor = [...(sortNode?.color ?? new Array(node.data.length).fill(false))];
                this.visualPivot = node instanceof QuickSortNode ? node.pivot : null;
                this.tempData.clear();
                this.tempOrder = [];
                this.previewData = null;
                this.render();
            } else if (node !== this.mainNode) {
                // 临时数组创建：先登记，后续 _add_value 会在同一队列中逐个追加
                const id = node.getId();
                this.animations.enqueue(() => {
                    if (!this.tempData.has(id)) {
                        this.tempOrder.push(id);
                    }
                    this.tempData.set(id, [...node.data]);
                });
            }
            return;
        }

        if (!this.mainNode) return;
        const mainId = this.mainNode.getId();
        const arrNode = node instanceof ArrayNode ? node : null;
        const nodeId = arrNode ? arrNode.getId() : mainId;

        switch (method) {
            case '_set_color':
                if (nodeId === mainId) {
                    const color = this.asSortNode(this.mainNode)?.color?.[args[0] as number] === true;
                    this.animations.enqueue(() => this.playColor(args[0] as number, color));
                }
                break;
            case '_swap_value':
                this.animations.enqueue(() => this.playSwap({
                    nodeId,
                    idx1: args[0] as number,
                    otherId: (args[1] as ArrayNode).getId(),
                    idx2: args[2] as number,
                }));
                break;
            case '_set_value':
                this.animations.enqueue(async () => {
                    const data = this.getVisualData(nodeId);
                    const idx = args[0] as number;
                    if (data && idx >= 0 && idx < data.length) {
                        data[idx] = args[1] as number | null;
                        this.render();
                    }
                    await this.delay(SortVisualizer.ACTION_GAP_MS);
                });
                break;
            case '_add_value':
                this.animations.enqueue(async () => {
                    let data = this.getVisualData(nodeId);
                    if (!data) {
                        data = [];
                        if (nodeId !== mainId && !this.tempOrder.includes(nodeId)) {
                            this.tempOrder.push(nodeId);
                        }
                        this.tempData.set(nodeId, data);
                    }
                    data.push(args[0] as number | null);
                    this.render();
                    await this.delay(SortVisualizer.ACTION_GAP_MS);
                });
                break;
            case '_delete':
                if (nodeId !== mainId) {
                    this.animations.enqueue(async () => {
                        this.tempData.delete(nodeId);
                        this.tempOrder = this.tempOrder.filter(id => id !== nodeId);
                        this.render();
                        await this.delay(SortVisualizer.ACTION_GAP_MS);
                    });
                }
                break;
            case '_swap_array':
                this.animations.enqueue(() => this.playSwapArray(nodeId, (args[0] as ArrayNode).getId()));
                break;
            case '_set_pivot':
                this.animations.enqueue(() => {
                    this.visualPivot = args[0] as number;
                    this.render();
                });
                break;
            case '_clear_color':
                this.animations.enqueue(() => {
                    this.visualColor.fill(false);
                    this.render();
                });
                break;
            default:
                break;
        }
    }

    /************************************************** */
    // 动画播放

    /**
     * 播放颜色变化。
     * @param idx 索引
     * @param active 是否高亮
     */
    private playColor(idx: number, active: boolean): void {
        if (idx < 0 || idx >= this.visualColor.length) {
            return;
        }
        this.visualColor[idx] = active;
        const bar = this.mainGroup.select(
            `g.sort-item[data-node-id="${this.mainNode?.getId()}"][data-idx="${idx}"] .sort-bar`,
        );
        if (bar.empty()) {
            this.render();
            return;
        }
        bar.attr('fill', active ? COLOR_ACTIVE : COLOR_ITEM);
    }

    /**
     * 播放一次交换动画。
     * 支持同数组内部交换，也支持 arr ↔ tmp 的跨行交换。
     * @param action 交换动作
     */
    private async playSwap(action: SwapAction): Promise<void> {
        const dataA = this.getVisualData(action.nodeId);
        const dataB = this.getVisualData(action.otherId);
        const cellA = this.findCell(action.nodeId, action.idx1);
        const cellB = this.findCell(action.otherId, action.idx2);

        if (!dataA || !dataB || cellA.empty() || cellB.empty()) {
            this.swapVisualValues(action);
            this.render();
            await this.delay(0);
            return;
        }

        if (action.nodeId === action.otherId && action.idx1 === action.idx2) {
            return;
        }

        const duration = this.duration(this.swapDuration());
        const targetA = this.cellPosition(action.otherId, action.idx2);
        const targetB = this.cellPosition(action.nodeId, action.idx1);

        const highlightA = cellA.select('.sort-bar')
            .transition()
            .duration(Math.min(this.duration(120), duration))
            .attr('fill', COLOR_ACTIVE)
            .end()
            .catch(() => undefined);
        const highlightB = cellB.select('.sort-bar')
            .transition()
            .duration(Math.min(this.duration(120), duration))
            .attr('fill', COLOR_ACTIVE)
            .end()
            .catch(() => undefined);
        const moveA = cellA.transition()
            .duration(duration)
            .attr('transform', `translate(${targetA.x}, ${targetA.y})`)
            .end()
            .catch(() => undefined);
        const moveB = cellB.transition()
            .duration(duration)
            .attr('transform', `translate(${targetB.x}, ${targetB.y})`)
            .end()
            .catch(() => undefined);

        await Promise.all([highlightA, highlightB, moveA, moveB]);
        this.swapVisualValues(action);
        this.render();
        await this.delay(0);
    }

    /**
     * 播放整份数组交换。
     * @param nodeId 第一个节点 id
     * @param otherId 第二个节点 id
     */
    private async playSwapArray(nodeId: number, otherId: number): Promise<void> {
        const dataA = this.getVisualData(nodeId);
        const dataB = this.getVisualData(otherId);
        if (!dataA || !dataB) {
            return;
        }

        const mainId = this.mainNode?.getId();
        if (mainId === nodeId) {
            this.mainData = dataB;
            this.tempData.set(otherId, dataA);
        } else if (mainId === otherId) {
            this.mainData = dataA;
            this.tempData.set(nodeId, dataB);
        } else {
            this.tempData.set(nodeId, dataB);
            this.tempData.set(otherId, dataA);
        }
        this.render();
        await this.delay(SortVisualizer.ACTION_GAP_MS);
    }

    /**
     * 在快照上交换两个值。
     * @param action 交换动作
     */
    private swapVisualValues(action: SwapAction): void {
        const dataA = this.getVisualData(action.nodeId);
        const dataB = this.getVisualData(action.otherId);
        if (!dataA || !dataB) {
            return;
        }
        if (action.idx1 < 0 || action.idx1 >= dataA.length ||
            action.idx2 < 0 || action.idx2 >= dataB.length) {
            return;
        }
        const tmp = dataA[action.idx1];
        dataA[action.idx1] = dataB[action.idx2];
        dataB[action.idx2] = tmp;
    }

    /**
     * 根据队列长度分配交换动画时长。
     */
    private swapDuration(): number {
        const remaining = Math.max(1, this.animations.pending());
        return Math.max(
            SortVisualizer.SWAP_MIN_MS,
            Math.min(
                SortVisualizer.SWAP_MAX_MS,
                Math.floor(SortVisualizer.SWAP_BUDGET_MS / remaining),
            ),
        );
    }

    /************************************************** */
    // 渲染

    /**
     * 重新渲染 arr 行和所有非空 tmp 行。
     */
    private render(): void {
        if (!this.mainNode && !this.previewData) {
            this.mainGroup.selectAll('*').remove();
            return;
        }

        this.mainGroup.selectAll('*').remove();
        this.rowYById.clear();

        const tempRows = this.tempOrder
            .map(id => ({ id, data: this.tempData.get(id) ?? [] }))
            .filter(row => row.data.length > 0);

        if (this.mainData.length === 0 && tempRows.length === 0) {
            this.svg.attr('viewBox', '0 0 400 200');
            return;
        }

        const maxLen = Math.max(
            this.mainData.length,
            ...tempRows.map(row => row.data.length),
            1,
        );
        this.startX = (SortVisualizer.CANVAS_W - maxLen * SortVisualizer.NODE_W) / 2;

        const mainId = this.mainNode?.getId() ?? -1;
        this.drawRow(mainId, this.mainData, SortVisualizer.MAIN_Y, 'arr', true);
        tempRows.forEach((row, index) => {
            const y = SortVisualizer.TEMP_Y + index * SortVisualizer.TEMP_GAP;
            this.drawRow(row.id, row.data, y, index === 0 ? 'tmp' : `tmp${index + 1}`, false);
        });

        this.fitViewBox(maxLen, tempRows.length);
    }

    /**
     * 绘制一行数组单元格。
     * @param nodeId 数组节点 id
     * @param data 显示数据
     * @param yBase 行中心 y
     * @param label 行标签
     * @param isMain 是否主数组
     */
    private drawRow(
        nodeId: number,
        data: (number | null)[],
        yBase: number,
        label: string,
        isMain: boolean,
    ): void {
        this.rowYById.set(nodeId, yBase);

        this.mainGroup.append('text')
            .attr('class', 'sort-row-label')
            .attr('x', this.startX - 18)
            .attr('y', yBase + 5)
            .attr('text-anchor', 'end')
            .style('font-size', '14px')
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('fill', COLOR_LABEL)
            .text(label);

        for (let i = 0; i < data.length; ++i) {
            const value = data[i];
            const isActive = isMain && this.visualColor[i] === true;
            const isPivot = isMain && this.visualPivot === i;
            const g = this.mainGroup.append('g')
                .attr('class', isMain ? 'sort-item main-row' : 'sort-item temp-row')
                .attr('data-node-id', nodeId)
                .attr('data-idx', i)
                .attr('transform', `translate(${this.startX + i * SortVisualizer.NODE_W}, ${yBase})`);

            g.append('rect')
                .attr('class', 'sort-bar')
                .attr('data-idx', i)
                .attr('x', 2)
                .attr('y', -SortVisualizer.NODE_H / 2)
                .attr('width', SortVisualizer.NODE_W - 4)
                .attr('height', SortVisualizer.NODE_H - 4)
                .attr('fill', isActive ? COLOR_ACTIVE : COLOR_ITEM)
                .attr('stroke', isPivot ? COLOR_PIVOT : COLOR_BORDER)
                .attr('stroke-width', isPivot ? 3 : 1.5)
                .attr('rx', 4);

            g.append('text')
                .attr('class', 'sort-val')
                .attr('data-idx', i)
                .attr('x', SortVisualizer.NODE_W / 2)
                .attr('y', 5)
                .attr('text-anchor', 'middle')
                .style('font-size', '17px')
                .style('font-family', '"JetBrains Mono", SimHei, monospace')
                .style('font-weight', 'bold')
                .style('fill', COLOR_TEXT)
                .text(value === null || value === undefined ? '' : String(value));

            if (isPivot) {
                g.append('text')
                    .attr('class', 'sort-pivot-tag')
                    .attr('x', SortVisualizer.NODE_W / 2)
                    .attr('y', SortVisualizer.NODE_H / 2 + 16)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '13px')
                    .style('font-weight', 'bold')
                    .style('fill', COLOR_PIVOT)
                    .text('P');
            }
        }
    }

    /**
     * 自适应 viewBox。
     * @param maxLen 最长行单元格数
     * @param tempCount 临时数组行数
     */
    private fitViewBox(maxLen: number, tempCount: number): void {
        if (maxLen <= 0) {
            this.svg.attr('viewBox', '0 0 400 200');
            return;
        }
        const totalW = maxLen * SortVisualizer.NODE_W;
        const x0 = (SortVisualizer.CANVAS_W - totalW) / 2;
        const x1 = x0 + totalW;
        const bottom = tempCount > 0
            ? SortVisualizer.TEMP_Y
                + Math.max(0, tempCount - 1) * SortVisualizer.TEMP_GAP
                + SortVisualizer.NODE_H / 2
                + 30
            : SortVisualizer.MAIN_Y + SortVisualizer.NODE_H / 2 + 30;
        const height = Math.max(460, bottom - 30);
        this.svg.attr(
            'viewBox',
            `${Math.max(0, x0 - 40)} 30 ${Math.min(SortVisualizer.CANVAS_W, x1 - x0 + 80)} ${height}`,
        );
    }

    /************************************************** */
    // 辅助方法

    /**
     * 获取某个数组节点当前的可视化数据。
     * @param nodeId 节点 id
     */
    private getVisualData(nodeId: number): (number | null)[] | null {
        if (this.mainNode && this.mainNode.getId() === nodeId) {
            return this.mainData;
        }
        return this.tempData.get(nodeId) ?? null;
    }

    /**
     * 查找单元格。
     * @param nodeId 节点 id
     * @param idx 索引
     */
    private findCell(
        nodeId: number,
        idx: number,
    ): d3.Selection<SVGGElement, unknown, null, undefined> {
        return this.mainGroup.select<SVGGElement>(
            `g.sort-item[data-node-id="${nodeId}"][data-idx="${idx}"]`,
        );
    }

    /**
     * 计算单元格绝对位置。
     * @param nodeId 节点 id
     * @param idx 索引
     */
    private cellPosition(nodeId: number, idx: number): { x: number; y: number } {
        return {
            x: this.startX + idx * SortVisualizer.NODE_W,
            y: this.rowYById.get(nodeId) ?? SortVisualizer.MAIN_Y,
        };
    }

    /**
     * 判断节点是否为排序节点。
     * @param node 数组节点
     */
    private asSortNode(node: ArrayNode | null): SortArrayNode | null {
        if (node instanceof QuickSortNode || node instanceof BubbleSortNode ||
            node instanceof InsertionSortNode || node instanceof MergeSortNode) {
            return node;
        }
        return null;
    }

    /**
     * 清空可视化器状态。
     */
    clear(): void {
        super.clear();
        this.mainNode = null;
        this.mainData = [];
        this.visualColor = [];
        this.visualPivot = null;
        this.tempData.clear();
        this.tempOrder = [];
        this.previewData = null;
        this.rowYById.clear();
        this.startX = 0;
    }
}
