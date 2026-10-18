import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
import { DataNode } from '../node/DataNode';
import { BinaryTreeNode } from '../node/BinaryTreeNode/BinaryTreeNode';
import { TreeNode } from '../node/TreeNode/TreeNode';
import { TrieNode } from '../node/TreeNode/impl/TrieNode';
import { ArrayNode } from '../node/ArrayNode/ArrayNode';
import { BinarySearchTreeNode } from '../node/BinaryTreeNode/impl/BinarySearchTreeNode/BinarySearchTreeNode';
import { SegmentTreeNode } from '../node/BinaryTreeNode/impl/SegmentTreeNode';
import { BinaryTreeTraversalNode } from '../node/BinaryTreeNode/impl/BinaryTreeTraversalNode';
import { AVLTreeNode } from '../node/BinaryTreeNode/impl/BinarySearchTreeNode/impl/AVLTreeNode';
import { RedBlackTreeNode, RedBlackTree_Red } from '../node/BinaryTreeNode/impl/BinarySearchTreeNode/impl/RedBlackTreeNode';
import { Trie } from '../datastructure/Tree/Trie/Trie';

// 树形数据结构统一只读视图（通过各数据类暴露的只读 getter 提供根节点）
// 注意：二叉树遍历等算法类实例也走同一条创建通道，但没有 getRootNode，必须按可选方法处理
interface TreeLike {
    getRootNode?(): unknown;
}

// 渲染布局项类型
interface BinaryLayoutItem {
    node: BinaryTreeNode<any>;
    x: number;
    y: number;
}
interface TrieLayoutItem {
    node: TrieNode;
    parent: TrieNode | null;
    letter: string | null;
    depth: number;
    order: number;
}

// ---------- 配色 ----------
const COLOR_RED = '#e74c3c';
const COLOR_BLACK = '#2c3e50';
const COLOR_GREEN = '#2ecc71';
const COLOR_WHITE = '#ffffff';
const COLOR_TEXT = '#333333';
const COLOR_FLASH = '#f39c12';
const COLOR_AUX = '#7f8c8d';

/**
 * 二叉树可视化器
 * 处理BST、AVL、红黑树、替罪羊树、Treap、线段树、二叉树遍历、Trie（多叉树）的渲染和动画。
 *
 * 渲染数据源是可视化层自己登记的节点表（节点经create创建时登记），而不是数据结构实例的根指针：
 * 旋转等原子操作先改节点链接、之后数据结构才更新根指针，若只读根指针，
 * 旋转那一帧会看不到整棵新子树（表现为节点缺失、连线消失）。
 */
export class TreeVisualizer extends BaseVisualizer {
    // 所有节点ID -> 节点对象（用于连线、删除与闪烁定位）
    private nodes: Map<number, BinaryTreeNode<any> | TreeNode<any>> = new Map();
    // 当前绑定的数据结构实例（BinarySearchTree/AVLTree/RedBlackTree/SegmentTree/Trie等）
    private ds: TreeLike | null = null;
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
    private static readonly START_Y = 90;
    private static readonly TRIE_H_GAP = 32;
    private static readonly TRIE_V_GAP = 50;
    // 画布尺寸（与 viewBox 一致），用于树整体居中
    private static readonly CANVAS_W = 1200;
    private static readonly CANVAS_H = 600;
    // fitViewBox 最小视图尺寸：限制少节点时被过度放大
    private static readonly MIN_VIEW_W = 340;
    private static readonly MIN_VIEW_H = 240;

    // ---------- 原子操作分发 ----------
    onOp(node: DataNode, method: string, args: any[]): void {
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
            this.handleDsOp(node, method, args);
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
            case '_set_size':       // 替罪羊树size
            case '_set_lazy':       // 线段树懒标记
            case '_set_sum':        // 线段树和
            case '_set_visited':    // 查找/遍历访问标记
            case '_clear_visited':  // 遍历清空访问
                this.render();
                break;
            case '_rotate_left':
            case '_rotate_right':
                // 旋转已改变树的形状：重画整棵树并高亮参与旋转的节点
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
    private handleDsOp(node: DataNode, method: string, args: any[]): void {
        switch (method) {
            case '_create':
            case '_set_root':
                this.ds = node as unknown as TreeLike;
                // 依据数据结构类型判断渲染模式（Trie为多叉树）
                this.mode = node instanceof Trie ? 'trie' : 'binary';
                this.registerRoot(args);
                if (this.mode === 'trie') {
                    this.renderTrie();
                } else {
                    this.render();
                }
                break;
            case '_clear':
                // 清空：数据结构只把根指针置空，旧节点之间仍然互相引用，
                // 必须同时丢弃本层登记的节点，否则会把已清空的树继续画出来
                this.nodes.clear();
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
     * 把_set_root(root)传入的根节点补登记（兜底：节点未在本可视化器登记的情况）
     */
    private registerRoot(args: any[]): void {
        const root = args.length > 0 ? args[0] : null;
        if (root instanceof BinaryTreeNode) {
            this.nodes.set(root.getId(), root);
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
            .attr('stroke', () => '#666');
    }

    /**
     * 数据结构实例记录的根节点（原子操作过程中可能滞后于真实链接，仅作兜底）
     * 二叉树遍历等算法类实例没有 getRootNode，此时返回null（由节点登记表反推根）
     */
    private getDsRoot(): BinaryTreeNode<any> | null {
        if (!this.ds) return null;
        const getter = this.ds.getRootNode;
        if (typeof getter !== 'function') return null;
        const root = getter.call(this.ds);
        if (root === null || root === undefined) return null;
        return root as BinaryTreeNode<any>;
    }

    /**
     * 森林的根节点集合：由本层登记的节点反推——没有被任何节点当作孩子的即为根。
     * 旋转等原子操作先改链接、后由数据结构调用_set_root，
     * 因此这里得到的始终是当前的真实结构。
     */
    private collectRoots(): BinaryTreeNode<any>[] {
        const childIds = new Set<number>();
        this.nodes.forEach((n) => {
            if (!(n instanceof BinaryTreeNode)) return;
            if (n.left) childIds.add(n.left.getId());
            if (n.right) childIds.add(n.right.getId());
        });

        const roots: BinaryTreeNode<any>[] = [];
        this.nodes.forEach((n, id) => {
            if (!(n instanceof BinaryTreeNode)) return;
            if (!childIds.has(id)) roots.push(n);
        });

        const dsRoot = this.getDsRoot();
        if (roots.length === 0) {
            if (dsRoot) roots.push(dsRoot);
            return roots;
        }
        // 数据结构记录的根排在最前，保证主树位置稳定（只影响左右次序）
        if (dsRoot) {
            roots.sort((a, b) => (a === dsRoot ? -1 : b === dsRoot ? 1 : a.getId() - b.getId()));
        }
        return roots;
    }

    /**
     * 计算二叉树节点位置（中序遍历决定水平位置、深度决定垂直位置，最后整体居中）
     * 支持多根（原子操作过程中的临时状态），避免整棵子树不可见
     */
    private layoutTree(): BinaryLayoutItem[] {
        const result: BinaryLayoutItem[] = [];
        const roots = this.collectRoots();
        if (roots.length === 0) return result;

        // 每个节点只登记一次（防止环导致死循环/重复渲染）
        const visited = new Set<number>();
        const flat: { node: BinaryTreeNode<any>; depth: number }[] = [];
        const traverse = (n: BinaryTreeNode<any> | null, depth: number): void => {
            if (!n || visited.has(n.getId())) return;
            visited.add(n.getId());
            traverse(n.left, depth + 1);
            flat.push({ node: n, depth });
            traverse(n.right, depth + 1);
        };
        roots.forEach((root) => traverse(root, 0));
        if (flat.length === 0) return result;

        const firstX = TreeVisualizer.START_X - (flat.length - 1) * TreeVisualizer.H_GAP / 2;
        flat.forEach((item, i) => {
            result.push({
                node: item.node,
                x: firstX + i * TreeVisualizer.H_GAP,
                y: TreeVisualizer.START_Y + item.depth * TreeVisualizer.V_GAP,
            });
        });

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
     * 节点显示文本（按节点类型读取，不使用鸭子类型）
     */
    private nodeText(node: BinaryTreeNode<any>): string {
        if (node instanceof BinarySearchTreeNode) return String(node.val);
        if (node instanceof BinaryTreeTraversalNode) return String(node.val);
        if (node instanceof SegmentTreeNode) return String(node.sum);
        return '';
    }

    /**
     * 节点附加标签（AVL高度 / 线段树懒标记）
     */
    private nodeAux(node: BinaryTreeNode<any>): string {
        if (node instanceof AVLTreeNode) return 'h=' + node.height;
        if (node instanceof SegmentTreeNode) {
            return (node.lazy !== null && node.lazy !== 0) ? 'lazy=' + node.lazy : '';
        }
        return '';
    }

    /**
     * 附加标签颜色（线段树懒标记用橙色突出）
     */
    private nodeAuxFill(node: BinaryTreeNode<any>): string {
        if (node instanceof SegmentTreeNode && node.lazy !== null && node.lazy !== 0) return COLOR_FLASH;
        return COLOR_AUX;
    }

    /**
     * 节点填充颜色（查找/遍历高亮 / 红黑树颜色 / 默认）
     */
    private nodeFill(node: BinaryTreeNode<any>): string {
        // 查找/遍历高亮：当前节点绿色（优先于红黑树颜色）
        if (node instanceof BinarySearchTreeNode && node.visited) return COLOR_GREEN;
        if (node instanceof BinaryTreeTraversalNode && node.visited) return COLOR_GREEN;
        if (node instanceof RedBlackTreeNode) {
            return node.color === RedBlackTree_Red ? COLOR_RED : COLOR_BLACK;
        }
        return COLOR_WHITE;
    }

    /**
     * 节点文字颜色
     */
    private nodeTextFill(node: BinaryTreeNode<any>): string {
        if (node instanceof BinarySearchTreeNode && node.visited) return COLOR_WHITE;
        if (node instanceof BinaryTreeTraversalNode && node.visited) return COLOR_WHITE;
        if (node instanceof RedBlackTreeNode) return COLOR_WHITE;
        return COLOR_TEXT;
    }

    /**
     * 边层（保证连线永远画在节点下方；二叉树与Trie共用）
     */
    private edgeLayer(): d3.Selection<SVGGElement, unknown, null, undefined> {
        let layer = this.mainGroup.select<SVGGElement>('g.tree-edge-layer');
        if (layer.empty()) {
            layer = this.mainGroup.append('g').attr('class', 'tree-edge-layer');
        }
        layer.lower();
        return layer;
    }

    /**
     * 渲染二叉树
     */
    private render(): void {
        if (this.mode !== 'binary') return;
        const layout = this.layoutTree();

        // 1. 连线（在节点下层）
        this.renderEdges(layout);

        // 2. 节点（key取节点自身id，保证增删时复用同一个DOM元素）
        const nodeGroups = this.mainGroup.selectAll<SVGGElement, BinaryLayoutItem>('.tree-node')
            .data<BinaryLayoutItem>(layout, (d: BinaryLayoutItem) => d.node.getId());

        // enter：直接出现在目标位置（不做淡入——快速连续渲染会打断动画导致透明度卡0）
        const enterGroups = nodeGroups.enter()
            .append('g')
            .attr('class', 'tree-node')
            .attr('data-id', (d: BinaryLayoutItem) => d.node.getId())
            .attr('transform', (d: BinaryLayoutItem) => `translate(${d.x}, ${d.y})`)
            .style('opacity', 1);

        enterGroups.append('circle')
            .attr('r', TreeVisualizer.NODE_RADIUS)
            .attr('stroke', '#666')
            .attr('stroke-width', 1.5);

        enterGroups.append('text')
            .attr('class', 'node-value')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('font-family', 'monospace');

        enterGroups.append('text')
            .attr('class', 'node-aux')
            .attr('text-anchor', 'middle')
            .attr('y', -(TreeVisualizer.NODE_RADIUS + 6))
            .style('font-size', '10px')
            .style('font-family', 'monospace');

        // 3. 统一更新（enter与update都更新文本/配色/附加标签）
        const merged = enterGroups.merge(nodeGroups);

        merged.select('circle')
            .attr('fill', (d: BinaryLayoutItem) => this.nodeFill(d.node));

        merged.select('.node-value')
            .text((d: BinaryLayoutItem) => this.nodeText(d.node))
            .attr('fill', (d: BinaryLayoutItem) => this.nodeTextFill(d.node));

        merged.select('.node-aux')
            .text((d: BinaryLayoutItem) => this.nodeAux(d.node))
            .attr('fill', (d: BinaryLayoutItem) => this.nodeAuxFill(d.node));

        // 4. 位置过渡（enter已在目标位置，此处对已有节点生效）
        merged.transition('move').duration(300)
            .attr('transform', (d: BinaryLayoutItem) => `translate(${d.x}, ${d.y})`);

        // 5. 退出节点直接移除（不做淡出，避免残留透明度为0的节点）
        nodeGroups.exit().remove();

        // 6. 遍历结果数组（底部）
        this.renderAnswerArray();

        // 7. 自适应 viewBox：树的包围盒自动填满画布，任何窗口宽度下数值都清晰可读
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
        // 留白：左右 R+30，上方含标签 R+40，下方含附加标签
        let x0 = minX - R - 30;
        const y0 = minY - R - 40;
        let w = (maxX - minX) + 2 * (R + 30);
        let h = (maxY - minY) + 2 * R + 85;
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
     * 渲染树边（父子节点连线）：以本次布局为准，保证每条真实父子关系都有连线
     */
    private renderEdges(layout: BinaryLayoutItem[]): void {
        const layer = this.edgeLayer();
        layer.selectAll('*').remove();

        const posMap = new Map<number, { x: number; y: number }>();
        layout.forEach(item => posMap.set(item.node.getId(), { x: item.x, y: item.y }));

        const addEdge = (from: { x: number; y: number }, to: { x: number; y: number }): void => {
            layer.append('line')
                .attr('class', 'tree-edge')
                .attr('x1', from.x)
                .attr('y1', from.y)
                .attr('x2', to.x)
                .attr('y2', to.y)
                .attr('stroke', '#999999')
                .attr('stroke-width', 1.5);
        };

        layout.forEach(item => {
            const from = { x: item.x, y: item.y };
            const left = item.node.left;
            const right = item.node.right;
            if (left) {
                const to = posMap.get(left.getId());
                if (to) addEdge(from, to);
            }
            if (right) {
                const to = posMap.get(right.getId());
                if (to) addEdge(from, to);
            }
        });
    }

    // ================== Trie（多叉树）渲染 ==================

    /**
     * 收集Trie节点（BFS），返回 节点/父节点/边字母/深度/层内序号
     */
    private collectTrie(): TrieLayoutItem[] {
        const result: TrieLayoutItem[] = [];
        const getter = this.ds?.getRootNode;
        const root = (typeof getter === 'function' ? getter.call(this.ds) : null) as TrieNode | null;
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

        // 1. 边（带字母标签，同样置于节点下层）
        const layer = this.edgeLayer();
        layer.selectAll('*').remove();
        items.forEach(item => {
            if (!item.parent) return;
            const p = posMap.get(item.parent.getId());
            const c = posMap.get(item.node.getId());
            if (!p || !c) return;
            const midX = (p.x + c.x) / 2;
            const midY = (p.y + c.y) / 2;
            layer.append('line')
                .attr('class', 'trie-edge')
                .attr('x1', p.x)
                .attr('y1', p.y)
                .attr('x2', c.x)
                .attr('y2', c.y)
                .attr('stroke', '#999')
                .attr('stroke-width', 1.5);
            layer.append('text')
                .attr('class', 'trie-edge')
                .attr('x', midX)
                .attr('y', midY - 4)
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .style('font-family', 'monospace')
                .style('fill', '#7f8c8d')
                .text(item.letter);
        });

        // 2. 节点
        const nodeGroups = this.mainGroup.selectAll<SVGGElement, TrieLayoutItem>('.tree-node')
            .data<TrieLayoutItem>(items, (d: TrieLayoutItem) => d.node.getId());

        const enterGroups = nodeGroups.enter()
            .append('g')
            .attr('class', 'tree-node')
            .attr('data-id', (d: TrieLayoutItem) => d.node.getId())
            .attr('transform', (d: TrieLayoutItem) => {
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
            .style('fill', COLOR_TEXT);

        const merged = enterGroups.merge(nodeGroups);

        merged.select('.node-value')
            .text((d: TrieLayoutItem) => d.node.pass + '/' + d.node.end);

        merged.transition('move').duration(300).attr('transform', (d: TrieLayoutItem) => {
            const p = posMap.get(d.node.getId())!;
            return `translate(${p.x}, ${p.y})`;
        });

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
