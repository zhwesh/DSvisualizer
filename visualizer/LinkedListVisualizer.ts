import { BaseVisualizer } from './BaseVisualizer';
import { DataNode } from '../node/DataNode';
import { LinkedNode } from '../node/LinkedNode/LinkedNode';
import { DoublyLinkedListNode } from '../node/LinkedNode/impl/DoublyLinkedNode';

/**
 * 链表可视化器
 * 处理单链表、双链表、循环链表、链式栈/队列/双端队列、哈希表链式桶的渲染和动画。
 *
 * 通过数据结构实例的原子操作（_set_head/_set_header/_set_tail/_set_array/_set_bucket）
 * 绑定当前数据结构，每次渲染都以数据结构的真实链式结构为唯一数据源。
 */
export class LinkedListVisualizer extends BaseVisualizer {
    // 已渲染过的节点集合（用于退出动画判断）
    private nodes: Map<number, LinkedNode<any>> = new Map();
    // 当前绑定的数据结构实例（LinkedList / DoubleLinkedList / CircularLinkedList / LinkedStack / LinkedQueue / LinkedDeque / HashTable）
    private ds: any = null;
    // 渲染模式：linear（带头节点链表/栈）/ sentinel（带哨兵节点的循环链表/队列/双端队列）/ hashtable（哈希表链式桶）
    private mode: 'linear' | 'sentinel' | 'hashtable' = 'linear';

    private static readonly NODE_WIDTH = 60;
    private static readonly NODE_HEIGHT = 50;
    private static readonly NODE_GAP = 36;
    private static readonly START_Y = 240;
    private static readonly CANVAS_W = 1200;
    private static readonly ROW_GAP = 90;       // 哈希表桶行之间的垂直间距

    // ---------- 原子操作分发 ----------
    onOp(node: DataNode, method: string, args: any[]): void {
        // 数据结构级操作（节点为数据结构实例本身）
        if (!(node instanceof LinkedNode)) {
            this.handleDsOp(node, method, args);
            return;
        }
        const linked = node as LinkedNode<any>;

        switch (method) {
            case '_create':
                this.nodes.set(linked.getId(), linked);
                this.render();
                break;
            case '_set_value':
                this.render();
                break;
            case '_set_next':
                this.render();
                break;
            case '_set_last':
                this.render();
                break;
            case '_delete':
                this.nodes.delete(linked.getId());
                this.render();
                break;
            default:
                break;
        }
    }

    /**
     * 处理数据结构级原子操作（绑定实例 + 重渲染）
     */
    private handleDsOp(node: any, method: string, _args: any[]): void {
        switch (method) {
            case '_create':
                // 数据结构实例被 create() 创建时绑定
                this.ds = node;
                this.mode = this.detectMode(node);
                this.render();
                break;
            case '_set_head':
                this.ds = node;
                this.mode = 'linear';
                this.render();
                break;
            case '_set_header':
                this.ds = node;
                this.mode = 'sentinel';
                this.render();
                break;
            case '_set_tail':
                this.ds = node;
                this.render();
                break;
            case '_set_array':
                this.ds = node;
                this.mode = 'hashtable';
                this.render();
                break;
            case '_set_bucket':
                this.ds = node;
                this.mode = 'hashtable';
                this.render();
                break;
            case '_clear':
                this.render();
                break;
            default:
                break;
        }
    }

    /**
     * 根据数据结构实例的方法形态判断渲染模式
     */
    private detectMode(node: any): 'linear' | 'sentinel' | 'hashtable' {
        if (node && typeof node === 'object' && Array.isArray(node.arr) && node.arr.length > 0) {
            return 'hashtable';
        }
        if (node && typeof node === 'object' && node.header !== undefined) {
            return 'sentinel';
        }
        return 'linear';
    }

    /**
     * 收集渲染布局
     */
    private collectLayout(): { node: LinkedNode<any>; x: number; y: number; isSentinel: boolean; bucket?: number }[] {
        const result: { node: LinkedNode<any>; x: number; y: number; isSentinel: boolean; bucket?: number }[] = [];
        if (!this.ds) return result;

        const step = LinkedListVisualizer.NODE_WIDTH + LinkedListVisualizer.NODE_GAP;

        if (this.mode === 'hashtable') {
            const arr: (LinkedNode<any> | null)[] = this.ds.arr;
            arr.forEach((headNode, idx) => {
                if (!headNode) return;
                // 每个桶按自身长度水平居中（节点宽 + 节点间隙）
                let len = 0;
                let t: LinkedNode<any> | null = headNode;
                while (t) { len++; t = t.next; }
                const totalW = len * LinkedListVisualizer.NODE_WIDTH + (len - 1) * LinkedListVisualizer.NODE_GAP;
                const bucketStartX = Math.max(60, (LinkedListVisualizer.CANVAS_W - totalW) / 2);
                let curr: LinkedNode<any> | null = headNode;
                let i = 0;
                const maxIter = 200;
                while (curr && i < maxIter) {
                    result.push({
                        node: curr,
                        x: bucketStartX + i * step,
                        y: LinkedListVisualizer.START_Y + idx * LinkedListVisualizer.ROW_GAP,
                        isSentinel: false,
                        bucket: idx,
                    });
                    curr = curr.next;
                    i++;
                }
            });
            return result;
        }

        // 链式结构：线性（head）或哨兵（header）
        const header = this.ds.header as (LinkedNode<any> | undefined);
        const start: LinkedNode<any> | null = this.mode === 'sentinel'
            ? (header ? header.next : null)
            : (this.ds.head ?? null);

        // 先统计节点总数，使整条链表水平居中（节点宽 + 节点间隙）
        let count = 0;
        let c = start;
        while (c && c !== header && count < 200) { count++; c = c.next; }
        if (this.mode === 'sentinel' && header) count += 1;   // 哨兵头
        const totalW = count > 0
            ? count * LinkedListVisualizer.NODE_WIDTH + (count - 1) * LinkedListVisualizer.NODE_GAP
            : 0;
        const startX = Math.max(60, (LinkedListVisualizer.CANVAS_W - totalW) / 2);

        if (this.mode === 'sentinel' && header) {
            result.push({
                node: header,
                x: startX,
                y: LinkedListVisualizer.START_Y,
                isSentinel: true,
            });
        }

        let curr = start;
        let index = this.mode === 'sentinel' ? 1 : 0;
        const maxIter = 200;
        while (curr && curr !== header && index < maxIter) {
            result.push({
                node: curr,
                x: startX + index * step,
                y: LinkedListVisualizer.START_Y,
                isSentinel: false,
            });
            curr = curr.next;
            index++;
        }
        return result;
    }

    /**
     * 渲染整条链表/哈希表
     */
    private render(): void {
        const layout = this.collectLayout();

        // 1. 箭头（在节点下层）
        this.renderArrows(layout);

        // 2. 节点
        const nodeGroups = this.mainGroup.selectAll('.linked-node')
            .data(layout, (d: any) => d.node.getId());

        const enterGroups = nodeGroups.enter()
            .append('g')
            .attr('class', (d: any) => d.isSentinel ? 'linked-node sentinel-node' : 'linked-node')
            .attr('data-id', (d: any) => d.node.getId())
            .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
            // 不做 opacity 淡入：避免与位置过渡同名 transition 互斥导致节点透明

        // 节点方框（单个矩形，同数组格子样式：方框 + 居中数字）
        enterGroups.append('rect')
            .attr('class', 'node-box')
            .attr('width', LinkedListVisualizer.NODE_WIDTH)
            .attr('height', LinkedListVisualizer.NODE_HEIGHT)
            .attr('fill', '#fff')
            .attr('stroke', '#333')
            .attr('stroke-width', 2);

        // 节点值文本（居中、加粗大字）
        enterGroups.append('text')
            .attr('class', 'node-value')
            .attr('x', LinkedListVisualizer.NODE_WIDTH / 2)
            .attr('y', LinkedListVisualizer.NODE_HEIGHT / 2 + 7)
            .attr('text-anchor', 'middle')
            .style('font-size', '20px')
            .style('font-family', 'monospace')
            .style('font-weight', 'bold')
            .text((d: any) => d.isSentinel ? 'H' : (d.node.val !== null ? String(d.node.val) : ''));

        // 哨兵节点虚线样式
        enterGroups.select('.node-box').attr('stroke-dasharray', (d: any) => d.isSentinel ? '4,3' : null);

        // 更新：位置
        nodeGroups.merge(enterGroups as any)
            .transition()
            .duration(300)
            .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);

        // 更新值文本（含双向 last 显示）
        this.mainGroup.selectAll('.linked-node').select('.node-value')
            .text((d: any) => d.isSentinel ? 'H' : (d.node.val !== null ? String(d.node.val) : ''));

        // 退出：直接移除（不做淡出，避免 opacity 残留导致节点透明）
        nodeGroups.exit().remove();

        // 3. 指针标签（top / header / tail）
        this.renderLabels(layout);

        // 4. 自适应 viewBox：链表包围盒自动填满画布，任何窗口宽度下节点数值都清晰可读
        this.fitViewBox(layout);
    }

    /**
     * 根据当前链表的实际包围盒自适应 viewBox，使链表始终填满画布中心
     */
    private fitViewBox(
        layout: { node: LinkedNode<any>; x: number; y: number; isSentinel: boolean; bucket?: number }[]
    ): void {
        if (!layout || layout.length === 0) {
            this.svg.attr('viewBox', '0 0 1200 600');
            return;
        }
        const W = LinkedListVisualizer.NODE_WIDTH;
        const H = LinkedListVisualizer.NODE_HEIGHT;
        const PAD = 28;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        layout.forEach(it => {
            minX = Math.min(minX, it.x);
            maxX = Math.max(maxX, it.x + W);
            minY = Math.min(minY, it.y);
            maxY = Math.max(maxY, it.y + H);
        });
        const contentW = (maxX - minX) + 2 * PAD;
        const contentH = (maxY - minY) + 2 * PAD;
        let w = Math.max(contentW, 340);
        let h = Math.max(contentH, 160);
        // 保持水平居中：视图不小于内容宽度时，把链表水平置于视图中央
        let x0 = minX - PAD;
        if (w > contentW) {
            x0 = minX - PAD - (w - contentW) / 2;
        }
        this.svg.attr('viewBox', `${x0} ${minY - PAD} ${w} ${h}`);
    }

    /**
     * 渲染节点之间的箭头（含双向 last 箭头与哈希表桶标签）
     */
    private renderArrows(
        layout: { node: LinkedNode<any>; x: number; y: number; isSentinel: boolean; bucket?: number }[]
    ): void {
        this.mainGroup.selectAll('.link-line').remove();
        this.mainGroup.selectAll('.link-arrowhead').remove();
        this.mainGroup.selectAll('.bucket-label').remove();

        // 箭头标记定义（复用单个 id）
        if (this.svg.select('#arrowhead').empty()) {
            this.svg.append('defs').append('marker')
                .attr('id', 'arrowhead')
                .attr('viewBox', '0 0 10 10')
                .attr('refX', 9)
                .attr('refY', 5)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M 0 0 L 10 5 L 0 10 z')
                .attr('fill', '#666');
        }

        for (let i = 0; i < layout.length - 1; i++) {
            const curr = layout[i];
            const next = layout[i + 1];
            const yBase = curr.y;

            // 同一行（桶）内才画箭头
            if (Math.abs(curr.y - next.y) > 1) continue;

            const x1 = curr.x + LinkedListVisualizer.NODE_WIDTH;
            const y1 = yBase + LinkedListVisualizer.NODE_HEIGHT / 2;
            const x2 = next.x;
            const y2 = next.y + LinkedListVisualizer.NODE_HEIGHT / 2;

            this.mainGroup.append('line')
                .attr('class', 'link-line')
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x2)
                .attr('y2', y2)
                .attr('stroke', '#666')
                .attr('stroke-width', 2)
                .attr('marker-end', 'url(#arrowhead)');

            // 双向链表：画 last 回指箭头
            if (curr.node instanceof DoublyLinkedListNode && next.node instanceof DoublyLinkedListNode) {
                this.mainGroup.append('line')
                    .attr('class', 'link-line')
                    .attr('x1', next.x + LinkedListVisualizer.NODE_WIDTH / 2)
                    .attr('y1', yBase + LinkedListVisualizer.NODE_HEIGHT - 8)
                    .attr('x2', curr.x + LinkedListVisualizer.NODE_WIDTH / 2)
                    .attr('y2', yBase + LinkedListVisualizer.NODE_HEIGHT - 8)
                    .attr('stroke', '#aaa')
                    .attr('stroke-width', 1.2)
                    .attr('marker-end', 'url(#arrowhead)')
                    .style('opacity', 0.7);
            }
        }

        // 循环链表/双端队列：末尾节点回指哨兵
        if (this.mode === 'sentinel' && layout.length >= 2) {
            const headerItem = layout[0];
            const lastItem = layout[layout.length - 1];
            const isCircular = lastItem.node.next === headerItem.node;
            if (isCircular) {
                const x1 = lastItem.x + LinkedListVisualizer.NODE_WIDTH;
                const y1 = lastItem.y + LinkedListVisualizer.NODE_HEIGHT / 2;
                const x2 = headerItem.x;
                const y2 = headerItem.y + LinkedListVisualizer.NODE_HEIGHT / 2;
                // 圆弧回指：使用二次贝塞尔
                this.mainGroup.append('path')
                    .attr('class', 'link-line')
                    .attr('d', `M ${x1} ${y1} C ${x1 + 60} ${y1 - 40}, ${x2 - 60} ${y2 - 40}, ${x2} ${y2}`)
                    .attr('fill', 'none')
                    .attr('stroke', '#666')
                    .attr('stroke-width', 2)
                    .attr('marker-end', 'url(#arrowhead)');
            }
        }

        // 哈希表：桶索引标签
        if (this.mode === 'hashtable') {
            const bucketSet = new Map<number, number>();
            layout.forEach(item => {
                if (item.bucket !== undefined && !bucketSet.has(item.bucket)) {
                    bucketSet.set(item.bucket, item.x);
                }
            });
            bucketSet.forEach((x, bucket) => {
                this.mainGroup.append('text')
                    .attr('class', 'bucket-label')
                    .attr('x', x - 30)
                    .attr('y', LinkedListVisualizer.START_Y + bucket * LinkedListVisualizer.ROW_GAP + LinkedListVisualizer.NODE_HEIGHT / 2 + 5)
                    .style('font-size', '13px')
                    .style('font-family', 'monospace')
                    .style('fill', '#7f8c8d')
                    .text('[' + bucket + ']');
            });
        }
    }

    /**
     * 渲染指针标签（栈顶/队头队尾/哨兵）
     */
    private renderLabels(layout: { node: LinkedNode<any>; x: number; y: number; isSentinel: boolean }[]): void {
        this.mainGroup.selectAll('.ds-label').remove();
        if (!this.ds || layout.length === 0) return;

        const addLabel = (x: number, y: number, text: string, color: string): void => {
            this.mainGroup.append('text')
                .attr('class', 'ds-label')
                .attr('x', x)
                .attr('y', y)
                .attr('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('font-family', 'monospace')
                .style('fill', color)
                .style('font-weight', 'bold')
                .text(text);
        };

        // 链式栈：top 指针；普通链表：head 指针
        if (this.ds.head !== undefined && this.ds.header === undefined && !Array.isArray(this.ds.arr)) {
            const headItem = layout.find(item => item.node === this.ds.head);
            if (headItem) {
                const isStack = typeof this.ds.constructor === 'function' && /Stack/i.test(this.ds.constructor.name);
                addLabel(headItem.x + LinkedListVisualizer.NODE_WIDTH / 2, headItem.y - 10, isStack ? 'top' : 'head', '#e67e22');
            }
        }

        // 哨兵模式：header 标签 + 队列 tail 标签
        if (this.mode === 'sentinel' && layout.length > 0) {
            const headerItem = layout[0];
            addLabel(headerItem.x + LinkedListVisualizer.NODE_WIDTH / 2, headerItem.y - 10, 'header', '#e67e22');

            // 队列：tail 指针
            if (this.ds.tail !== undefined && this.ds.tail !== null) {
                const tailItem = layout.find(item => item.node === this.ds.tail && !item.isSentinel);
                if (tailItem) {
                    addLabel(tailItem.x + LinkedListVisualizer.NODE_WIDTH / 2, tailItem.y - 10, 'tail', '#3498db');
                }
            }
        }
    }

    clear(): void {
        super.clear();
        this.nodes.clear();
        this.ds = null;
        this.mode = 'linear';
    }
}
