import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
import { LinkedNode } from '../node/LinkedNode/LinkedNode';
import { DoublyLinkedListNode } from '../node/LinkedNode/impl/DoublyLinkedNode';
import { LinkedList } from '../datastructure/List/SinglyLinkedList';
import { CircularLinkedList } from '../datastructure/List/CircularLinkedList';
import { DoubleLinkedList } from '../datastructure/List/DoubleLinkedList';
import { LinkedStack } from '../datastructure/Stack/LinkedStack';
import { LinkedQueue } from '../datastructure/Queue/LinkedQueue';
import { LinkedDeque } from '../datastructure/Queue/LinkedDeque';
import { HashTable } from '../datastructure/HashTable/HashTable';

// 可视化层只读的链式节点视图（只包含渲染所需字段）
interface LinkedNodeView {
    getId(): number;
    val: number | null;
    next: LinkedNodeView | null;
}

type LinkedListDS =
    | LinkedList | CircularLinkedList | DoubleLinkedList
    | LinkedStack | LinkedQueue | LinkedDeque | HashTable;

interface LayoutItem {
    node: LinkedNodeView;
    x: number;
    y: number;
    isSentinel: boolean;
    bucket?: number;
}

// 高亮/闪烁颜色（查找、修改动画）
const COLOR_FLASH = '#f39c12';

/**
 * 链表可视化器
 * 处理单链表、双链表、循环链表、链式栈/队列/双端队列、哈希表链式桶的渲染和动画。
 *
 * 通过数据结构实例的原子操作（_set_head/_set_header/_set_tail/_set_array/_set_bucket）
 * 绑定当前数据结构，每次渲染都以数据结构的真实链式结构为唯一数据源。
 */
export class LinkedListVisualizer extends BaseVisualizer {
    // 已渲染过的节点集合（用于退出动画判断）
    private nodes: Map<number, LinkedNodeView> = new Map();
    // 当前绑定的数据结构实例（LinkedList / DoubleLinkedList / CircularLinkedList / LinkedStack / LinkedQueue / LinkedDeque / HashTable）
    private ds: LinkedListDS | null = null;
    // 渲染模式：linear（带头节点链表/栈）/ sentinel（带哨兵节点的循环链表/队列/双端队列）/ hashtable（哈希表链式桶）
    private mode: 'linear' | 'sentinel' | 'hashtable' = 'linear';

    private static readonly NODE_WIDTH = 60;
    private static readonly NODE_HEIGHT = 50;
    private static readonly NODE_GAP = 36;
    private static readonly START_Y = 240;
    private static readonly CANVAS_W = 1200;
    private static readonly ROW_GAP = 90;       // 哈希表桶行之间的垂直间距

    // ---------- 原子操作分发 ----------
    onOp(node: object, method: string, args: unknown[]): void {
        // 数据结构级操作（节点为数据结构实例本身）
        if (!(node instanceof LinkedNode)) {
            this.handleDsOp(node, method, args);
            return;
        }
        const linked = node;

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
    private isLinkedListDS(node: object): node is LinkedListDS {
        return node instanceof LinkedList || node instanceof CircularLinkedList ||
            node instanceof DoubleLinkedList || node instanceof LinkedStack ||
            node instanceof LinkedQueue || node instanceof LinkedDeque ||
            node instanceof HashTable;
    }

    private handleDsOp(node: object, method: string, _args: unknown[]): void {
        if (!this.isLinkedListDS(node)) {
            return;
        }
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
     * 依据数据结构类型判断渲染模式（不使用鸭子类型）
     */
    private detectMode(node: object): 'linear' | 'sentinel' | 'hashtable' {
        if (node instanceof HashTable) return 'hashtable';
        if (node instanceof CircularLinkedList || node instanceof LinkedQueue || node instanceof LinkedDeque) {
            return 'sentinel';
        }
        return 'linear';
    }

    /**
     * 收集渲染布局
     */
    private collectLayout(): LayoutItem[] {
        const result: LayoutItem[] = [];
        if (!this.ds) return result;

        const step = LinkedListVisualizer.NODE_WIDTH + LinkedListVisualizer.NODE_GAP;

        if (this.ds instanceof HashTable) {
            const arr = this.ds.getArr();
            arr.forEach((headNode, idx) => {
                if (!headNode) return;
                // 每个桶按自身长度水平居中（节点宽 + 节点间隙）
                let len = 0;
                let t: LinkedNodeView | null = headNode;
                while (t) { len++; t = t.next; }
                const totalW = len * LinkedListVisualizer.NODE_WIDTH + (len - 1) * LinkedListVisualizer.NODE_GAP;
                const bucketStartX = Math.max(60, (LinkedListVisualizer.CANVAS_W - totalW) / 2);
                let curr: LinkedNodeView | null = headNode;
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
        let header: LinkedNodeView | null = null;
        let start: LinkedNodeView | null = null;
        if (this.ds instanceof CircularLinkedList || this.ds instanceof LinkedQueue || this.ds instanceof LinkedDeque) {
            header = this.ds.getHeaderNode();
            start = header.next;
        } else if (this.ds instanceof LinkedList || this.ds instanceof DoubleLinkedList || this.ds instanceof LinkedStack) {
            start = this.ds.getHeadNode();
        } else {
            return result;
        }

        // 循环链表/队列/双端队列：用环形布局体现首尾相连
        if (this.mode === 'sentinel' && header) {
            const ring: { node: LinkedNodeView; isSentinel: boolean }[] = [
                { node: header, isSentinel: true },
            ];
            let curr = start;
            const maxIter = 200;
            while (curr && curr !== header && ring.length < maxIter) {
                ring.push({ node: curr, isSentinel: false });
                curr = curr.next;
            }

            // 刚创建、尚未链接进链表的节点也要显示，否则只能在插入完成后才看到
            const used = new Set(ring.map(item => item.node.getId()));
            this.nodes.forEach(node => {
                if (!used.has(node.getId())) {
                    ring.push({ node, isSentinel: false });
                }
            });

            const total = ring.length;
            if (total <= 2) {
                // 节点太少时环形会退化成一条重叠的线，仍按直线排列
                const startX = Math.max(60, (LinkedListVisualizer.CANVAS_W - total * step) / 2);
                ring.forEach((item, i) => {
                    result.push({
                        node: item.node,
                        x: startX + i * step,
                        y: LinkedListVisualizer.START_Y,
                        isSentinel: item.isSentinel,
                    });
                });
                return result;
            }

            const cx = LinkedListVisualizer.CANVAS_W / 2;
            const cy = 290;
            const radius = Math.min(300, Math.max(150, total * 34));
            ring.forEach((item, i) => {
                // header 固定在最左侧，其余节点顺时针环绕
                const angle = Math.PI + (2 * Math.PI * i) / total;
                result.push({
                    node: item.node,
                    x: cx + radius * Math.cos(angle) - LinkedListVisualizer.NODE_WIDTH / 2,
                    y: cy + radius * Math.sin(angle) - LinkedListVisualizer.NODE_HEIGHT / 2,
                    isSentinel: item.isSentinel,
                });
            });
            return result;
        }

        // 先收集链表节点，再补上刚创建但尚未链接的节点
        const chain: LinkedNodeView[] = [];
        let c: LinkedNodeView | null = start;
        const maxIter = 200;
        while (c && c !== header && chain.length < maxIter) {
            chain.push(c);
            c = c.next;
        }
        const used = new Set(chain.map(node => node.getId()));
        this.nodes.forEach(node => {
            if (!used.has(node.getId())) {
                chain.push(node);
            }
        });

        // 统计节点总数，使整条链表水平居中（节点宽 + 节点间隙）
        const count = chain.length;
        const totalW = count > 0
            ? count * LinkedListVisualizer.NODE_WIDTH + (count - 1) * LinkedListVisualizer.NODE_GAP
            : 0;
        const startX = Math.max(60, (LinkedListVisualizer.CANVAS_W - totalW) / 2);

        chain.forEach((node, index) => {
            result.push({
                node,
                x: startX + index * step,
                y: LinkedListVisualizer.START_Y,
                isSentinel: false,
            });
        });
        return result;
    }

    /**
     * 渲染整条链表/哈希表
     */
    private render(): void {
        const layout = this.collectLayout();

        // 1. 箭头（在节点下层）
        this.renderArrows(layout);

        // 2. 节点（key取节点自身id，保证增删时复用同一个DOM元素）
        const nodeGroups = this.mainGroup.selectAll<SVGGElement, LayoutItem>('.linked-node')
            .data<LayoutItem>(layout, (d: LayoutItem) => d.node.getId());

        const enterGroups = nodeGroups.enter()
            .append('g')
            .attr('class', (d: LayoutItem) => d.isSentinel ? 'linked-node sentinel-node' : 'linked-node')
            .attr('transform', (d: LayoutItem) => `translate(${d.x}, ${d.y})`)
            .style('opacity', 0);

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
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('font-weight', 'bold');

        // 新节点淡入浮现；使用独立命名过渡，避免和位置移动过渡互相取消
        enterGroups.transition('node-enter')
            .duration(300)
            .style('opacity', 1);

        // 统一更新（enter与update都要更新class/id/值/哨兵虚线）
        const merged = enterGroups.merge(nodeGroups);

        merged
            .attr('data-id', (d: LayoutItem) => d.node.getId())
            .attr('class', (d: LayoutItem) => d.isSentinel ? 'linked-node sentinel-node' : 'linked-node')
            .transition('move')
            .duration(300)
            .attr('transform', (d: LayoutItem) => `translate(${d.x}, ${d.y})`);

        merged.select('.node-box')
            .attr('stroke-dasharray', (d: LayoutItem) => d.isSentinel ? '4,3' : null);

        merged.select('.node-value')
            .text((d: LayoutItem) => this.nodeText(d));

        // 退出：直接移除（不做淡出，避免透明度残留导致节点透明）
        nodeGroups.exit().remove();

        // 3. 指针标签（top / header / tail）
        this.renderLabels(layout);

        // 4. 自适应 viewBox：链表包围盒自动填满画布，任何窗口宽度下节点数值都清晰可读
        this.fitViewBox(layout);
    }

    /**
     * 节点显示文本（哨兵显示H）
     */
    private nodeText(item: LayoutItem): string {
        if (item.isSentinel) return 'H';
        return item.node.val !== null ? String(item.node.val) : '';
    }

    /**
     * 根据当前链表的实际包围盒自适应 viewBox，使链表始终填满画布中心
     */
    private fitViewBox(layout: LayoutItem[]): void {
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
     * 渲染节点之间的箭头（按节点自身的next/last指针，含循环回指与哈希表桶标签）
     */
    private renderArrows(layout: LayoutItem[]): void {
        const layer = this.arrowLayer();
        layer.selectAll('*').remove();

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

        const posById = new Map<number, LayoutItem>();
        layout.forEach(item => posById.set(item.node.getId(), item));
        const ring = this.mode === 'sentinel' && layout.length > 2;

        // 后继箭头：直接读节点自己的next指针，而不是假设渲染顺序相邻
        layout.forEach(item => {
            const next = item.node.next;
            if (!next) return;
            const target = posById.get(next.getId());
            if (!target) return;
            // 环形布局已在几何上保证首尾相邻，不再需要跨越大半张画布的弧线
            const curved = !ring && (target.x <= item.x || Math.abs(target.y - item.y) > 1);
            const offset = ring && item.node instanceof DoublyLinkedListNode ? 6 : 0;
            this.drawArrow(layer, item, target, curved, '#666', 2, ring, offset);
        });

        // 双向链表：last 回指箭头
        layout.forEach(item => {
            if (!(item.node instanceof DoublyLinkedListNode)) return;
            const last = item.node.last;
            if (!last) return;
            const target = posById.get(last.getId());
            if (!target) return;
            if (ring) {
                this.drawArrow(layer, item, target, false, '#aaa', 1.2, true, -6);
                return;
            }
            const y = item.y + LinkedListVisualizer.NODE_HEIGHT - 8;
            const ty = target.y + LinkedListVisualizer.NODE_HEIGHT - 8;
            layer.append('line')
                .attr('class', 'link-line link-back')
                .attr('x1', item.x + LinkedListVisualizer.NODE_WIDTH / 2)
                .attr('y1', y)
                .attr('x2', target.x + LinkedListVisualizer.NODE_WIDTH / 2)
                .attr('y2', ty)
                .attr('stroke', '#aaa')
                .attr('stroke-width', 1.2)
                .attr('marker-end', 'url(#arrowhead)')
                .style('opacity', 0.7);
        });

        // 哈希表：桶索引标签
        if (this.mode === 'hashtable') {
            const bucketSet = new Map<number, number>();
            layout.forEach(item => {
                if (item.bucket !== undefined && !bucketSet.has(item.bucket)) {
                    bucketSet.set(item.bucket, item.x);
                }
            });
            bucketSet.forEach((x, bucket) => {
                layer.append('text')
                    .attr('class', 'bucket-label')
                    .attr('x', x - 30)
                    .attr('y', LinkedListVisualizer.START_Y + bucket * LinkedListVisualizer.ROW_GAP + LinkedListVisualizer.NODE_HEIGHT / 2 + 5)
                    .style('font-size', '13px')
                    .style('font-family', '"JetBrains Mono", SimHei, monospace')
                    .style('fill', '#7f8c8d')
                    .text('[' + bucket + ']');
            });
        }
    }

    /**
     * 画一条后继箭头（from -> to）
     * @param curved 是否需要弧线（目标不在右侧时绕开中间节点）
     * @param ring 环形布局：从节点方框边界沿中心连线方向出发
     * @param offset 环形布局下垂直于连线的偏移（双向链表的正反箭头错开）
     */
    private drawArrow(
        layer: d3.Selection<SVGGElement, unknown, null, undefined>,
        from: LayoutItem, to: LayoutItem,
        curved: boolean, color: string, width: number,
        ring = false, offset = 0,
    ): void {
        const halfW = LinkedListVisualizer.NODE_WIDTH / 2;
        const halfH = LinkedListVisualizer.NODE_HEIGHT / 2;
        let x1 = from.x + LinkedListVisualizer.NODE_WIDTH;
        let y1 = from.y + halfH;
        let x2 = to.x;
        let y2 = to.y + halfH;

        if (ring) {
            const c1x = from.x + halfW;
            const c1y = from.y + halfH;
            const c2x = to.x + halfW;
            const c2y = to.y + halfH;
            const dx = c2x - c1x;
            const dy = c2y - c1y;
            const len = Math.hypot(dx, dy) || 1;
            const t = Math.min(
                Math.abs(dx) > 1e-6 ? halfW / Math.abs(dx) : Infinity,
                Math.abs(dy) > 1e-6 ? halfH / Math.abs(dy) : Infinity,
            );
            x1 = c1x + dx * t;
            y1 = c1y + dy * t;
            x2 = c2x - dx * t;
            y2 = c2y - dy * t;
            if (offset !== 0) {
                // 用法线方向统一朝同一侧，正反两条平行箭头才能分别落在边两侧
                let nx = -dy / len;
                let ny = dx / len;
                if (nx < -1e-9 || (Math.abs(nx) <= 1e-9 && ny < 0)) {
                    nx = -nx;
                    ny = -ny;
                }
                const ox = nx * offset;
                const oy = ny * offset;
                x1 += ox;
                y1 += oy;
                x2 += ox;
                y2 += oy;
            }
        }

        if (curved) {
            layer.append('path')
                .attr('class', 'link-line link-curve')
                .attr('d', `M ${x1} ${y1} C ${x1 + 60} ${y1 - 70}, ${x2 - 60} ${y2 - 70}, ${x2} ${y2}`)
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', width)
                .attr('marker-end', 'url(#arrowhead)');
            return;
        }
        layer.append('line')
            .attr('class', 'link-line')
            .attr('x1', x1)
            .attr('y1', y1)
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('stroke', color)
            .attr('stroke-width', width)
            .attr('marker-end', 'url(#arrowhead)');
    }

    /**
     * 气泡层/箭头层（保证连线画在节点下方）
     */
    private arrowLayer(): d3.Selection<SVGGElement, unknown, null, undefined> {
        let layer = this.mainGroup.select<SVGGElement>('g.link-layer');
        if (layer.empty()) {
            layer = this.mainGroup.append('g').attr('class', 'link-layer');
        }
        layer.lower();
        return layer;
    }

    /**
     * 高亮（闪烁）第index个数据节点（不含哨兵），供“查找/修改”动画使用
     * @param index 数据节点下标（从0开始）
     */
    public highlightIndex(index: number): void {
        const items = this.collectLayout().filter(item => !item.isSentinel);
        if (index < 0 || index >= items.length) return;
        const g = this.mainGroup.select(`.linked-node[data-id="${items[index].node.getId()}"]`);
        if (g.empty()) return;
        g.select('.node-box')
            .transition()
            .duration(150)
            .attr('stroke', COLOR_FLASH)
            .attr('stroke-width', 4)
            .transition()
            .duration(450)
            .attr('stroke', '#333')
            .attr('stroke-width', 2);
    }

    /**
     * 渲染指针标签（栈顶/队头队尾/哨兵）
     */
    private renderLabels(layout: LayoutItem[]): void {
        this.mainGroup.selectAll('.ds-label').remove();
        if (!this.ds || layout.length === 0) return;

        const addLabel = (x: number, y: number, text: string, color: string): void => {
            this.mainGroup.append('text')
                .attr('class', 'ds-label')
                .attr('x', x)
                .attr('y', y)
                .attr('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('font-family', '"JetBrains Mono", SimHei, monospace')
                .style('fill', color)
                .style('font-weight', 'bold')
                .text(text);
        };

        // 链式栈：top 指针；普通链表：head 指针
        const ds = this.ds;
        if (ds instanceof LinkedList || ds instanceof DoubleLinkedList || ds instanceof LinkedStack) {
            const headItem = layout.find(item => item.node === ds.getHeadNode());
            if (headItem) {
                const isStack = ds instanceof LinkedStack;
                addLabel(headItem.x + LinkedListVisualizer.NODE_WIDTH / 2, headItem.y - 10, isStack ? 'top' : 'head', '#e67e22');
            }
        }

        // 哨兵模式：header 标签 + 队列 tail 标签
        if (this.mode === 'sentinel' && layout.length > 0) {
            const headerItem = layout[0];
            addLabel(headerItem.x + LinkedListVisualizer.NODE_WIDTH / 2, headerItem.y - 10, 'header', '#e67e22');

            // 队列/双端队列：tail 指针
            if (ds instanceof LinkedQueue || ds instanceof LinkedDeque) {
                const tailNode = ds instanceof LinkedQueue ? ds.getTailNode() : ds.getHeaderNode().last;
                const tailItem = layout.find(item => item.node === tailNode && !item.isSentinel);
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
