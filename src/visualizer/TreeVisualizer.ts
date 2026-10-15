import { BaseVisualizer } from './BaseVisualizer';
import { DataNode } from '../node/DataNode';
import { BinaryTreeNode } from '../node/BinaryTreeNode/BinaryTreeNode';
import { TreeNode } from '../node/TreeNode/TreeNode';
import { TrieNode } from '../node/TreeNode/impl/TrieNode';
import { ArrayNode } from '../node/ArrayNode/ArrayNode';
import { RedBlackTreeNode, RedBlackTree_Red } from '../node/BinaryTreeNode/impl/BinarySearchTreeNode/impl/RedBlackTreeNode';

// ---------- 配色 ----------
const COLOR_RED = '#e74c3c';
const COLOR_BLACK = '#2c3e50';
const COLOR_GREEN = '#2ecc71';
const COLOR_WHITE = '#ffffff';
const COLOR_TEXT = '#333333';
const COLOR_FLASH = '#f39c12';

/**
 * 二叉树可视化器
 * 处理BST、AVL、红黑树、替罪羊树、Treap、线段树、二叉树遍历、Trie（多叉树）的渲染和动画。
 */
export class TreeVisualizer extends BaseVisualizer {
    // 所有节点ID -> 节点对象（用于删除与闪烁定位）
    private nodes: Map<number, BinaryTreeNode<any> | TreeNode<any>> = new Map();
    // 当前绑定的数据结构实例（BinarySearchTree/AVLTree/RedBlackTree/Trie等）
    private ds: any = null;
    // 渲染模式
    private mode: 'binary' | 'trie' = 'binary';
    // 遍历结果数组
    private answerNode: ArrayNode | null = null;
    // 遍历结果行的水平范围（用于 viewBox 纳入）
    private answerRowX0 = 0;
    private answerRowX1 = 0;

    private static readonly NODE_RADIUS = 15;
    private static readonly H_GAP = 50;
    private static readonly V_GAP = 60;
    private static readonly START_X = 560;
    private static readonly START_Y = 70;
    private static readonly TRIE_H_GAP = 32;
    private static readonly TRIE_V_GAP = 50;
    // 画布尺寸（与 viewBox 一致），用于树整体居中
    private static readonly CANVAS_W = 1200;
    private static readonly CANVAS_H = 600;
    // fitViewBox 最小视图尺寸：限制少节点时被过度放大
    private static readonly MIN_VIEW_W = 340;
    private static readonly MIN_VIEW_H = 240;

    // ---------- 原子操作分发 ----------
    onOp(node: DataNode, method: string, _args: any[]): void {
        // 遍历结果数组
        if (node instanceof ArrayNode) {
            this.handleAnswerArray(node);
            return;
        }
        // Trie节点（多叉树节点）
        if (node instanceof TreeNode && !(node instanceof BinaryTreeNode)) {
            this.mode = 'trie';
            this.renderTrie();
            return;
        }
        // 数据结构实例（非节点）
        if (!(node instanceof BinaryTreeNode)) {
            this.handleDsOp(node, method);
            return;
        }

        const treeNode = node as BinaryTreeNode<any>;
        switch (method) {
            case '_create':
                this.nodes.set(treeNode.getId(), treeNode);
                this.render();
                break;
            case '_set_left':
            case '_set_right':
            case '_set_value':
            case '_set_height':     // AVL高度
            case '_set_color':      // 红黑树颜色
            case '_swap_color':     // 红黑树交换颜色
            case '_set_size':       // 替罪羊树size
            case '_set_lazy':       // 线段树懒标记
            case '_set_sum':        // 线段树和
            case '_set_visited':    // 遍历访问标记
            case '_clear_visited':  // 遍历清空访问
                this.render();
                break;
            case '_rotate_left':
            case '_rotate_right':
                this.render();
                this.flashNode(treeNode.getId());
                break;
            case '_delete':
                this.nodes.delete(treeNode.getId());
                this.render();
                break;
            default:
                break;
        }
    }

    /**
     * 处理数据结构级原子操作
     */
    private handleDsOp(node: any, method: string): void {
        switch (method) {
            case '_create':
            case '_set_root':
                this.ds = node;
                // 依据根节点形态判断渲染模式
                this.mode = (node.root && node.root.pass !== undefined) ? 'trie' : 'binary';
                if (this.mode === 'trie') {
                    this.renderTrie();
                } else {
                    this.render();
                }
                break;
            case '_clear':
                if (this.mode === 'trie') {
                    this.renderTrie();
                } else {
                    this.render();
                }
                break;
            default:
                break;
        }
    }

    /**
     * 闪烁节点（旋转高亮）
     */
    private flashNode(id: number): void {
        const g = this.mainGroup.select(`.tree-node[data-id="${id}"]`);
        if (g.empty()) return;
        g.select('circle')
            .transition()
            .duration(150)
            .attr('stroke', COLOR_FLASH)
            .attr('stroke-width', 4)
            .transition()
            .duration(350)
            .attr('stroke', (d: any) => this.nodeStrokeColor(d));
    }

    /**
     * 节点边框颜色
     */
    private nodeStrokeColor(_d: any): string {
        return '#666';
    }

    /**
     * 自动查找根节点：优先数据结构实例的root，否则扫描未被引用的节点
     */
    private findRoot(): BinaryTreeNode<any> | null {
        if (this.ds && this.ds.root !== undefined && this.ds.root !== null) {
            return this.ds.root;
        }
        if (this.nodes.size === 0) return null;

        const childIds = new Set<number>();
        this.nodes.forEach((n: any) => {
            if (n.left) childIds.add(n.left.getId());
            if (n.right) childIds.add(n.right.getId());
        });

        let root: BinaryTreeNode<any> | null = null;
        this.nodes.forEach((n: any, id: number) => {
            if (!childIds.has(id)) {
                root = n;
            }
        });
        return root;
    }

    /**
     * 计算二叉树节点位置（中序遍历布局 + 整体居中）
     */
    private layoutTree(): { node: BinaryTreeNode<any>; x: number; y: number }[] {
        const result: { node: BinaryTreeNode<any>; x: number; y: number }[] = [];
        const root = this.findRoot();
        if (!root) return result;

        let pos = 0;
        const maxDepth = this.getDepth(root);
        const totalWidth = maxDepth * 4 * TreeVisualizer.H_GAP;

        const traverse = (n: BinaryTreeNode<any> | null, depth: number): void => {
            if (!n) return;
            if (n.left) traverse(n.left, depth + 1);

            const x = TreeVisualizer.START_X - totalWidth / 2 + pos * TreeVisualizer.H_GAP;
            const y = TreeVisualizer.START_Y + depth * TreeVisualizer.V_GAP;
            result.push({ node: n, x, y });
            pos++;

            if (n.right) traverse(n.right, depth + 1);
        };

        traverse(root, 0);
        if (result.length === 0) return result;

        // 计算包围盒（含节点半径与上方标签），使整棵树居中于画布中心
        const tagH = TreeVisualizer.NODE_RADIUS + 12;   // 节点上方标签占用的高度
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        result.forEach(item => {
            minX = Math.min(minX, item.x - TreeVisualizer.NODE_RADIUS);
            maxX = Math.max(maxX, item.x + TreeVisualizer.NODE_RADIUS);
            minY = Math.min(minY, item.y - tagH);
            maxY = Math.max(maxY, item.y + TreeVisualizer.NODE_RADIUS);
        });
        const offsetX = TreeVisualizer.CANVAS_W / 2 - (minX + maxX) / 2;
        const offsetY = TreeVisualizer.CANVAS_H / 2 - (minY + maxY) / 2;
        result.forEach(item => {
            item.x += offsetX;
            item.y += offsetY;
        });
        return result;
    }

    /**
     * 计算树的深度
     */
    private getDepth(node: BinaryTreeNode<any> | null): number {
        if (!node) return 0;
        return 1 + Math.max(this.getDepth(node.left), this.getDepth(node.right));
    }

    /**
     * 节点显示文本
     */
    private nodeText(node: any): string {
        if (node.val !== undefined && node.val !== null) return String(node.val);
        if (node.sum !== undefined && node.sum !== null) return String(node.sum);
        return '';
    }

    /**
     * 节点填充颜色（红黑树/遍历节点/默认）
     */
    private nodeFill(node: any): string {
        // 查找/遍历高亮：当前节点绿色（优先级最高，红黑树查找时也变绿）
        if (node.visited) return COLOR_GREEN;
        if (node instanceof RedBlackTreeNode) {
            return node.color === RedBlackTree_Red ? COLOR_RED : COLOR_BLACK;
        }
        return COLOR_WHITE;
    }

    /**
     * 节点文字颜色
     */
    private nodeTextFill(node: any): string {
        if (node.visited) return COLOR_WHITE;
        if (node instanceof RedBlackTreeNode) return COLOR_WHITE;
        return COLOR_TEXT;
    }

    /**
     * 渲染二叉树
     */
    private render(): void {
        if (this.mode !== 'binary') return;
        const layout = this.layoutTree();
        const posMap = new Map<number, { x: number; y: number }>();
        layout.forEach(item => posMap.set(item.node.getId(), { x: item.x, y: item.y }));

        // 1. 边
        this.renderEdges(posMap);

        // 2. 节点
        const nodeGroups = this.mainGroup.selectAll('.tree-node')
            .data(layout, (d: any) => d.node.getId());

        // enter：直接可见（不用淡入动画——快速连续渲染会打断动画导致 opacity 卡 0，圆圈被“吞掉”）
        const enterGroups = nodeGroups.enter()
            .append('g')
            .attr('class', 'tree-node')
            .attr('data-id', (d: any) => d.node.getId())
            .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`)
            .style('opacity', 1);

        enterGroups.append('circle')
            .attr('r', TreeVisualizer.NODE_RADIUS)
            .attr('fill', (d: any) => this.nodeFill(d.node))
            .attr('stroke', '#666')
            .attr('stroke-width', 1.5);

        enterGroups.append('text')
            .attr('class', 'node-value')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('font-family', 'monospace')
            .attr('fill', (d: any) => this.nodeTextFill(d.node))
            .text((d: any) => this.nodeText(d.node));

        // 更新：仅对已有节点做位置过渡（不动 opacity）
        nodeGroups.transition('move').duration(300).attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);

        nodeGroups.select('circle')
            .attr('fill', (d: any) => this.nodeFill(d.node));

        nodeGroups.select('.node-value')
            .text((d: any) => this.nodeText(d.node))
            .attr('fill', (d: any) => this.nodeTextFill(d.node));

        // 退出：直接移除（不用淡出动画，避免残留 opacity=0 的不可见节点）
        nodeGroups.exit().remove();

        // 3. 遍历结果数组（底部）
        this.renderAnswerArray();

        // 4. 自适应 viewBox：树的包围盒自动填满画布，任何窗口宽度下数值都清晰可读
        this.fitViewBox(layout.map(i => ({ x: i.x, y: i.y })));
    }

    /**
     * 根据当前树的实际包围盒自适应 viewBox，使树始终填满画布中心
     */
    private fitViewBox(points: { x: number; y: number }[]): void {
        if (points.length === 0) {
            this.svg.attr('viewBox', `0 0 ${TreeVisualizer.CANVAS_W} ${TreeVisualizer.CANVAS_H}`);
            return;
        }
        const R = TreeVisualizer.NODE_RADIUS;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        points.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });
        // 留白：左右 R+30，上方含标签 R+40，下方 R+20
        let x0 = minX - R - 30;
        const y0 = minY - R - 40;
        let w = (maxX - minX) + 2 * (R + 30);
        let h = (maxY - minY) + R + 60;
        // 最小视图尺寸：节点少时避免被过度放大（圆过大）
        w = Math.max(w, TreeVisualizer.MIN_VIEW_W);
        h = Math.max(h, TreeVisualizer.MIN_VIEW_H);
        // 保持水平居中：视图不小于最小宽度时，把树水平方向置于视图中央
        if (w > (maxX - minX) + 2 * (R + 30)) {
            const contentW = (maxX - minX) + 2 * (R + 30);
            const pad = (w - contentW) / 2;
            x0 = minX - R - 30 - pad;
        }
        // 遍历模式：把底部结果行纳入视图（含水平范围，防止标签/首格被裁）
        if (this.answerNode) {
            const answerBottom = 540 + 40 + 10;
            h = Math.max(h, answerBottom - y0);
            const rowX0 = this.answerRowX0 - 20;
            const rowX1 = this.answerRowX1 + 20;
            if (rowX0 < x0) { w += x0 - rowX0; x0 = rowX0; }
            if (rowX1 > x0 + w) { w = rowX1 - x0; }
        }
        this.svg.attr('viewBox', `${x0} ${y0} ${w} ${h}`);
    }

    /**
     * 渲染树边（父子节点连线）
     */
    private renderEdges(posMap: Map<number, { x: number; y: number }>): void {
        this.mainGroup.selectAll('.tree-edge').remove();

        this.nodes.forEach((n: any) => {
            const parentPos = posMap.get(n.getId());
            if (!parentPos) return;
            if (n.left) {
                const childPos = posMap.get(n.left.getId());
                if (childPos) {
                    this.mainGroup.append('line')
                        .attr('class', 'tree-edge')
                        .attr('x1', parentPos.x)
                        .attr('y1', parentPos.y)
                        .attr('x2', childPos.x)
                        .attr('y2', childPos.y)
                        .attr('stroke', '#999999')
                        .attr('stroke-width', 1.5);
                }
            }
            if (n.right) {
                const childPos = posMap.get(n.right.getId());
                if (childPos) {
                    this.mainGroup.append('line')
                        .attr('class', 'tree-edge')
                        .attr('x1', parentPos.x)
                        .attr('y1', parentPos.y)
                        .attr('x2', childPos.x)
                        .attr('y2', childPos.y)
                        .attr('stroke', '#999999')
                        .attr('stroke-width', 1.5);
                }
            }
        });
    }

    // ================== Trie（多叉树）渲染 ==================

    /**
     * 收集Trie节点（BFS），返回 节点/父节点/边字母/深度/层内序号
     */
    private collectTrie(): { node: TrieNode; parent: TrieNode | null; letter: string | null; depth: number; order: number }[] {
        const result: { node: TrieNode; parent: TrieNode | null; letter: string | null; depth: number; order: number }[] = [];
        const root: TrieNode | null = this.ds ? this.ds.root : null;
        if (!root) return result;

        const queue: { node: TrieNode; parent: TrieNode | null; letter: string | null; depth: number }[] = [];
        queue.push({ node: root, parent: null, letter: null, depth: 0 });
        const depthCount: number[] = [];
        let head = 0;
        while (head < queue.length) {
            const cur = queue[head++];
            const order = depthCount[cur.depth] || 0;
            depthCount[cur.depth] = order + 1;
            result.push({ node: cur.node, parent: cur.parent, letter: cur.letter, depth: cur.depth, order });

            for (let ch = 0; ch < cur.node.sons.length; ++ch) {
                const son = cur.node.sons[ch];
                if (son) {
                    queue.push({ node: son, parent: cur.node, letter: String.fromCharCode(97 + ch), depth: cur.depth + 1 });
                }
            }
        }
        return result;
    }

    /**
     * 渲染Trie（多叉树）
     */
    private renderTrie(): void {
        const items = this.collectTrie();
        const posMap = new Map<number, { x: number; y: number }>();

        // 按层计算位置
        const depthGroups = new Map<number, typeof items>();
        items.forEach(item => {
            if (!depthGroups.has(item.depth)) depthGroups.set(item.depth, []);
            depthGroups.get(item.depth)!.push(item);
        });
        depthGroups.forEach((group, depth) => {
            group.forEach((item, i) => {
                const count = group.length;
                const x = TreeVisualizer.START_X + (i - (count - 1) / 2) * TreeVisualizer.TRIE_H_GAP;
                const y = TreeVisualizer.START_Y + depth * TreeVisualizer.TRIE_V_GAP;
                posMap.set(item.node.getId(), { x, y });
            });
        });

        // 整棵树居中于画布中心
        if (posMap.size > 0) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            posMap.forEach(p => {
                minX = Math.min(minX, p.x - TreeVisualizer.NODE_RADIUS);
                maxX = Math.max(maxX, p.x + TreeVisualizer.NODE_RADIUS);
                minY = Math.min(minY, p.y - TreeVisualizer.NODE_RADIUS);
                maxY = Math.max(maxY, p.y + TreeVisualizer.NODE_RADIUS);
            });
            const offsetX = TreeVisualizer.CANVAS_W / 2 - (minX + maxX) / 2;
            const offsetY = TreeVisualizer.CANVAS_H / 2 - (minY + maxY) / 2;
            posMap.forEach((p) => {
                p.x += offsetX;
                p.y += offsetY;
            });
        }

        // 1. 边（带字母标签）
        this.mainGroup.selectAll('.trie-edge').remove();
        items.forEach(item => {
            if (!item.parent) return;
            const p = posMap.get(item.parent.getId());
            const c = posMap.get(item.node.getId());
            if (!p || !c) return;
            const midX = (p.x + c.x) / 2;
            const midY = (p.y + c.y) / 2;
            this.mainGroup.append('line')
                .attr('class', 'trie-edge')
                .attr('x1', p.x)
                .attr('y1', p.y)
                .attr('x2', c.x)
                .attr('y2', c.y)
                .attr('stroke', '#999')
                .attr('stroke-width', 1.5);
            this.mainGroup.append('text')
                .attr('class', 'trie-edge')
                .attr('x', midX)
                .attr('y', midY - 4)
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .style('font-family', 'monospace')
                .style('fill', '#7f8c8d')
                .text(item.letter);
        });

        // 2. 节点（enter 直接可见，不依赖动画，避免快速渲染时 opacity 卡 0）
        const nodeGroups = this.mainGroup.selectAll('.tree-node')
            .data(items, (d: any) => d.node.getId());

        const enterGroups = nodeGroups.enter()
            .append('g')
            .attr('class', 'tree-node')
            .attr('data-id', (d: any) => d.node.getId())
            .attr('transform', (d: any) => {
                const p = posMap.get(d.node.getId())!;
                return `translate(${p.x}, ${p.y})`;
            })
            .style('opacity', 1);

        enterGroups.append('circle')
            .attr('r', TreeVisualizer.NODE_RADIUS)
            .attr('fill', COLOR_WHITE)
            .attr('stroke', '#666')
            .attr('stroke-width', 1.5);

        enterGroups.append('text')
            .attr('class', 'node-value')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('font-family', 'monospace')
            .style('fill', COLOR_TEXT)
            .text((d: any) => {
                const n = d.node as TrieNode;
                return n.pass + '/' + n.end;
            });

        // 位置过渡只作用于已有节点，不动 opacity
        nodeGroups.transition('move').duration(300).attr('transform', (d: any) => {
            const p = posMap.get(d.node.getId())!;
            return `translate(${p.x}, ${p.y})`;
        });

        nodeGroups.select('.node-value')
            .text((d: any) => {
                const n = d.node as TrieNode;
                return n.pass + '/' + n.end;
            });

        // 退出：直接移除
        nodeGroups.exit().remove();

        this.renderAnswerArray();

        // Trie 同样自适应 viewBox
        this.fitViewBox(Array.from(posMap.values()));
    }

    // ================== 遍历结果数组 ==================

    /**
     * 处理遍历结果数组
     */
    private handleAnswerArray(node: ArrayNode): void {
        this.answerNode = node;
        this.renderAnswerArray();
    }

    /**
     * 渲染底部遍历结果行
     */
    private renderAnswerArray(): void {
        this.mainGroup.selectAll('.answer-row').remove();
        if (!this.answerNode) return;

        const data = this.answerNode.data;
        const n = data.length;
        const cellW = 40;
        const cellH = 40;
        // 结果行整体以画布中心 x=600 居中排布，避免被 viewBox 左边界裁切
        // 行范围：标签 startX-70 ~ 末格 startX+n*cellW，中心 = startX - 35 + n*cellW/2
        const centerX = 600;
        const startX = centerX + 35 - (n * cellW) / 2;
        const y = 540;

        this.answerRowX0 = startX - 70;
        this.answerRowX1 = startX + n * cellW;

        const g = this.mainGroup.append('g').attr('class', 'answer-row');
        g.append('text')
            .attr('x', startX - 70)
            .attr('y', y + cellH / 2 + 5)
            .style('font-size', '13px')
            .style('font-family', 'monospace')
            .style('fill', '#555')
            .text('遍历结果');

        data.forEach((v, i) => {
            const cg = g.append('g')
                .attr('transform', `translate(${startX + i * cellW}, ${y})`)
                .style('opacity', 0);
            cg.append('rect')
                .attr('width', cellW)
                .attr('height', cellH)
                .attr('fill', '#fdf6e3')
                .attr('stroke', '#888')
                .attr('stroke-width', 1);
            cg.append('text')
                .attr('x', cellW / 2)
                .attr('y', cellH / 2 + 5)
                .attr('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('font-family', 'monospace')
                .text(v !== null ? String(v) : '');
            cg.transition().delay(i * 60).duration(200).style('opacity', 1);
        });
    }

    clear(): void {
        super.clear();
        this.nodes.clear();
        this.ds = null;
        this.mode = 'binary';
        this.answerNode = null;
        this.answerRowX0 = 0;
        this.answerRowX1 = 0;
    }
}
