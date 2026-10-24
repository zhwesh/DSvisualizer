import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
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
import { BubbleSortNode } from '../node/ArrayNode/impl/BubbleSortNode';
import { InsertionSortNode } from '../node/ArrayNode/impl/InsertionSortNode';
import { MergeSortNode } from '../node/ArrayNode/impl/MergeSortNode';

/************************************************** */
// 配色常量（与设计图风格一致）
const COLOR_DEFAULT = '#ffffff';
const COLOR_HIGHLIGHT = '#ffeaa7';   // 修改/新增闪黄色
const COLOR_COMPARE = '#74b9ff';     // 比较/交换闪蓝色
const COLOR_GREEN = '#2ecc71';
const COLOR_RED = '#e74c3c';
const COLOR_GRAY = '#bdc3c7';
const COLOR_BLUE = '#3498db';
const COLOR_POINTER = '#e67e22';     // 指针用橙色，区分于数据

// SVG 组的类型别名，避免各处重复写完整的 d3.Selection 泛型
type SvgGroup = d3.Selection<SVGGElement, unknown, null, undefined>;

// 数组单元格可能存放的值（KMP 的字符行也会复用这套渲染逻辑）
type ArrayCellValue = string | number | null;

// 一个数组节点渲染出来的其中一行（例如 data / tree / sz / template / next）
interface ArrayRow {
    key: string;
    label: string;
    values: ArrayCellValue[];
}

// 一个数组节点的渲染信息和布局信息
interface ArrayGroupInfo {
    node: ArrayNode;
    group: SvgGroup;
    cellWidth: number;
    cellHeight: number;
    startX: number;
    startY: number;
    label: string;
}

// 一次交换动作：支持同数组内部交换和两个数组之间的交换
interface SwapAction {
    nodeId: number;
    idx1: number;
    otherId: number;
    idx2: number;
}

/**
 * 数组可视化器
 * 处理 ArrayNode 及其子类（栈/队列/堆/树状数组/KMP节点等）的渲染和动画。
 *
 * ============================== 动画设计 ==============================
 *
 * 约束：
 * 1. 算法层用 StepController 划分“步骤”，一个步骤内可能执行多个原子操作。
 * 2. opHook 是同步回调，可视化层不能回调算法层去 await 动画。
 * 3. 因此不能修改算法层来“每个交换 wait 一次”，只能在可视化层把同一批
 *    原子操作排队，然后依次播放。
 *
 * 以顺序表在索引 0 处插入为例：
 *
 *   算法层（一个 wait 区间内）：
 *     for (i = sz; i > 0; --i) arr._swap_value(i, arr, i - 1);
 *
 *   可视化层实际执行：
 *     _swap_value 入队 -> _swap_value 入队 -> _swap_value 入队
 *     -> 播放第1次交换 -> 播放第2次交换 -> 播放第3次交换
 *
 * 关键点：
 * - `visualData` 是“可视化层当前显示的数据”，不是算法层的最终数据。
 *   算法层可能已经完成了后续交换，因此 renderGroup 必须读 visualData，
 *   不能直接读 node.data，否则排队中的动画会被最终状态覆盖。
 * - 所有数据动作和展示动作都进入 BaseVisualizer.animations 统一调度；
 *   同一时刻只播放一个 effect。
 * - 不只是 swap：set / add / swap-array / delete 也会入队。这样顺序表插入
 *   循环结束后紧接着的 _set_value，以及扩容末尾的 _swap_array，都不会
 *   越过尚未播完的交换动画。
 * - 颜色、指针等展示属性也进入同一个队列，不会插队到交换动画中间。
 * ====================================================================
 */
export class ArrayVisualizer extends BaseVisualizer {
    // 数组节点 ID -> 渲染信息（DOM 组、单元格尺寸、布局起点等）
    private arrayNodes: Map<number, ArrayGroupInfo> = new Map();
    private mainArrayId: number | null = null;

    // 数组节点 ID -> 可视化层当前显示的数据快照。
    // 这是动画期间渲染的唯一数据源，用来避免“算法层已完成、但动画还没播完”。
    private visualData: Map<number, (number | null)[]> = new Map();



    // 下一个数组组的起始 Y 坐标（同一页面可能同时存在主数组和扩容临时数组）
    private nextArrayY: number = 80;
    private static readonly CELL_WIDTH = 60;
    private static readonly CELL_HEIGHT = 50;
    private static readonly CANVAS_W = 1200;
    private static readonly ROW_GAP = 24;       // 附加行与主行的垂直间距
    private static readonly ARRAY_GAP = 130;    // 两个数组组之间的垂直间距
    private static readonly BIT_BAR_BASE_GAP = 24;   // 最低层覆盖条与 data 行的距离
    private static readonly BIT_BAR_LEVEL_GAP = 24;  // 相邻覆盖条层之间的垂直距离
    private static readonly BIT_BAR_HEIGHT = 7;
    private static readonly BIT_TREE_HEIGHT = 36;    // 覆盖条上方的 tree 数组行
    private static readonly BIT_TREE_GAP = 18;       // tree 行与最高层覆盖条的间距

    // 一次批量交换动画的总时间预算（毫秒）。队列越长，单次交换越快，
    // 避免在“一个步骤内移动很多元素”时动画严重落后于算法层。
    private static readonly SWAP_BUDGET_MS = 600;
    private static readonly SWAP_MIN_MS = 60;
    private static readonly SWAP_MAX_MS = 150;

    /**
     * 接收算法层原子操作的回调入口。
     *
     * 按“是否改变数组数据”分成两类：
     * - 改变数据：_create / _add_value / _set_value / _swap_value /
     *   _swap_array / _delete。它们会进入动画队列，避免算法层连续调用时
     *   多个动作在同一帧里直接覆盖 DOM。
     * - 只改变显示属性：指针、颜色、树状数组覆盖条等。它们直接重绘，
     *   因为不涉及数据顺序，提前显示不会破坏交换动画。
     *
     * @param node 触发原子操作的节点
     * @param method 原子方法名
     * @param args 原子方法参数
     */
    onOp(node: object, method: string, args: unknown[]): void {
        if (!(node instanceof ArrayNode)) {
            return;
        }
        const arrNode = node;

        switch (method) {
            case '_create':
                this.handleCreate(arrNode);
                break;
            case '_add_value':
                this.handleAddValue(arrNode, args[0] as number | null);
                break;
            case '_set_value':
                this.handleSetValue(arrNode, args[0] as number, args[1] as number | null);
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
            case '_set_top':          // 栈顶指针
            case '_set_head':         // 队首指针
            case '_set_tail':         // 队尾指针
            case '_set_pivot':        // 快排枢轴
            case '_set_str_ptr':      // KMP 待匹配串指针
            case '_set_template_ptr': // KMP 模式串指针
            case '_align':            // KMP 对齐
                this.enqueueRender(arrNode.getId());
                break;
            case '_set_size':         // 并查集集合大小
                this.enqueueRender(arrNode.getId());
                break;
            case '_set_tree':         // 树状数组值
            case '_set_tree_color':   // 树状数组覆盖条颜色
            case '_set_data_color':   // 树状数组原始数据颜色
            case '_clear_color':      // 清空颜色
            case '_set_color':        // 排序节点数据颜色
            case '_set_prefix_color': // KMP 前缀色
            case '_set_suffix_color': // KMP 后缀色
                this.enqueueRender(arrNode.getId());
                break;
            default:
                break;
        }
    }

    /**
     * 将一次数组重绘加入动画队列。
     * @param nodeId 数组节点 id
     */
    private enqueueRender(nodeId: number): void {
        this.animations.enqueue(async () => {
            this.renderGroup(this.arrayNodes.get(nodeId));
            await this.delay(0);
        });
    }

    /**
     * 获取数组主行的标签。
     * 不同子类使用不同标签，便于区分 stack / queue / father / data / str / arr。
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
     * 计算一个数组节点当前需要渲染的所有行。
     *
     * 注意：主行从 visualData 读取，而不是 node.data。
     * 这是因为算法层可能已经执行完整批交换，而可视化层还在播放队列中的动画；
     * 如果这里直接读 node.data，下一次重绘就会把动画过程直接跳到最终状态。
     *
     * 非主行（KMP 的 template/next、并查集的 sz、树状数组的 tree）目前不参与
     * 交换队列，因此仍直接读取节点自身的数据。
     */
    private buildRows(node: ArrayNode): ArrayRow[] {
        const rows: ArrayRow[] = [];

        // 主行：data 数组（KMP 的主串按字符展开）
        // 树状数组的 0 号位不使用，因此这里从 1 开始截取，画面上只出现 data[1..n]。
        const rawData = this.visualData.get(node.getId()) ?? node.data;
        const mainValues: ArrayCellValue[] = node instanceof KMPNode
            ? Array.from(node.str)
            : node instanceof BinaryIndexedTreeNode
                ? rawData.slice(1)
                : [...rawData];
        rows.push({ key: 'data', label: this.getLabel(node), values: mainValues });

        // KMP：模式串行 + next 数组行
        if (node instanceof KMPNode) {
            rows.push({ key: 'template', label: 'template', values: Array.from(node.template) });
            rows.push({ key: 'next', label: 'next', values: [...node.data] });
        }
        // 并查集：集合大小数组行（ArrayVisualizer 不使用，由 UnionFindVisualizer 渲染）
        if (node instanceof UnionFindSetNode) {
            rows.push({ key: 'sz', label: 'sz', values: node.sz.map(v => v as number | null) });
        }
        // 树状数组不再绘制 tree 行，tree[i] 由 data 上方的覆盖条表示
        return rows;
    }

    /**
     * 计算单元格填充颜色（依据节点状态）
     */
    private cellFill(node: ArrayNode, rowKey: string, idx: number, isCover: boolean): string {
        if (rowKey === 'data') {
            if (node instanceof BinaryIndexedTreeNode) {
                // 树状数组的 data 行只渲染 data[1..n]，显示下标 idx 对应原始下标 idx + 1
                if (node.dataColor?.[idx + 1] === true) return COLOR_GREEN;
            } else if (node instanceof KMPNode) {
                // data 行即 next 数组：无色
                return COLOR_DEFAULT;
            } else if (node instanceof QuickSortNode || node instanceof BubbleSortNode ||
                       node instanceof InsertionSortNode || node instanceof MergeSortNode) {
                // 排序节点：绿色高亮
                if (node.color?.[idx] === true) return COLOR_GREEN;
            }
        }
        if (rowKey === 'template' && node instanceof KMPNode) {
            if (node.prefixColor?.[idx] === true) return COLOR_BLUE;
            if (node.suffixColor?.[idx] === true) return COLOR_GREEN;
        }
        if (rowKey === 'tree' && node instanceof BinaryIndexedTreeNode) {
            const c = node.treeColor?.[idx];
            if (c === BinaryIndexedTree_TREE_GREEN) return COLOR_GREEN;
            if (c === BinaryIndexedTree_TREE_RED) return COLOR_RED;
            return COLOR_GRAY;
        }
        if (isCover && node instanceof BinaryIndexedTreeNode) {
            const c = node.treeColor?.[idx];
            if (c === BinaryIndexedTree_TREE_GREEN) return COLOR_GREEN;
            if (c === BinaryIndexedTree_TREE_RED) return COLOR_RED;
            return COLOR_GRAY;
        }
        return COLOR_DEFAULT;
    }

    /**
     * 处理数组创建（_create）。
     *
     * 新数组会获得一份独立的 visualData 快照，并立即渲染。
     * 扩容时同类型数组的第二次创建会被标记为临时数组（tmp），
     * 它会出现在主数组下方，后续 _swap_value 会在两个数组之间显示拷贝动画。
     */
    private handleCreate(node: ArrayNode): void {
        const id = node.getId();
        if (this.mainArrayId === null) {
            this.mainArrayId = id;
        }

        // 初始化可视化快照，之后由原子操作逐项更新
        this.visualData.set(id, [...node.data]);

        const startX = 80;
        const startY = this.nextArrayY;
        const cellWidth = ArrayVisualizer.CELL_WIDTH;
        const cellHeight = ArrayVisualizer.CELL_HEIGHT;

        // 创建数组组
        const group = this.mainGroup.append('g')
            .attr('class', 'array-group')
            .attr('data-id', id);

        const rows = this.buildRows(node);
        // 同类型数组第二次出现通常是扩容时创建的临时数组，标签显示为 tmp
        const isTemp = [...this.arrayNodes.values()].some(
            info => info.node !== node && info.node.constructor === node.constructor,
        );
        this.arrayNodes.set(id, {
            node,
            group,
            cellWidth,
            cellHeight,
            startX,
            startY,
            label: isTemp ? 'tmp' : rows[0].label,
        });

        this.renderGroup(this.arrayNodes.get(id)!);
        this.nextArrayY += ArrayVisualizer.ARRAY_GAP;
    }

    /**
     * 渲染一个数组组：标签 + 各行单元格 + 树状数组覆盖条 + 指针 + viewBox。
     *
     * 这个方法每次都会根据 visualData 重新计算单元格位置和文本。
     * 交换动画结束后会调用它把移动过的单元格“归位”到正常索引位置，
     * 同时把 visualData 中已经交换好的值显示出来。
     */
    private renderGroup(info: ArrayGroupInfo | undefined): void {
        if (!info) return;
        const { node, group, startY, cellWidth, cellHeight } = info;
        // 数据行来自 visualData，附加行来自节点自身（见 buildRows 注释）
        const rows = this.buildRows(node);

        // 数组整体以画布中心水平居中（按最长一行宽度计算），数据少时居中、多时保持可读
        const maxLen = Math.max(...rows.map(r => r.values.length));
        const startX = Math.max(80, (ArrayVisualizer.CANVAS_W - maxLen * cellWidth) / 2);
        info.startX = startX;   // 写回，供指针/覆盖条渲染保持同一起点

        // 1. 数组标签：右对齐到单元格左侧，长标签也不会压住第一格
        group.selectAll('.array-label').remove();
        group.append('text')
            .attr('class', 'array-label')
            .attr('x', startX - 12)
            .attr('y', startY + cellHeight / 2 + 5)
            .attr('text-anchor', 'end')
            .style('font-size', '14px')
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('fill', '#555')
            .text(info.label);

        // 2. 逐行渲染单元格
        // 以“行 key + 列索引”作为数据绑定键：交换后每列的 DOM 元素不变，
        // 只更新 transform 和文本，因此可以稳定地做位置过渡。
        rows.forEach((row, r) => {
            const rowY = startY + r * (cellHeight + ArrayVisualizer.ROW_GAP);
            const cells = group.selectAll<SVGGElement, ArrayCellValue>(`.cell.row-${row.key}`)
                .data<ArrayCellValue>(row.values, (_d: unknown, i: number) => i);

            // enter：创建单元格（一次捕获 enter 选择，后续合并复用）
            const enterCells = cells.enter()
                .append('g')
                .attr('class', `cell row-${row.key}`)
                .attr('transform', (_d: unknown, i: number) => `translate(${startX + i * cellWidth}, ${rowY})`);

            enterCells.each(function (this: SVGGElement, _d: unknown) {
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
                    .style('font-family', '"JetBrains Mono", SimHei, monospace')
                    .text((d: unknown) => d !== null && d !== undefined ? String(d) : '');
            });

            // 更新：位置 + 值 + 颜色（enter 与 update 合并）
            cells.merge(enterCells)
                .attr('transform', (_d: unknown, i: number) => `translate(${startX + i * cellWidth}, ${rowY})`)
                .select('.cell-value')
                .text((d: unknown) => d !== null && d !== undefined ? String(d) : '');

            cells.select('.cell-rect')
                .attr('fill', (_d: unknown, i: number) => this.cellFill(node, row.key, i, false));

            cells.exit().remove();
        });

        // 3. 树状数组下标（data 行只显示 data[1..n]，因此下标从 1 开始）
        group.selectAll('.array-index-label').remove();
        if (node instanceof BinaryIndexedTreeNode) {
            for (let i = 0; i < maxLen; ++i) {
                group.append('text')
                    .attr('class', 'array-index-label')
                    .attr('x', startX + i * cellWidth + cellWidth / 2)
                    .attr('y', startY + cellHeight + 16)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '10px')
                    .style('font-family', '"JetBrains Mono", SimHei, monospace')
                    .style('fill', '#98a2b3')
                    .text(String(i + 1));
            }
        }

        // 4. 树状数组：覆盖条 + 上方的 tree 数组行 + 右侧对齐虚线
        //
        // tree[i] 不画成普通数据行，而是放在 data 上方的独立 tree 行中：
        //   - 覆盖条区间 (i-lowbit(i), i] 对齐 data 列
        //   - 覆盖条层级 = log2(lowbit(i))，长区间在上、短区间在下
        //   - 覆盖条颜色由 treeColor[i] 决定：灰/绿/红
        //   - tree[i] 单元格右边缘用虚线向下对齐到对应覆盖条右端
        if (node instanceof BinaryIndexedTreeNode) {
            group.selectAll('.cover-bar').remove();
            group.selectAll('.bit-tree-row').remove();

            const n = node.data.length - 1;
            const maxLevel = n > 0 ? Math.floor(Math.log2(n)) : 0;
            const baseY = startY - ArrayVisualizer.BIT_BAR_BASE_GAP;
            const topBarY = baseY - maxLevel * ArrayVisualizer.BIT_BAR_LEVEL_GAP;
            const treeRowY = topBarY - ArrayVisualizer.BIT_TREE_GAP - ArrayVisualizer.BIT_TREE_HEIGHT;

            // 4.1 覆盖条
            for (let i = 1; i <= n; ++i) {
                const lb = i & -i;
                const level = Math.round(Math.log2(lb));
                const barY = baseY - level * ArrayVisualizer.BIT_BAR_LEVEL_GAP;
                const x1 = startX + (i - lb) * cellWidth;
                const x2 = startX + i * cellWidth;
                group.append('g')
                    .attr('class', 'cover-bar')
                    .append('rect')
                    .attr('x', x1)
                    .attr('y', barY)
                    .attr('width', Math.max(2, x2 - x1))
                    .attr('height', ArrayVisualizer.BIT_BAR_HEIGHT)
                    .attr('rx', 2)
                    .attr('fill', this.cellFill(node, 'tree', i, true))
                    .attr('stroke', '#777')
                    .attr('stroke-width', 0.8)
                    .style('opacity', 0.9);
            }

            // 4.2 tree 数组行
            const treeRow = group.append('g').attr('class', 'bit-tree-row');
            treeRow.append('text')
                .attr('x', startX - 12)
                .attr('y', treeRowY + ArrayVisualizer.BIT_TREE_HEIGHT / 2 + 5)
                .attr('text-anchor', 'end')
                .style('font-size', '14px')
                .style('font-family', '"JetBrains Mono", SimHei, monospace')
                .style('fill', '#555')
                .text('tree');

            for (let i = 1; i <= n; ++i) {
                const cellX = startX + (i - 1) * cellWidth;
                const cell = treeRow.append('g')
                    .attr('class', 'bit-tree-cell')
                    .attr('data-idx', i)
                    .attr('transform', `translate(${cellX}, ${treeRowY})`);

                cell.append('rect')
                    .attr('width', cellWidth)
                    .attr('height', ArrayVisualizer.BIT_TREE_HEIGHT)
                    .attr('fill', '#f8fafc')
                    .attr('stroke', '#98a2b3')
                    .attr('stroke-width', 1);

                cell.append('text')
                    .attr('x', cellWidth / 2)
                    .attr('y', ArrayVisualizer.BIT_TREE_HEIGHT / 2 + 5)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '14px')
                    .style('font-weight', 'bold')
                    .style('font-family', '"JetBrains Mono", SimHei, monospace')
                    .style('fill', '#2d3748')
                    .text(node.tree[i] === null || node.tree[i] === undefined ? '' : String(node.tree[i]));

                // 单元格右边缘 -> 对应覆盖条右端的虚线
                const lb = i & -i;
                const level = Math.round(Math.log2(lb));
                const barY = baseY - level * ArrayVisualizer.BIT_BAR_LEVEL_GAP;
                const lineX = startX + i * cellWidth;
                treeRow.append('line')
                    .attr('class', 'bit-tree-guide')
                    .attr('x1', lineX)
                    .attr('y1', treeRowY + ArrayVisualizer.BIT_TREE_HEIGHT)
                    .attr('x2', lineX)
                    .attr('y2', barY - 2)
                    .attr('stroke', '#9aa7b5')
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '4,4')
                    .style('opacity', 0.9);
            }
        }

        // 5. 指针渲染
        this.renderPointers(info);

        // 6. 自适应 viewBox：数组包围盒自动填满画布，任何窗口宽度下数值都清晰可读
        this.fitViewBox();
    }

    /**
     * 树状数组在 data 行上方占用的总高度：
     * 最高层覆盖条 + 间距 + tree 数组行。
     */
    private bitBarTopOffset(node: BinaryIndexedTreeNode): number {
        const n = node.data.length - 1;
        const maxLevel = n > 0 ? Math.floor(Math.log2(n)) : 0;
        return ArrayVisualizer.BIT_BAR_BASE_GAP
            + maxLevel * ArrayVisualizer.BIT_BAR_LEVEL_GAP
            + ArrayVisualizer.BIT_TREE_GAP
            + ArrayVisualizer.BIT_TREE_HEIGHT
            + 14;
    }

    /**
     * 根据当前所有数组的实际包围盒自适应 viewBox，使数组始终填满画布中心
     */
    private fitViewBox(): void {
        if (this.arrayNodes.size === 0) {
            this.svg.attr('viewBox', '0 0 1200 600');
            return;
        }
        // 左侧留出数组标签（template 等较长标签）的宽度，右侧只留少量边距
        const PAD_LEFT = 96;
        const PAD_RIGHT = 56;
        const PAD_Y = 60;   // 容纳上下两侧的指针名与共享箭头
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        this.arrayNodes.forEach(info => {
            const rows = this.buildRows(info.node);
            const maxLen = Math.max(...rows.map(r => r.values.length));
            const startX = Math.max(80, (ArrayVisualizer.CANVAS_W - maxLen * info.cellWidth) / 2);
            const totalW = maxLen * info.cellWidth;
            const totalH = rows.length * info.cellHeight + (rows.length - 1) * ArrayVisualizer.ROW_GAP;
            minX = Math.min(minX, startX);
            maxX = Math.max(maxX, startX + totalW);
            const topY = info.node instanceof BinaryIndexedTreeNode
                ? info.startY - this.bitBarTopOffset(info.node)
                : info.startY;
            minY = Math.min(minY, topY);
            maxY = Math.max(maxY, info.startY + totalH);
        });
        const contentW = (maxX - minX) + PAD_LEFT + PAD_RIGHT;
        const contentH = (maxY - minY) + 2 * PAD_Y;
        let w = Math.max(contentW, 340);
        const h = Math.max(contentH, 160);
        // 保持水平居中：视图不小于内容宽度时，把数组水平置于视图中央
        let x0 = minX - PAD_LEFT;
        if (w > contentW) {
            x0 -= (w - contentW) / 2;
        }
        this.svg.attr('viewBox', `${x0} ${minY - PAD_Y} ${w} ${h}`);
    }

    /**
     * 渲染指针（栈顶/队首队尾/快排枢轴/KMP指针）
     */
    private renderPointers(info: ArrayGroupInfo): void {
        const { node, group, startX, startY, cellWidth, cellHeight } = info;
        group.selectAll('.pointer').remove();

        // 主行下方渲染指针
        const rowY = startY;

        if (this.mainGroup.select('#array-pointer-arrow').empty()) {
            this.mainGroup.append('defs').append('marker')
                .attr('id', 'array-pointer-arrow')
                .attr('viewBox', '0 0 10 10')
                .attr('refX', 9)
                .attr('refY', 5)
                .attr('markerWidth', 5)
                .attr('markerHeight', 5)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M 0 0 L 10 5 L 0 10 z')
                .attr('fill', COLOR_POINTER);
        }

        const addPointer = (
            idx: number | null | undefined,
            label: string,
            above: boolean,
            offsetX: number = 0,
            pointerRowY: number = rowY,
        ): void => {
            if (idx === null || idx === undefined) return;
            const x = startX + idx * cellWidth + cellWidth / 2;
            const labelX = x + offsetX;
            const cellBottom = pointerRowY + cellHeight;
            const g = group.append('g').attr('class', 'pointer');
            if (above) {
                g.append('text')
                    .attr('x', labelX)
                    .attr('y', pointerRowY - 34)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '12px')
                    .style('fill', COLOR_POINTER)
                    .text(label);
                g.append('line')
                    .attr('x1', labelX)
                    .attr('y1', pointerRowY - 28)
                    .attr('x2', x)
                    .attr('y2', pointerRowY - 4)
                    .attr('stroke', COLOR_POINTER)
                    .attr('stroke-width', 1.3)
                    .attr('marker-end', 'url(#array-pointer-arrow)');
            } else {
                g.append('text')
                    .attr('x', labelX)
                    .attr('y', cellBottom + 40)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '12px')
                    .style('fill', COLOR_POINTER)
                    .text(label);
                g.append('line')
                    .attr('x1', labelX)
                    .attr('y1', cellBottom + 29)
                    .attr('x2', x)
                    .attr('y2', cellBottom + 4)
                    .attr('stroke', COLOR_POINTER)
                    .attr('stroke-width', 1.3)
                    .attr('marker-end', 'url(#array-pointer-arrow)');
            }
        };

        const addSharedPointer = (idx: number | null | undefined, labels: string[]): void => {
            if (idx === null || idx === undefined) return;
            const x = startX + idx * cellWidth + cellWidth / 2;
            const cellBottom = rowY + cellHeight;
            const g = group.append('g').attr('class', 'pointer');
            g.append('line')
                .attr('x1', x)
                .attr('y1', cellBottom + 20)
                .attr('x2', x)
                .attr('y2', cellBottom + 4)
                .attr('stroke', COLOR_POINTER)
                .attr('stroke-width', 1.3)
                .attr('marker-end', 'url(#array-pointer-arrow)');
            labels.forEach((label, i) => {
                g.append('text')
                    .attr('x', x)
                    .attr('y', cellBottom + 34 + i * 16)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '12px')
                    .style('fill', COLOR_POINTER)
                    .text(label);
            });
        };

        if (node instanceof ArrayStackNode) {
            addPointer(node.top, 'top', true);
        }
        if (node instanceof ArrayQueueNode) {
            if (node.head !== null && node.head === node.tail) {
                addSharedPointer(node.head, ['head', 'tail']);
            } else {
                addPointer(node.head, 'head', false);
                addPointer(node.tail, 'tail', false);
            }
        }
        if (node instanceof QuickSortNode) {
            addPointer(node.pivot, 'pivot', true);
        }
        if (node instanceof KMPNode) {
            const rowY2 = startY + (cellHeight + ArrayVisualizer.ROW_GAP);
            // str 指针指向 str 行
            addPointer(node.strPtr, 'strPtr', false, 0, rowY);
            // template 指针指向 template 行
            addPointer(node.templatePtr, 'tPtr', false, 0, rowY2);
        }
    }

    /************************************************** */
    // 数据动作入口

    /**
     * 处理 _add_value：在数组末尾追加一个值。
     * @param node 数组节点
     * @param val 追加值
     */
    private handleAddValue(node: ArrayNode, val: number | null): void {
        this.animations.enqueue(() => this.applyAddValue(node.getId(), val));
    }

    /**
     * 处理 _set_value：修改某个索引的值。
     * @param node 数组节点
     * @param idx 索引
     * @param val 新值
     */
    private handleSetValue(node: ArrayNode, idx: number, val: number | null): void {
        this.animations.enqueue(() => this.applySetValue(node.getId(), idx, val));
    }

    /**
     * 处理 _swap_value：交换两个单元格的值。
     * 同数组交换和跨数组交换都进入统一动画队列。
     *
     * @param node 第一个数组节点
     * @param idx1 第一个索引
     * @param other 第二个数组节点
     * @param idx2 第二个索引
     */
    private handleSwapValue(node: ArrayNode, idx1: number, other: ArrayNode, idx2: number): void {
        this.animations.enqueue(() => this.playSwapAction({
            nodeId: node.getId(),
            idx1,
            otherId: other.getId(),
            idx2,
        }));
    }

    /**
     * 播放一次交换动画。
     * 单元格移动到对方位置后交换快照，再恢复到正常索引位置。
     *
     * @param action 交换动作
     */
    private async playSwapAction(action: SwapAction): Promise<void> {
        const info1 = this.arrayNodes.get(action.nodeId);
        const info2 = this.arrayNodes.get(action.otherId);
        const data1 = this.visualData.get(action.nodeId);
        const data2 = this.visualData.get(action.otherId);

        if (!info1 || !info2 || !data1 || !data2) {
            this.swapVisualValues(action);
            await this.delay(0);
            return;
        }

        const cell1 = info1.group.selectAll<SVGGElement, ArrayCellValue>('.cell.row-data')
            .filter((_d: unknown, i: number) => i === action.idx1);
        const cell2 = info2.group.selectAll<SVGGElement, ArrayCellValue>('.cell.row-data')
            .filter((_d: unknown, i: number) => i === action.idx2);

        if (cell1.empty() || cell2.empty()) {
            this.swapVisualValues(action);
            this.renderGroup(info1);
            if (info2 !== info1) {
                this.renderGroup(info2);
            }
            await this.delay(0);
            return;
        }

        const duration = this.duration(this.swapDuration());
        const target1 = `translate(${info2.startX + action.idx2 * info2.cellWidth}, ${info2.startY})`;
        const target2 = `translate(${info1.startX + action.idx1 * info1.cellWidth}, ${info1.startY})`;

        const highlight1 = cell1.select('.cell-rect')
            .transition()
            .duration(Math.min(this.duration(120), duration))
            .attr('fill', COLOR_COMPARE)
            .end()
            .catch(() => undefined);
        const highlight2 = cell2.select('.cell-rect')
            .transition()
            .duration(Math.min(this.duration(120), duration))
            .attr('fill', COLOR_COMPARE)
            .end()
            .catch(() => undefined);
        const move1 = cell1.transition()
            .duration(duration)
            .attr('transform', target1)
            .end()
            .catch(() => undefined);
        const move2 = cell2.transition()
            .duration(duration)
            .attr('transform', target2)
            .end()
            .catch(() => undefined);

        await Promise.all([highlight1, highlight2, move1, move2]);
        this.swapVisualValues(action);
        this.renderGroup(info1);
        if (info2 !== info1) {
            this.renderGroup(info2);
        }
        await this.delay(0);
    }

    /**
     * 根据动画队列长度分配单次交换时长。
     */
    private swapDuration(): number {
        const remaining = Math.max(1, this.animations.pending());
        return Math.max(
            ArrayVisualizer.SWAP_MIN_MS,
            Math.min(ArrayVisualizer.SWAP_MAX_MS, Math.floor(ArrayVisualizer.SWAP_BUDGET_MS / remaining)),
        );
    }

    /**
     * 在可视化快照上执行一次交换。
     * @param action 交换动作
     */
    private swapVisualValues(action: SwapAction): void {
        const data1 = this.visualData.get(action.nodeId);
        const data2 = this.visualData.get(action.otherId);
        if (!data1 || !data2) {
            return;
        }
        const tmp = data1[action.idx1];
        data1[action.idx1] = data2[action.idx2];
        data2[action.idx2] = tmp;
    }

    /**
     * 立即应用一次“设值”动作（不再等待队列）。
     *
     * 只更新 visualData 和对应单元格文本，并闪一下黄色高亮。
     * 指针会重新渲染，因为栈顶/队尾等指针可能依赖数组数据。
     */
    private async applySetValue(nodeId: number, idx: number, val: number | null): Promise<void> {
        const info = this.arrayNodes.get(nodeId);
        const data = this.visualData.get(nodeId);
        if (data) {
            data[idx] = val;
        }
        if (!info) return;

        // 树状数组的 data[0] 不显示，原始下标 idx 对应画面第 idx-1 个格子
        const isBit = info.node instanceof BinaryIndexedTreeNode;
        const column = isBit ? idx - 1 : idx;
        const cell = info.group.selectAll<SVGGElement, ArrayCellValue>('.cell.row-data')
            .filter((_d: unknown, i: number) => i === column);

        if (isBit) {
            // 树状数组已经用 dataColor 绿色标记，不再额外闪黄色
            cell.select('.cell-rect')
                .interrupt()
                .attr('fill', this.cellFill(info.node, 'data', column, false));
        } else {
            await cell.select('.cell-rect')
                .transition()
                .duration(this.duration(120))
                .attr('fill', COLOR_HIGHLIGHT)
                .transition()
                .duration(this.duration(180))
                .attr('fill', () => this.cellFill(info.node, 'data', column, false))
                .end()
                .catch(() => undefined);
        }

        const value = data ? data[idx] : val;
        cell.select('.cell-value')
            .text(value !== null && value !== undefined ? String(value) : '');

        this.renderPointers(info);
    }

    /**
     * 立即应用一次“末尾追加”动作。
     * 快照长度增加后整体重绘，新单元格才会出现在正确位置。
     */
    private async applyAddValue(nodeId: number, val: number | null): Promise<void> {
        const info = this.arrayNodes.get(nodeId);
        const data = this.visualData.get(nodeId);
        if (data) {
            data.push(val);
        } else if (info) {
            // 兜底：正常情况下 _create 已初始化快照
            this.visualData.set(nodeId, [...info.node.data]);
        }
        this.renderGroup(info);
        await this.delay(20);
    }

    /**
     * 立即应用“交换整个数组”动作（扩容完成时使用）。
     *
     * 这里交换的是两份 visualData，而不是节点对象：
     * 主数组和临时数组的 DOM 组保持不变，只交换它们显示的数据。
     * 这样扩容拷贝动画结束后，主数组会平滑地显示拷贝后的内容。
     */
    private async applySwapArray(nodeId: number, otherId: number): Promise<void> {
        const info1 = this.arrayNodes.get(nodeId);
        const info2 = this.arrayNodes.get(otherId);
        const data1 = this.visualData.get(nodeId);
        const data2 = this.visualData.get(otherId);
        if (data1 && data2) {
            this.visualData.set(nodeId, data2);
            this.visualData.set(otherId, data1);
        } else {
            // 兜底：直接从节点当前数据重建快照
            if (info1) this.visualData.set(nodeId, [...info1.node.data]);
            if (info2) this.visualData.set(otherId, [...info2.node.data]);
        }
        this.renderGroup(info1);
        this.renderGroup(info2);
        await this.delay(20);
    }

    /**
     * 立即应用“删除数组”动作：淡出并移除 DOM 组和快照。
     */
    private async applyDelete(nodeId: number): Promise<void> {
        const info = this.arrayNodes.get(nodeId);
        if (nodeId === this.mainArrayId) {
            this.visualData.set(nodeId, []);
            if (info) {
                this.renderGroup(info);
                this.fitViewBox();
            }
            return;
        }

        this.visualData.delete(nodeId);
        if (!info) return;

        await info.group
            .transition()
            .duration(this.duration(220))
            .style('opacity', 0)
            .end()
            .catch(() => undefined);
        info.group.remove();

        this.arrayNodes.delete(nodeId);
        let nextY = 80;
        this.arrayNodes.forEach(item => {
            nextY = Math.max(nextY, item.startY + ArrayVisualizer.ARRAY_GAP);
        });
        this.nextArrayY = nextY;
        this.fitViewBox();
    }

    /**
     * 处理 _delete。
     * @param node 数组节点
     */
    private handleDelete(node: ArrayNode): void {
        this.animations.enqueue(() => this.applyDelete(node.getId()));
    }

    /**
     * 处理 _swap_array。
     * @param node 第一个数组节点
     * @param other 第二个数组节点
     */
    private handleSwapArray(node: ArrayNode, other: ArrayNode): void {
        this.animations.enqueue(() => this.applySwapArray(node.getId(), other.getId()));
    }

    /**
     * 销毁可视化器：停止队列、清理快照，然后移除整个 SVG 主组。
     */
    destroy(): void {
        this.arrayNodes.clear();
        this.visualData.clear();
        this.mainArrayId = null;
        super.destroy();
    }

    /**
     * 清空画布并重置所有布局/动画状态。
     * 切换数据结构时会通过 VisualizerManager.destroy() 间接调用到这里。
     */
    clear(): void {
        super.clear();
        this.arrayNodes.clear();
        this.visualData.clear();
        this.mainArrayId = null;
        this.nextArrayY = 80;
    }
}
