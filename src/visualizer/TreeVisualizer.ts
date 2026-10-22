import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
import { BinaryTreeNode } from '../node/BinaryTreeNode/BinaryTreeNode';
import { TreeNode } from '../node/TreeNode/TreeNode';
import { TrieNode } from '../node/TreeNode/impl/TrieNode';
import { ArrayNode } from '../node/ArrayNode/ArrayNode';
import { BinarySearchTreeNode } from '../node/BinaryTreeNode/impl/BinarySearchTreeNode/BinarySearchTreeNode';
import { SegmentTreeNode } from '../node/BinaryTreeNode/impl/SegmentTreeNode';
import { BinaryTreeTraversalNode } from '../node/BinaryTreeNode/impl/BinaryTreeTraversalNode';
import { AVLTreeNode } from '../node/BinaryTreeNode/impl/BinarySearchTreeNode/impl/AVLTreeNode';
import { RedBlackTreeNode, RedBlackTree_Red } from '../node/BinaryTreeNode/impl/BinarySearchTreeNode/impl/RedBlackTreeNode';
import { TreapTreeNode } from '../node/BinaryTreeNode/impl/BinarySearchTreeNode/impl/TreapTreeNode';
import { ScapegoatTreeNode } from '../node/BinaryTreeNode/impl/BinarySearchTreeNode/impl/ScapegoatTreeNode';
import { Trie } from '../datastructure/Tree/Trie/Trie';
import { BinarySearchTree } from '../datastructure/Tree/BinarySearchTree/BinarySearchTree';
import { AVLTree } from '../datastructure/Tree/BinarySearchTree/AVLTree';
import { RedBlackTree } from '../datastructure/Tree/BinarySearchTree/RedBlackTree';
import { ScapegoatTree } from '../datastructure/Tree/BinarySearchTree/ScapegoatTree';
import { TreapTree } from '../datastructure/Tree/BinarySearchTree/TreapTree';
import { SegmentTree } from '../datastructure/Tree/SegmentTree/SegmentTree';
import { BinaryTreeTraversal } from '../algorithm/Tree/BinaryTreeTraversal';

// 树形可视化覆盖的数据结构/算法实例
type TreeDS =
    | BinarySearchTree | AVLTree | RedBlackTree | ScapegoatTree | TreapTree
    | SegmentTree | Trie | BinaryTreeTraversal;

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

/************************************************** */
// 配色
const COLOR_RED = '#e74c3c';
const COLOR_BLACK = '#2c3e50';
const COLOR_WHITE = '#ffffff';
const COLOR_TEXT = '#333333';
const COLOR_FLASH = '#f39c12';
const COLOR_AUX = '#7f8c8d';
const COLOR_VISIT_RING = '#2b6cb0';

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
    private ds: TreeDS | null = null;
    // 渲染模式
    private mode: 'binary' | 'trie' = 'binary';
    // 遍历结果数组
    private answerNode: ArrayNode | null = null;
    // 遍历结果行始终保持的格子数（算法层 _delete 清空数据时不缩短）
    private answerLength = 0;
    // 遍历结果行的水平范围（用于 viewBox 纳入）
    private answerRowX0 = 0;
    private answerRowX1 = 0;
    // 替罪羊树子树重构期间显示的中序序列
    private rebuildSequence: number[] | null = null;
    // 重构后的子树根节点（此阶段只显示这棵独立子树，暂不连接父节点）
    private rebuildSubtreeRoot: BinaryTreeNode<any> | null = null;
    // 重构期间需要暂时从树视图隐藏的原子树节点
    private rebuildHiddenIds: Set<number> = new Set();
    // 是否已经排入一次树重绘（同一批原子操作只重绘一次）
    private renderQueued: boolean = false;
    private queuedRenderDuration: number = 0;
    // 同一次算法步骤内发生旋转的节点，重绘后统一闪烁，
    // 避免旋转、_set_left/_set_right 各自排队导致多次完整渲染。
    private rotationFlashIds: Set<number> = new Set();
    private trieRenderQueued: boolean = false;

    private static readonly NODE_RADIUS = 15;
    private static readonly H_GAP = 50;
    private static readonly V_GAP = 60;
    private static readonly START_X = 560;
    private static readonly START_Y = 90;
    private static readonly TRIE_H_GAP = 52;
    private static readonly TRIE_V_GAP = 76;
    // 画布尺寸（与 viewBox 一致），用于树整体居中
    private static readonly CANVAS_W = 1200;
    private static readonly CANVAS_H = 600;
    // fitViewBox 最小视图尺寸：限制少节点时被过度放大
    private static readonly MIN_VIEW_W = 340;
    private static readonly MIN_VIEW_H = 240;

    /************************************************** */
    // 原子操作分发
    onOp(node: object, method: string, args: unknown[]): void {
        // 遍历结果数组
        if (node instanceof ArrayNode) {
            this.handleAnswerArray(node, method, args);
            return;
        }
        // Trie节点（多叉树节点）
        if (node instanceof TreeNode && !(node instanceof BinaryTreeNode)) {
            this.mode = 'trie';
            this.enqueueTrieRender();
            return;
        }
        // 数据结构实例（非节点）
        if (!(node instanceof BinaryTreeNode)) {
            this.handleDsOp(node, method, args);
            return;
        }

        const treeNode = node;
        switch (method) {
            case '_create':
                this.nodes.set(treeNode.getId(), treeNode);
                this.enqueueRender(0);
                break;
            case '_set_left':
            case '_set_right':
                this.enqueueRender(260);
                break;
            case '_set_value':
            case '_set_height':     // AVL高度
            case '_set_color':      // 红黑树颜色
            case '_set_size':       // 替罪羊树size
            case '_set_lazy':       // 线段树懒标记
            case '_set_sum':        // 线段树和
            case '_set_visited':    // 查找/遍历访问标记
            case '_clear_visited':  // 遍历清空访问
                // 只改节点文字/颜色/访问圈，不重建整棵树，避免轻量更新触发完整布局。
                this.enqueueNodeUpdate(treeNode, method);
                break;
            case '_rotate_left':
            case '_rotate_right':
                // 旋转往往紧跟 _set_left/_set_right，统一合并成一次重绘，
                // 只保留一次短动画，避免一次旋转产生多段等待。
                this.rotationFlashIds.add(treeNode.getId());
                this.enqueueRender(220);
                break;
            case '_delete':
                this.nodes.delete(treeNode.getId());
                this.enqueueRender(220);
                break;
            default:
                break;
        }
    }

    /**
     * 将单个节点的字段更新加入动画队列。
     * 高度、size、颜色、访问标记等不影响树形布局，直接更新对应 DOM，
     * 避免每次递增都整树重绘并等待 260ms。
     */
    private enqueueNodeUpdate(node: BinaryTreeNode<any>, method: string): void {
        this.animations.enqueue(() => {
            const group = this.mainGroup.select(`.tree-node[data-id="${node.getId()}"]`);
            if (group.empty()) {
                // 节点 DOM 还没创建（例如刚 create 的新节点），退回一次完整渲染
                this.enqueueRender(0);
                return;
            }

            if (method === '_set_height' || method === '_set_size' || method === '_set_lazy') {
                group.select('.node-aux')
                    .text(this.nodeAux(node))
                    .attr('fill', this.nodeAuxFill(node));
                return;
            }
            if (method === '_set_value' || method === '_set_sum') {
                group.select('.node-value').text(this.nodeText(node));
                return;
            }
            if (method === '_set_color') {
                group.select('circle:not(.node-visit-ring)').attr('fill', this.nodeFill(node));
                group.select('.node-value').attr('fill', this.nodeTextFill(node));
                return;
            }
            if (method === '_set_visited' || method === '_clear_visited') {
                group.select('.node-visit-ring')
                    .style('opacity', this.nodeVisited(node) ? 1 : 0);
            }
        });
    }

    /**
     * 将二叉树重绘加入动画队列。
     * @param duration 重绘后需要等待的动画时长
     */
    private enqueueRender(duration: number): void {
        this.queuedRenderDuration = Math.max(this.queuedRenderDuration, duration);
        if (this.renderQueued) {
            return;
        }
        this.renderQueued = true;
        this.animations.enqueue(async () => {
            const wait = this.queuedRenderDuration;
            const flashIds = [...this.rotationFlashIds];
            this.queuedRenderDuration = 0;
            this.renderQueued = false;
            this.rotationFlashIds.clear();
            // 有旋转时冻结 viewBox，避免整棵树在旋转过程中缩放跳动
            this.render(flashIds.length === 0);
            flashIds.forEach(id => this.flashNode(id));
            await this.delay(wait);
        });
    }

    /**
     * 将 Trie 重绘加入动画队列。
     */
    private enqueueTrieRender(): void {
        if (this.trieRenderQueued) {
            return;
        }
        this.trieRenderQueued = true;
        this.animations.enqueue(async () => {
            this.trieRenderQueued = false;
            this.renderTrie();
            await this.delay(260);
        });
    }

    /**
     * 处理数据结构级原子操作
     */
    private isTreeDS(node: object): node is TreeDS {
        return node instanceof BinarySearchTree || node instanceof AVLTree ||
            node instanceof RedBlackTree || node instanceof ScapegoatTree ||
            node instanceof TreapTree || node instanceof SegmentTree ||
            node instanceof Trie || node instanceof BinaryTreeTraversal;
    }

    private handleDsOp(node: object, method: string, args: unknown[]): void {
        switch (method) {
            case '_create':
            case '_set_root':
                if (!this.isTreeDS(node)) return;
                this.ds = node;
                // 依据数据结构类型判断渲染模式（Trie为多叉树）
                this.mode = node instanceof Trie ? 'trie' : 'binary';
                this.registerRoot(args);
                if (this.mode === 'trie') {
                    this.enqueueTrieRender();
                } else {
                    this.enqueueRender(260);
                }
                break;
            case '_clear':
                // 清空：数据结构只把根指针置空，旧节点之间仍然互相引用，
                // 必须同时丢弃本层登记的节点，否则会把已清空的树继续画出来
                this.nodes.clear();
                this.rebuildSequence = null;
                this.rebuildSubtreeRoot = null;
                this.rebuildHiddenIds.clear();
                if (this.mode === 'trie') {
                    this.enqueueTrieRender();
                } else {
                    this.enqueueRender(260);
                }
                break;
            case '_show_rebuild_sequence': {
                // 替罪羊树重构开始：原子树暂时从树视图移除，底部显示中序序列
                const values = args[0];
                const root = args[1];
                this.rebuildSequence = Array.isArray(values)
                    ? values.map(value => Number(value))
                    : null;
                this.rebuildSubtreeRoot = null;
                this.rebuildHiddenIds = root instanceof BinaryTreeNode
                    ? this.collectSubtreeIds(root)
                    : new Set<number>();
                this.enqueueRender(260);
                break;
            }
            case '_show_rebuilt_subtree': {
                // 重建完成：序列收起到独立子树，此时还没有链接回父节点
                const root = args[0];
                this.rebuildSequence = null;
                this.rebuildSubtreeRoot = root instanceof BinaryTreeNode ? root : null;
                this.enqueueRender(0);
                break;
            }
            case '_hide_rebuild_sequence':
                // 新子树准备链接回原位置，恢复整棵树视图
                this.rebuildSequence = null;
                this.rebuildSubtreeRoot = null;
                this.rebuildHiddenIds.clear();
                this.enqueueRender(260);
                break;
            default:
                break;
        }
    }

    /**
     * 把_set_root(root)传入的根节点补登记（兜底：节点未在本可视化器登记的情况）
     */
    private registerRoot(args: unknown[]): void {
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
            .duration(90)
            .attr('stroke', COLOR_FLASH)
            .attr('stroke-width', 4)
            .transition()
            .duration(130)
            .attr('stroke', () => '#666');
    }

    /**
     * 数据结构实例记录的根节点（原子操作过程中可能滞后于真实链接，仅作兜底）
     * 二叉树遍历等算法类实例没有 getRootNode，此时返回null（由节点登记表反推根）
     */
    private getDsRoot(): BinaryTreeNode<any> | null {
        const ds = this.ds;
        if (ds instanceof BinarySearchTree || ds instanceof AVLTree ||
            ds instanceof RedBlackTree || ds instanceof ScapegoatTree ||
            ds instanceof TreapTree || ds instanceof SegmentTree) {
            return ds.getRootNode();
        }
        return null;
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
     * 收集一棵子树中的所有节点 id。
     * 替罪羊树重构时用它在树视图中暂时隐藏整棵原子树。
     */
    private collectSubtreeIds(root: BinaryTreeNode<any>): Set<number> {
        const ids = new Set<number>();
        const traverse = (node: BinaryTreeNode<any> | null): void => {
            if (!node || ids.has(node.getId())) return;
            ids.add(node.getId());
            traverse(node.left);
            traverse(node.right);
        };
        traverse(root);
        return ids;
    }

    /**
     * 计算二叉树节点位置（中序遍历决定水平位置、深度决定垂直位置，最后整体居中）
     * 支持多根（原子操作过程中的临时状态），避免整棵子树不可见
     */
    private layoutTree(): BinaryLayoutItem[] {
        const result: BinaryLayoutItem[] = [];

        // 子树重构的中间阶段：原树剩余部分和重建后的独立子树同时显示（森林），
        // 两者都保留在画布上，最后一步再把独立子树链接回父节点。
        const detached = this.rebuildSubtreeRoot;
        const normalRoots = this.collectRoots().filter(
            root => !this.rebuildHiddenIds.has(root.getId()),
        );
        const roots = detached
            ? [...normalRoots.filter(root => root !== detached), detached]
            : normalRoots;
        if (roots.length === 0) return result;

        // 每个节点只登记一次（防止环导致死循环/重复渲染）
        const visited = new Set<number>();
        const flat: { node: BinaryTreeNode<any>; depth: number }[] = [];
        const traverse = (
            n: BinaryTreeNode<any> | null,
            depth: number,
            allowHidden: boolean,
        ): void => {
            if (!n || visited.has(n.getId())) return;
            if (!allowHidden && this.rebuildHiddenIds.has(n.getId())) return;
            visited.add(n.getId());
            traverse(n.left, depth + 1, allowHidden);
            flat.push({ node: n, depth });
            traverse(n.right, depth + 1, allowHidden);
        };
        roots.forEach((root) => traverse(root, 0, root === detached));
        if (flat.length === 0) return result;

        const firstX = TreeVisualizer.START_X - (flat.length - 1) * TreeVisualizer.H_GAP / 2;
        flat.forEach((item, i) => {
            result.push({
                node: item.node,
                x: firstX + i * TreeVisualizer.H_GAP,
                y: TreeVisualizer.START_Y + item.depth * TreeVisualizer.V_GAP,
            });
        });

        // 节点坐标保持稳定：旋转时只让相关子树改变深度，不再重算全局偏移。
        // 画布居中由 fitViewBox 通过 viewBox 完成。
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
        if (node instanceof TreapTreeNode) return 'p=' + node.priority;
        if (node instanceof ScapegoatTreeNode) return 'size=' + node.size;
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
     * 当前正在比较/经过/处理的节点用外圈标记，不改变节点自身颜色
     */
    private nodeVisited(node: BinaryTreeNode<any>): boolean {
        if (node instanceof BinarySearchTreeNode) return node.visited;
        if (node instanceof BinaryTreeTraversalNode) return node.visited;
        return false;
    }

    /**
     * 节点填充颜色（红黑树颜色 / 默认）
     */
    private nodeFill(node: BinaryTreeNode<any>): string {
        if (node instanceof RedBlackTreeNode) {
            return node.color === RedBlackTree_Red ? COLOR_RED : COLOR_BLACK;
        }
        return COLOR_WHITE;
    }

    /**
     * 节点文字颜色
     */
    private nodeTextFill(node: BinaryTreeNode<any>): string {
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
    private render(fit: boolean = true): void {
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
            .attr('class', 'node-visit-ring')
            .attr('r', TreeVisualizer.NODE_RADIUS + 5)
            .attr('fill', 'none')
            .attr('stroke', COLOR_VISIT_RING)
            .attr('stroke-width', 3)
            .style('opacity', 0)
            .style('pointer-events', 'none');

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
            .style('font-family', '"JetBrains Mono", SimHei, monospace');

        enterGroups.append('text')
            .attr('class', 'node-aux')
            .attr('text-anchor', 'middle')
            .attr('y', -(TreeVisualizer.NODE_RADIUS + 6))
            .style('font-size', '10px')
            .style('font-family', '"JetBrains Mono", SimHei, monospace');

        // 3. 统一更新（enter与update都更新文本/配色/附加标签）
        const merged = enterGroups.merge(nodeGroups);

        merged.select('.node-visit-ring')
            .style('opacity', (d: BinaryLayoutItem) => this.nodeVisited(d.node) ? 1 : 0);

        merged.select('circle:not(.node-visit-ring)')
            .attr('fill', (d: BinaryLayoutItem) => this.nodeFill(d.node));

        merged.select('.node-value')
            .text((d: BinaryLayoutItem) => this.nodeText(d.node))
            .attr('fill', (d: BinaryLayoutItem) => this.nodeTextFill(d.node));

        merged.select('.node-aux')
            .text((d: BinaryLayoutItem) => this.nodeAux(d.node))
            .attr('fill', (d: BinaryLayoutItem) => this.nodeAuxFill(d.node));

        // 4. 位置过渡（enter已在目标位置，此处对已有节点生效）
        merged.transition('move').duration(220)
            .attr('transform', (d: BinaryLayoutItem) => `translate(${d.x}, ${d.y})`);

        // 5. 退出节点直接移除（不做淡出，避免残留透明度为0的节点）
        nodeGroups.exit().remove();

        // 6. 遍历结果数组 / 替罪羊树重构序列（底部）
        this.renderAnswerArray();
        this.renderRebuildSequence();

        // 7. 自适应 viewBox：旋转过程中冻结，普通更新后重新适配
        if (fit) {
            this.fitViewBox(layout.map(i => ({ x: i.x, y: i.y })));
        }
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
        // 遍历/子树重构模式：把底部结果行纳入视图（含水平范围，防止标签/首格被裁）
        if (this.answerNode || this.rebuildSequence) {
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

        const posMap = new Map<number, { x: number; y: number }>();
        layout.forEach(item => posMap.set(item.node.getId(), { x: item.x, y: item.y }));

        interface EdgeLayout {
            childId: number;
            parentId: number;
            from: { x: number; y: number };
            to: { x: number; y: number };
        }

        const edges: EdgeLayout[] = [];
        layout.forEach(item => {
            const from = { x: item.x, y: item.y };
            const fromHidden = this.rebuildHiddenIds.has(item.node.getId());
            const left = item.node.left;
            const right = item.node.right;

            // 子树重构阶段：普通树不能画一条“假边”连到右侧独立显示的子树
            const canConnect = (child: BinaryTreeNode<any>): boolean => {
                if (!this.rebuildSubtreeRoot) return true;
                if (fromHidden) return true;
                return !this.rebuildHiddenIds.has(child.getId());
            };

            if (left && canConnect(left)) {
                const to = posMap.get(left.getId());
                if (to) {
                    edges.push({ childId: left.getId(), parentId: item.node.getId(), from, to });
                }
            }
            if (right && canConnect(right)) {
                const to = posMap.get(right.getId());
                if (to) {
                    edges.push({ childId: right.getId(), parentId: item.node.getId(), from, to });
                }
            }
        });

        // 以“子节点 id”为 key：旋转时父节点改变，但同一条边会从旧位置平滑移动到新位置
        const lines = layer.selectAll<SVGLineElement, EdgeLayout>('line.tree-edge')
            .data(edges, edge => edge.childId);

        const enter = lines.enter()
            .append('line')
            .attr('class', 'tree-edge')
            .attr('x1', edge => edge.from.x)
            .attr('y1', edge => edge.from.y)
            .attr('x2', edge => edge.to.x)
            .attr('y2', edge => edge.to.y)
            .attr('stroke', '#999999')
            .attr('stroke-width', 1.5);

        enter.merge(lines)
            .transition('tree-edge-move')
            .duration(220)
            .attr('x1', edge => edge.from.x)
            .attr('y1', edge => edge.from.y)
            .attr('x2', edge => edge.to.x)
            .attr('y2', edge => edge.to.y);

        lines.exit().remove();
    }

    /************************************************** */
    // Trie（多叉树）渲染

    /**
     * 收集Trie节点（BFS），返回 节点/父节点/边字母/深度/层内序号
     */
    private collectTrie(): TrieLayoutItem[] {
        const result: TrieLayoutItem[] = [];
        const root = this.ds instanceof Trie ? this.ds.getRootNode() : null;
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
        if (items.length === 0) {
            this.renderAnswerArray();
            this.fitViewBox([]);
            return;
        }

        // 按父子关系做整齐的树布局：同一父节点的子树互不重叠，分支不会被挤在同一条竖线上
        const childrenMap = new Map<number, TrieLayoutItem[]>();
        items.forEach(item => {
            if (!item.parent) return;
            const parentId = item.parent.getId();
            const siblings = childrenMap.get(parentId);
            if (siblings) siblings.push(item);
            else childrenMap.set(parentId, [item]);
        });
        const hierarchy = d3.hierarchy<TrieLayoutItem>(
            items[0],
            item => childrenMap.get(item.node.getId()),
        );
        const treeLayout = d3.tree<TrieLayoutItem>()
            .nodeSize([TreeVisualizer.TRIE_H_GAP, TreeVisualizer.TRIE_V_GAP])
            .separation((a, b) => a.parent === b.parent ? 1 : 1.2);
        treeLayout(hierarchy);

        const nodes = hierarchy.descendants();
        let minX = Infinity, maxX = -Infinity;
        nodes.forEach(node => {
            const x = node.x ?? 0;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
        });
        const offsetX = TreeVisualizer.CANVAS_W / 2 - (minX + maxX) / 2;
        nodes.forEach(node => {
            posMap.set(node.data.node.getId(), {
                x: (node.x ?? 0) + offsetX,
                y: TreeVisualizer.START_Y + (node.y ?? 0),
            });
        });

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
            const labelOnLeft = c.x < p.x - 1;
            layer.append('line')
                .attr('class', 'trie-edge')
                .attr('x1', p.x)
                .attr('y1', p.y)
                .attr('x2', c.x)
                .attr('y2', c.y)
                .attr('stroke', '#999')
                .attr('stroke-width', 1.5);
            layer.append('text')
                .attr('class', 'trie-edge-label')
                .attr('x', midX + (labelOnLeft ? -9 : 9))
                .attr('y', midY + 4)
                .attr('text-anchor', labelOnLeft ? 'end' : 'start')
                .style('font-size', '12px')
                .style('font-family', '"JetBrains Mono", SimHei, monospace')
                .style('font-weight', 'bold')
                .style('fill', '#5f6b7a')
                .style('paint-order', 'stroke')
                .style('stroke', '#fafafa')
                .style('stroke-width', '4px')
                .style('stroke-linejoin', 'round')
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
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('fill', COLOR_TEXT);

        const merged = enterGroups.merge(nodeGroups);

        merged.select('.node-value')
            .text((d: TrieLayoutItem) => d.node.pass + '/' + d.node.end);

        merged.transition('move').duration(220).attr('transform', (d: TrieLayoutItem) => {
            const p = posMap.get(d.node.getId())!;
            return `translate(${p.x}, ${p.y})`;
        });

        nodeGroups.exit().remove();

        this.renderAnswerArray();

        // Trie 同样自适应 viewBox
        this.fitViewBox(Array.from(posMap.values()));
    }

    /************************************************** */
    // 遍历结果数组

    /**
     * 处理遍历结果数组。
     *
     * 算法层已经预分配 n 个槽位，并用 _set_value 填充；
     * 这里不能因为 _delete 把显示长度缩回 0，否则预分配的空格子会消失。
     */
    private handleAnswerArray(node: ArrayNode, method: string, args: unknown[]): void {
        if (this.answerNode !== node || method === '_create') {
            this.answerNode = node;
            this.answerLength = node.data.length;
        } else {
            this.answerLength = Math.max(this.answerLength, node.data.length);
        }

        const highlightIdx = method === '_set_value' ? args[0] as number : null;
        this.animations.enqueue(() => {
            this.renderAnswerArray(highlightIdx);
            this.fitAnswerViewBox();
        });
    }

    /**
     * 让当前树和遍历结果行一起进入 viewBox。
     * 遍历时通常只有 _set_visited/_set_value，不会触发整树 render，
     * 因此必须在这里单独适配，否则 y=540 的结果行会被裁掉。
     */
    private fitAnswerViewBox(): void {
        if (this.mode !== 'binary') return;
        const layout = this.layoutTree();
        const points = layout.length > 0
            ? layout.map(item => ({ x: item.x, y: item.y }))
            : [{ x: TreeVisualizer.START_X, y: TreeVisualizer.START_Y }];
        this.fitViewBox(points);
    }

    /**
     * 渲染底部遍历结果行。
     * 槽位只创建一次，_set_value 时只更新对应格子的数字，避免整行反复重建。
     */
    private renderAnswerArray(highlightIdx: number | null = null): void {
        if (!this.answerNode) {
            this.mainGroup.selectAll('.answer-row').remove();
            return;
        }

        const data = this.answerNode.data;
        const n = Math.max(this.answerLength, data.length);
        const cellW = 40;
        const cellH = 40;
        // 结果行整体以画布中心 x=600 居中排布，避免被 viewBox 左边界裁切
        // 行范围：标签 startX-70 ~ 末格 startX+n*cellW，中心 = startX - 35 + n*cellW/2
        const centerX = 600;
        const startX = centerX + 35 - (n * cellW) / 2;
        const y = 540;

        this.answerRowX0 = startX - 70;
        this.answerRowX1 = startX + n * cellW;

        let g = this.mainGroup.select<SVGGElement>('g.answer-row');
        if (g.empty()) {
            g = this.mainGroup.append('g').attr('class', 'answer-row');
        }
        let label = g.select<SVGTextElement>('text.answer-label');
        if (label.empty()) {
            label = g.append('text').attr('class', 'answer-label');
        }
        label
            .attr('x', startX - 12)
            .attr('y', y + cellH / 2 + 5)
            .attr('text-anchor', 'end')
            .style('font-size', '13px')
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('fill', '#555')
            .text('遍历结果');

        const indices = Array.from({ length: n }, (_, i) => i);
        const cells = g.selectAll<SVGGElement, number>('g.answer-cell')
            .data(indices, (idx: number) => idx);

        const enter = cells.enter()
            .append('g')
            .attr('class', 'answer-cell')
            .style('opacity', 1);

        enter.append('rect')
            .attr('width', cellW)
            .attr('height', cellH)
            .attr('fill', '#fdf6e3')
            .attr('stroke', '#888')
            .attr('stroke-width', 1);

        enter.append('text')
            .attr('x', cellW / 2)
            .attr('y', cellH / 2 + 5)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-family', '"JetBrains Mono", SimHei, monospace');

        const merged = enter.merge(cells);
        merged.attr('transform', (idx: number) => `translate(${startX + idx * cellW}, ${y})`);
        merged.select('text').text((idx: number) => {
            const value = data[idx];
            return value !== null && value !== undefined ? String(value) : '';
        });

        // 只高亮本次写入的格子，整行不会重新淡入
        if (highlightIdx !== null && highlightIdx >= 0 && highlightIdx < n) {
            merged.filter((idx: number) => idx === highlightIdx)
                .select('rect')
                .interrupt()
                .attr('fill', COLOR_FLASH)
                .transition()
                .duration(180)
                .attr('fill', '#fdf6e3');
        }

        cells.exit().remove();
    }

    /**
     * 渲染替罪羊树重构期间底部的“中序序列”行。
     * 子树在树视图中暂时隐藏，用户先看到它展开成有序序列。
     */
    private renderRebuildSequence(): void {
        this.mainGroup.selectAll('.rebuild-row').remove();
        if (!this.rebuildSequence) return;

        const data = this.rebuildSequence;
        const n = data.length;
        // 与数组可视化器的单元格尺寸保持一致，避免序列行看起来过小
        const cellW = 60;
        const cellH = 50;
        const centerX = 600;
        const startX = centerX + 35 - (n * cellW) / 2;
        const y = 530;

        this.answerRowX0 = startX - 80;
        this.answerRowX1 = startX + n * cellW;

        const g = this.mainGroup.append('g').attr('class', 'rebuild-row');
        g.append('text')
            .attr('x', startX - 80)
            .attr('y', y + cellH / 2 + 5)
            .style('font-size', '14px')
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('fill', '#3b6e99')
            .text('中序序列');

        data.forEach((v, i) => {
            const cell = g.append('g')
                .attr('transform', `translate(${startX + i * cellW}, ${y})`)
                .style('opacity', 0);
            cell.append('rect')
                .attr('width', cellW)
                .attr('height', cellH)
                .attr('fill', '#eef6ff')
                .attr('stroke', '#5b8db8')
                .attr('stroke-width', 1.5);
            cell.append('text')
                .attr('x', cellW / 2)
                .attr('y', cellH / 2 + 6)
                .attr('text-anchor', 'middle')
                .style('font-size', '16px')
                .style('font-family', '"JetBrains Mono", SimHei, monospace')
                .style('fill', '#2d3748')
                .text(String(v));
            cell.transition().delay(i * 45).duration(180).style('opacity', 1);
        });
    }

    clear(): void {
        super.clear();
        this.nodes.clear();
        this.ds = null;
        this.mode = 'binary';
        this.answerNode = null;
        this.answerLength = 0;
        this.answerRowX0 = 0;
        this.answerRowX1 = 0;
        this.rebuildSequence = null;
        this.rebuildSubtreeRoot = null;
        this.rebuildHiddenIds.clear();
        this.renderQueued = false;
        this.queuedRenderDuration = 0;
        this.rotationFlashIds.clear();
        this.trieRenderQueued = false;
    }
}
