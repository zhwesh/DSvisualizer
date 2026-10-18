import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
import { UndirectedGraphNode } from '../node/GraphNode/UndirectedGraphNode';
import { dijkstraNode } from '../node/GraphNode/impl/DijkstraNode';
import { floydNode } from '../node/GraphNode/impl/FloydNode';
import { kruskalNode } from '../node/GraphNode/impl/KruskalNode';
import { primNode } from '../node/GraphNode/impl/PrimNode';

// 图算法节点联合类型（全部继承 Directed/UndirectedGraphNode）
// 各子类的染色字段不完全相同（floyd无edgeColor、kruskal/prim无nodeColor），按渲染视图声明为可选
interface GraphColorView {
    edgeColor?: Map<number, number>[];
    nodeColor?: number[];
}
type GraphNodeInstance = (dijkstraNode | floydNode | kruskalNode | primNode) & GraphColorView;

// ---------- 颜色常量（与各算法节点的颜色枚举对齐） ----------
const COLOR_NONE = '#ffffff';    // 未处理
const COLOR_GREEN = '#2ecc71';   // 当前处理/已选中
const COLOR_BLUE = '#3498db';    // 候选/入队
const COLOR_TEXT = '#2c3e50';
const EDGE_NONE = '#c8c8c8';
const EDGE_GREEN = '#27ae60';
const EDGE_BLUE = '#3498db';

/**
 * 图可视化器
 * 处理有向图/无向图及其算法（dijkstra/floyd/prim/kruskal）的渲染和动画：
 * - 节点环形布局（稳定、居中），圆 + 编号 + （dijkstra 额外显示最短距离）
 * - 边带权值标签，有向边带箭头
 * - 原子操作 _set_node_color / _set_edge_color / _set_dis / _clear 触发过渡动画
 */
export class GraphVisualizer extends BaseVisualizer {
    // 当前绑定的图节点实例（dijkstraNode/floydNode/kruskalNode/primNode）
    private ds: GraphNodeInstance | null = null;
    // 节点位置（环形布局）
    private pos: { x: number; y: number }[] = [];

    private static readonly CANVAS_W = 1200;
    private static readonly CANVAS_H = 600;
    private static readonly NODE_R = 26;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
        super(svg);
        // 有向边箭头
        const defs = this.svg.select('defs');
        if (defs.empty()) {
            this.svg.append('defs');
        }
        const arrow = this.svg.select<SVGMarkerElement>('#g-arrow');
        if (arrow.empty()) {
            this.svg.select('defs').append('marker')
                .attr('id', 'g-arrow')
                .attr('viewBox', '0 0 10 10')
                .attr('refX', 9)
                .attr('refY', 5)
                .attr('markerWidth', 7)
                .attr('markerHeight', 7)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,0L10,5L0,10Z')
                .attr('fill', '#666');
        }
    }

    /**
     * 是否最短路树类算法（dijkstra 的边绿色编码为 2，与 prim/kruskal 不同）
     */
    private get isDijkstra(): boolean {
        return this.ds instanceof dijkstraNode;
    }

    /**
     * 边颜色映射
     */
    private edgeStroke(color: number | undefined): string {
        const c = color ?? 0;
        if (c === 0) return EDGE_NONE;
        if (c === 1) return EDGE_GREEN;
        if (c === 2) return this.isDijkstra ? EDGE_GREEN : EDGE_BLUE;
        return EDGE_NONE;
    }

    /**
     * 节点颜色映射（所有图算法一致：0白 1绿 2蓝）
     */
    private nodeFill(color: number | undefined): string {
        const c = color ?? 0;
        if (c === 1) return COLOR_GREEN;
        if (c === 2) return COLOR_BLUE;
        return COLOR_NONE;
    }

    private isGraphNode(node: object): node is GraphNodeInstance {
        return node instanceof dijkstraNode || node instanceof floydNode ||
            node instanceof kruskalNode || node instanceof primNode;
    }

    // ---------- 原子操作分发 ----------
    onOp(node: object, method: string, args: unknown[]): void {
        if (method === '_create') {
            if (this.isGraphNode(node)) {
                this.ds = node;
            }
            this.render();
            return;
        }
        if (!this.ds) return;
        switch (method) {
            case '_set_node_color':
                this.animateNode(args[0] as number);
                break;
            case '_set_edge_color':
                this.animateEdge(args[0] as number, args[1] as number);
                break;
            case '_set_dis':
                this.updateDis();
                break;
            case '_clear':
            case '_sort_edges':
                this.render();
                break;
            default:
                break;
        }
    }

    /**
     * 收集所有边（无向图去重，有向图按方向）
     */
    private collectEdges(): { u: number; v: number; w: number; key: string }[] {
        const result: { u: number; v: number; w: number; key: string }[] = [];
        if (!this.ds) return result;
        const directed = !(this.ds instanceof UndirectedGraphNode);
        const seen = new Set<string>();
        for (let u = 0; u < this.ds.nodeCnt; ++u) {
            const list = this.ds.to[u] || [];
            for (const item of list) {
                const v = item[0], w = item[1];
                if (v === null || v === undefined) continue;
                const key = directed ? `${u},${v}` : `${Math.min(u, v)},${Math.max(u, v)}`;
                if (seen.has(key)) continue;
                seen.add(key);
                result.push({ u, v, w: w ?? 0, key });
            }
        }
        return result;
    }

    /**
     * 计算节点布局：以环形位置为初始值做力导向布局，减少交叉和节点重叠
     */
    private layout(): void {
        const n = this.ds ? this.ds.nodeCnt : 0;
        this.pos = [];
        if (n === 0) return;

        const cx = GraphVisualizer.CANVAS_W / 2;
        const cy = GraphVisualizer.CANVAS_H / 2;
        const initialR = Math.min(260, 80 + n * 34);
        const nodes: any[] = Array.from({ length: n }, (_, i) => {
            const ang = (2 * Math.PI * i) / n - Math.PI / 2;
            return {
                id: i,
                x: cx + initialR * Math.cos(ang),
                y: cy + initialR * Math.sin(ang),
            };
        });
        const links: any[] = this.collectEdges().map(edge => ({
            source: edge.u,
            target: edge.v,
        }));

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150).strength(0.9))
            .force('charge', d3.forceManyBody().strength(-900))
            .force('center', d3.forceCenter(cx, cy))
            .force('collision', d3.forceCollide().radius(GraphVisualizer.NODE_R + 26))
            .stop();
        for (let i = 0; i < 300; ++i) {
            simulation.tick();
        }

        // 归一化到画布中央，节点极多时整体缩小
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y);
        });
        const contentW = Math.max(1, maxX - minX);
        const contentH = Math.max(1, maxY - minY);
        const scale = Math.min(
            1,
            (GraphVisualizer.CANVAS_W - 180) / contentW,
            (GraphVisualizer.CANVAS_H - 140) / contentH,
        );
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        this.pos = nodes.map(node => ({
            x: cx + (node.x - midX) * scale,
            y: cy + (node.y - midY) * scale,
        }));
    }

    /**
     * 全量渲染（结构变化时）
     */
    private render(): void {
        if (!this.ds) {
            this.mainGroup.selectAll('*').remove();
            return;
        }
        this.layout();

        // 1. 边
        this.renderEdges();
        // 2. 节点
        this.renderNodes();
        // 3. 自适应 viewBox
        this.fitViewBox();
    }

    /**
     * 渲染边（带权值标签与方向箭头）
     */
    private renderEdges(): void {
        this.mainGroup.selectAll('.graph-edge').remove();
        const ds = this.ds;
        if (!ds) return;
        const edges = this.collectEdges();
        const R = GraphVisualizer.NODE_R;

        // 已放置的权值标签与节点区域，用于贪心避让，避免多个数字叠在中心
        const placed: { x: number; y: number; w: number; h: number }[] = [];
        const nodeBoxes = this.pos.map(p => ({
            x: p.x - R - 8,
            y: p.y - R - 8,
            w: 2 * (R + 8),
            h: 2 * (R + 8),
        }));
        const overlaps = (
            a: { x: number; y: number; w: number; h: number },
            b: { x: number; y: number; w: number; h: number },
        ): boolean => !(
            a.x + a.w / 2 < b.x - b.w / 2 ||
            a.x - a.w / 2 > b.x + b.w / 2 ||
            a.y + a.h / 2 < b.y - b.h / 2 ||
            a.y - a.h / 2 > b.y + b.h / 2
        );

        edges.forEach((e, edgeIndex) => {
            const p1 = this.pos[e.u], p2 = this.pos[e.v];
            if (!p1 || !p2) return;
            // 缩短到节点圆边缘
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy) || 1;
            const x1 = p1.x + (dx / len) * R;
            const y1 = p1.y + (dy / len) * R;
            const x2 = p2.x - (dx / len) * R;
            const y2 = p2.y - (dy / len) * R;

            const directed = !(ds instanceof UndirectedGraphNode);
            const color = this.edgeStroke(ds.edgeColor?.[e.u]?.get(e.v));
            const g = this.mainGroup.append('g').attr('class', 'graph-edge');
            g.append('line')
                .attr('class', 'edge-line')
                .attr('data-edge', e.key)
                .attr('x1', x1).attr('y1', y1)
                .attr('x2', x2).attr('y2', y2)
                .attr('stroke', color)
                .attr('stroke-width', 2.5)
                .attr('marker-end', directed ? 'url(#g-arrow)' : null);

            // 沿边尝试多个位置：中点、偏向起点/终点、上下左右偏移，避开节点和已有标签
            const nx = -dy / len;
            const ny = dx / len;
            const text = String(e.w);
            const labelW = Math.max(22, text.length * 10 + 12);
            const labelH = 26;
            const candidates = [
                { t: 0.5, offset: 0 },
                { t: 0.5, offset: 20 },
                { t: 0.5, offset: -20 },
                { t: 0.4, offset: 14 },
                { t: 0.6, offset: -14 },
                { t: 0.34, offset: -22 },
                { t: 0.66, offset: 22 },
                { t: 0.5, offset: 36 },
                { t: 0.5, offset: -36 },
            ];
            let labelX = (p1.x + p2.x) / 2 + 8;
            let labelY = (p1.y + p2.y) / 2 - 8;
            let found = false;
            for (const candidate of candidates) {
                const lx = p1.x + dx * candidate.t + nx * candidate.offset;
                const ly = p1.y + dy * candidate.t + ny * candidate.offset;
                const box = { x: lx, y: ly, w: labelW, h: labelH };
                if (nodeBoxes.some(nodeBox => overlaps(box, nodeBox))) continue;
                if (placed.some(other => overlaps(box, other))) continue;
                labelX = lx;
                labelY = ly;
                placed.push(box);
                found = true;
                break;
            }
            if (!found) {
                // 极端情况下使用带固定偏移的中点，至少不会完全重叠
                const fallbackOffset = ((edgeIndex % 3) - 1) * 24;
                labelX = (p1.x + p2.x) / 2 + nx * fallbackOffset;
                labelY = (p1.y + p2.y) / 2 + ny * fallbackOffset;
                placed.push({ x: labelX, y: labelY, w: labelW, h: labelH });
            }

            g.append('text')
                .attr('class', 'edge-weight')
                .attr('x', labelX).attr('y', labelY)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('data-edge', e.key)
                .style('font-size', '15px')
                .style('font-family', '"JetBrains Mono", SimHei, monospace')
                .style('font-weight', 'bold')
                .style('fill', '#4a5568')
                .style('paint-order', 'stroke')
                .style('stroke', '#fafafa')
                .style('stroke-width', '4px')
                .style('stroke-linejoin', 'round')
                .text(text);
        });
    }

    /**
     * 渲染节点（圆 + 编号 + dijkstra 距离标签）
     */
    private renderNodes(): void {
        this.mainGroup.selectAll('.graph-node').remove();
        const ds = this.ds;
        if (!ds) return;
        const n = ds.nodeCnt;
        for (let i = 0; i < n; ++i) {
            const p = this.pos[i];
            const g = this.mainGroup.append('g')
                .attr('class', 'graph-node')
                .attr('data-node', i)
                .attr('transform', `translate(${p.x}, ${p.y})`);
            g.append('circle')
                .attr('class', 'node-circle')
                .attr('r', GraphVisualizer.NODE_R)
                .attr('fill', this.nodeFill(ds.nodeColor?.[i]))
                .attr('stroke', '#555')
                .attr('stroke-width', 2);
            g.append('text')
                .attr('class', 'node-id')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .style('font-size', '16px')
                .style('font-family', '"JetBrains Mono", SimHei, monospace')
                .style('font-weight', 'bold')
                .style('fill', COLOR_TEXT)
                .text(String(i));
            // dijkstra：节点下方显示最短距离
            if (ds instanceof dijkstraNode) {
                g.append('text')
                    .attr('class', 'node-dis')
                    .attr('text-anchor', 'middle')
                    .attr('y', GraphVisualizer.NODE_R + 15)
                    .style('font-size', '13px')
                    .style('font-family', '"JetBrains Mono", SimHei, monospace')
                    .style('fill', '#7f8c8d')
                    .text(ds.dis[i] === Infinity || ds.dis[i] === undefined
                        ? '∞' : String(ds.dis[i]));
            }
        }
    }

    /**
     * 更新 dijkstra 距离标签
     */
    private updateDis(): void {
        if (!(this.ds instanceof dijkstraNode)) return;
        for (let i = 0; i < this.ds.nodeCnt; ++i) {
            const g = this.mainGroup.select(`.graph-node[data-node="${i}"]`);
            if (g.empty()) continue;
            g.select('.node-dis')
                .text(this.ds.dis[i] === Infinity || this.ds.dis[i] === undefined
                    ? '∞' : String(this.ds.dis[i]));
        }
    }

    /**
     * 节点颜色过渡
     */
    private animateNode(i: number): void {
        const ds = this.ds;
        if (!ds) return;
        this.renderNodes();   // 结构简单，直接重绘保持一致性
        this.fitViewBox();
        const g = this.mainGroup.select(`.graph-node[data-node="${i}"]`);
        if (g.empty()) return;
        g.select('circle')
            .transition()
            .duration(180)
            .attr('fill', this.nodeFill(ds.nodeColor?.[i]));
    }

    /**
     * 边颜色过渡
     */
    private animateEdge(u: number, v: number): void {
        const ds = this.ds;
        if (!ds) return;
        const key = ds instanceof UndirectedGraphNode
            ? `${Math.min(u, v)},${Math.max(u, v)}`
            : `${u},${v}`;
        const line = this.mainGroup.select(`line[data-edge="${key}"]`);
        if (!line.empty()) {
            line.transition()
                .duration(180)
                .attr('stroke', this.edgeStroke(ds.edgeColor?.[u]?.get(v)));
        }
    }

    /**
     * 自适应 viewBox：图整体居中填满画布
     */
    private fitViewBox(): void {
        if (this.pos.length === 0) {
            this.svg.attr('viewBox', '0 0 1200 600');
            return;
        }
        const R = GraphVisualizer.NODE_R;
        const PAD = 70;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        this.pos.forEach(p => {
            minX = Math.min(minX, p.x - R);
            maxX = Math.max(maxX, p.x + R);
            minY = Math.min(minY, p.y - R);
            maxY = Math.max(maxY, p.y + R);
        });
        // dijkstra 距离标签在下方
        if (this.isDijkstra) maxY += 18;
        const contentW = (maxX - minX) + 2 * PAD;
        const contentH = (maxY - minY) + 2 * PAD;
        const w = Math.max(contentW, 400);
        const h = Math.max(contentH, 240);
        let x0 = minX - PAD;
        if (w > contentW) x0 = minX - PAD - (w - contentW) / 2;
        this.svg.attr('viewBox', `${x0} ${minY - PAD} ${w} ${h}`);
    }

    clear(): void {
        super.clear();
        this.ds = null;
        this.pos = [];
    }
}
