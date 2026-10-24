import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
import { UndirectedGraphNode } from '../node/GraphNode/UndirectedGraphNode';
import { DijkstraNode } from '../node/GraphNode/impl/DijkstraNode';
import { FloydNode } from '../node/GraphNode/impl/FloydNode';
import { KruskalNode } from '../node/GraphNode/impl/KruskalNode';
import { PrimNode } from '../node/GraphNode/impl/PrimNode';

// 图算法节点联合类型（全部继承 Directed/UndirectedGraphNode）
// 各子类的染色字段不完全相同（floyd无edgeColor、kruskal/prim无nodeColor），按渲染视图声明为可选
interface GraphColorView {
    edgeColor?: Map<number, number>[];
    nodeColor?: number[];
}
type GraphNodeInstance = (DijkstraNode | FloydNode | KruskalNode | PrimNode) & GraphColorView;

/************************************************** */
// 颜色常量（与各算法节点的颜色枚举对齐）
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
        // 有向边箭头：每种边颜色一个 marker，保证箭头和边同步变色
        const defs = this.svg.select('defs');
        if (defs.empty()) {
            this.svg.append('defs');
        }
        const markers = [
            { id: 'g-arrow-none', fill: EDGE_NONE },
            { id: 'g-arrow-green', fill: EDGE_GREEN },
            { id: 'g-arrow-blue', fill: EDGE_BLUE },
        ];
        markers.forEach(marker => {
            if (!this.svg.select(`#${marker.id}`).empty()) return;
            this.svg.select('defs').append('marker')
                .attr('id', marker.id)
                .attr('viewBox', '0 0 10 10')
                .attr('refX', 9)
                .attr('refY', 5)
                .attr('markerWidth', 7)
                .attr('markerHeight', 7)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,0L10,5L0,10Z')
                .attr('fill', marker.fill);
        });
    }

    /**
     * 根据边颜色选择对应箭头 marker，保证箭头与边同步变色
     */
    private markerFor(color: string): string {
        if (color === EDGE_GREEN) return 'url(#g-arrow-green)';
        if (color === EDGE_BLUE) return 'url(#g-arrow-blue)';
        return 'url(#g-arrow-none)';
    }

    /**
     * 是否最短路树类算法（dijkstra 的边绿色编码为 2，与 prim/kruskal 不同）
     */
    private get isDijkstra(): boolean {
        return this.ds instanceof DijkstraNode;
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
        return node instanceof DijkstraNode || node instanceof FloydNode ||
            node instanceof KruskalNode || node instanceof PrimNode;
    }

    /************************************************** */
    // 原子操作分发
    onOp(node: object, method: string, args: unknown[]): void {
        if (method === '_create') {
            if (this.isGraphNode(node)) {
                this.ds = node;
            }
            this.enqueueRender();
            return;
        }
        if (!this.ds) return;

        switch (method) {
            case '_set_node_color': {
                const index = args[0] as number;
                const color = this.ds.nodeColor?.[index];
                this.animations.enqueue(() => this.animateNode(index, color));
                break;
            }
            case '_set_edge_color': {
                const u = args[0] as number;
                const v = args[1] as number;
                const color = this.ds.edgeColor?.[u]?.get(v);
                this.animations.enqueue(() => this.animateEdge(u, v, color));
                break;
            }
            case '_set_dis':
                this.animations.enqueue(async () => {
                    this.updateDis();
                    await this.delay(30);
                });
                break;
            case '_clear':
                this.enqueueRender();
                break;
            default:
                break;
        }
    }

    /**
     * 将图重绘加入动画队列。
     */
    private enqueueRender(): void {
        this.animations.enqueue(async () => {
            this.render();
            await this.delay(0);
        });
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

        this.pos = nodes.map(node => ({ x: node.x, y: node.y }));
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
        const edgeKeys = new Set(edges.map(edge => edge.key));
        const weightCounts = new Map<number, number>();
        for (const edge of edges) {
            weightCounts.set(edge.w, (weightCounts.get(edge.w) ?? 0) + 1);
        }
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

        const directed = !(ds instanceof UndirectedGraphNode);

        edges.forEach((e, edgeIndex) => {
            const p1 = this.pos[e.u], p2 = this.pos[e.v];
            if (!p1 || !p2) return;
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const nx = -uy;
            const ny = ux;
            // 双向边错开绘制，避免两条反向边完全重合
            const reciprocal = directed && edgeKeys.has(`${e.v},${e.u}`);
            const lineOffset = reciprocal ? 9 : 0;
            const trim = Math.sqrt(Math.max(0, R * R - lineOffset * lineOffset));
            const x1 = p1.x + ux * trim + nx * lineOffset;
            const y1 = p1.y + uy * trim + ny * lineOffset;
            const x2 = p2.x - ux * trim + nx * lineOffset;
            const y2 = p2.y - uy * trim + ny * lineOffset;

            const color = this.edgeStroke(ds.edgeColor?.[e.u]?.get(e.v));
            const g = this.mainGroup.append('g').attr('class', 'graph-edge');
            g.append('line')
                .attr('class', 'edge-line')
                .attr('data-edge', e.key)
                .attr('x1', x1).attr('y1', y1)
                .attr('x2', x2).attr('y2', y2)
                .attr('stroke', color)
                .attr('stroke-width', 2.5)
                .attr('marker-end', directed ? this.markerFor(color) : null);

            // 权值不重复时优先放在边线上；重复权值则向边线两侧避让
            const text = String(e.w);
            const labelW = Math.max(22, text.length * 10 + 12);
            const labelH = 26;
            const baseT = reciprocal ? (e.u < e.v ? 0.4 : 0.6) : 0.5;
            const duplicate = (weightCounts.get(e.w) ?? 0) > 1;
            const candidates: { t: number; offset: number }[] = [];
            if (duplicate) {
                candidates.push(
                    { t: baseT, offset: 18 },
                    { t: baseT, offset: -18 },
                    { t: baseT, offset: 28 },
                    { t: baseT, offset: -28 },
                    { t: 0.4, offset: 16 },
                    { t: 0.6, offset: -16 },
                    { t: 0.4, offset: -16 },
                    { t: 0.6, offset: 16 },
                    { t: baseT, offset: 0 },
                );
            } else {
                for (const t of [baseT, 0.42, 0.58, 0.34, 0.66, 0.28, 0.72]) {
                    candidates.push({ t, offset: 0 });
                }
                candidates.push(
                    { t: baseT, offset: 18 },
                    { t: baseT, offset: -18 },
                    { t: baseT, offset: 28 },
                    { t: baseT, offset: -28 },
                );
            }

            let labelX = p1.x + dx * baseT + nx * lineOffset;
            let labelY = p1.y + dy * baseT + ny * lineOffset;
            let found = false;
            for (const candidate of candidates) {
                const lx = p1.x + dx * candidate.t + nx * (lineOffset + candidate.offset);
                const ly = p1.y + dy * candidate.t + ny * (lineOffset + candidate.offset);
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
                const fallbackOffset = lineOffset + ((edgeIndex % 3) - 1) * 24;
                labelX = p1.x + dx * baseT + nx * fallbackOffset;
                labelY = p1.y + dy * baseT + ny * fallbackOffset;
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
            if (ds instanceof DijkstraNode) {
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
        if (!(this.ds instanceof DijkstraNode)) return;
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
    private async animateNode(i: number, color: number | undefined): Promise<void> {
        const g = this.mainGroup.select(`.graph-node[data-node="${i}"]`);
        if (g.empty()) {
            this.renderNodes();
            this.fitViewBox();
            return;
        }
        await g.select('circle')
            .transition()
            .duration(this.duration(110))
            .attr('fill', this.nodeFill(color))
            .end()
            .catch(() => undefined);
    }

    /**
     * 边颜色过渡
     */
    private async animateEdge(u: number, v: number, colorValue: number | undefined): Promise<void> {
        const ds = this.ds;
        if (!ds) return;
        const directed = !(ds instanceof UndirectedGraphNode);
        const key = directed
            ? `${u},${v}`
            : `${Math.min(u, v)},${Math.max(u, v)}`;
        const color = this.edgeStroke(colorValue);
        const line = this.mainGroup.select(`line[data-edge="${key}"]`);
        if (!line.empty()) {
            // 箭头 marker 立即切换到新颜色，边本身保留颜色过渡
            line.attr('marker-end', directed ? this.markerFor(color) : null);
            await line.transition()
                .duration(this.duration(110))
                .attr('stroke', color)
                .end()
                .catch(() => undefined);
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
