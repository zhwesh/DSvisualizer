import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
import { UnionFindSetNode } from '../node/ArrayNode/impl/UnionFindSetNode';

interface UfPoint {
    x: number;
    y: number;
    depth: number;
}

interface UfEdge {
    child: number;
    parent: number;
}

type UfRow = 'father' | 'sz';

type SvgGroup = d3.Selection<SVGGElement, unknown, null, undefined>;

const COLOR_NODE_FILL = '#ffffff';
const COLOR_ROOT_FILL = '#e8f1ff';
const COLOR_NODE_STROKE = '#667085';
const COLOR_EDGE = '#98a2b3';
const COLOR_TEXT = '#2d3748';
const COLOR_MUTED = '#667085';
const COLOR_CELL_FILL = '#ffffff';
const COLOR_CELL_STROKE = '#98a2b3';
const COLOR_VISIT_RING = '#2b6cb0';

export class UnionFindVisualizer extends BaseVisualizer {
    private node: UnionFindSetNode | null = null;
    private edgeLayer!: SvgGroup;
    private nodeLayer!: SvgGroup;
    private arrayLayer!: SvgGroup;

    private static readonly NODE_RADIUS = 18;
    private static readonly H_GAP = 58;
    private static readonly V_GAP = 70;
    private static readonly FOREST_TOP = 200;
    private static readonly CANVAS_W = 1200;
    private static readonly CELL_WIDTH = 46;
    private static readonly CELL_HEIGHT = 38;
    private static readonly MIN_VIEW_W = 560;
    private static readonly MIN_VIEW_H = 400;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
        super(svg);
        this.edgeLayer = this.mainGroup.append('g').attr('class', 'uf-edge-layer');
        this.nodeLayer = this.mainGroup.append('g').attr('class', 'uf-node-layer');
        this.arrayLayer = this.mainGroup.append('g').attr('class', 'uf-array-layer');
        this.ensureArrowMarker();
    }

    onOp(node: object, method: string, _args: unknown[]): void {
        if (!(node instanceof UnionFindSetNode)) {
            return;
        }

        switch (method) {
            case '_create':
                this.node = node;
                this.enqueueRender(0);
                break;
            case '_set_value':
            case '_set_size':
                this.enqueueRender(0);
                break;
            case '_set_visited':
            case '_clear_visited':
                this.enqueueRender(0);
                break;
            default:
                break;
        }
    }

    /**
     * 将一次重绘加入动画队列。
     * @param duration 重绘后的等待时长
     */
    private enqueueRender(duration: number): void {
        this.animations.enqueue(async () => {
            this.render();
            await this.delay(duration);
        });
    }

    private ensureArrowMarker(): void {
        if (!this.mainGroup.select('#uf-edge-arrow').empty()) {
            return;
        }
        this.mainGroup.append('defs').append('marker')
            .attr('id', 'uf-edge-arrow')
            .attr('viewBox', '0 0 10 10')
            .attr('refX', 9)
            .attr('refY', 5)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M 0 0 L 10 5 L 0 10 z')
            .attr('fill', COLOR_EDGE);
    }

    private render(): void {
        const node = this.node;
        if (!node) {
            this.edgeLayer.selectAll('*').remove();
            this.nodeLayer.selectAll('*').remove();
            this.arrayLayer.selectAll('*').remove();
            this.svg.attr('viewBox', '0 0 1200 600');
            return;
        }

        const n = node.data.length;
        const father = node.data.map((value, i) =>
            typeof value === 'number' && value >= 0 && value < n ? value : i,
        );
        const positions = this.layoutForest(father);
        const edges = this.collectEdges(father, positions);

        this.renderEdges(edges, positions);
        this.renderNodes(positions, father, node.sz, node.visited, n);

        const maxDepth = positions.size === 0
            ? 0
            : Math.max(...Array.from(positions.values()).map(p => p.depth));
        const fatherY = Math.max(330, UnionFindVisualizer.FOREST_TOP + maxDepth * UnionFindVisualizer.V_GAP + 100);
        const sizeY = fatherY + UnionFindVisualizer.CELL_HEIGHT + 30;
        const startX = (UnionFindVisualizer.CANVAS_W - n * UnionFindVisualizer.CELL_WIDTH) / 2;

        this.renderArrayRow('father', father, fatherY, startX);
        this.renderArrayRow('sz', node.sz, sizeY, startX);
        this.fitViewBox(positions, startX, n, sizeY);
    }

    private layoutForest(father: number[]): Map<number, UfPoint> {
        const n = father.length;
        const children: number[][] = Array.from({ length: n }, () => []);
        const roots: number[] = [];

        for (let i = 0; i < n; ++i) {
            if (father[i] === i) {
                roots.push(i);
            } else {
                children[father[i]].push(i);
            }
        }

        const positions = new Map<number, UfPoint>();
        const visited = new Set<number>();
        let cursor = 0;

        const place = (index: number, depth: number): number => {
            if (visited.has(index)) {
                return cursor;
            }
            visited.add(index);

            const kids = children[index].filter(child => !visited.has(child));
            let x: number;
            if (kids.length === 0) {
                x = cursor;
                cursor += UnionFindVisualizer.H_GAP;
            } else {
                const childXs = kids.map(child => place(child, depth + 1));
                x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
            }

            positions.set(index, {
                x,
                y: UnionFindVisualizer.FOREST_TOP + depth * UnionFindVisualizer.V_GAP,
                depth,
            });
            return x;
        };

        roots.forEach(root => {
            place(root, 0);
            cursor += UnionFindVisualizer.H_GAP * 0.6;
        });
        for (let i = 0; i < n; ++i) {
            if (!visited.has(i)) {
                place(i, 0);
                cursor += UnionFindVisualizer.H_GAP * 0.6;
            }
        }

        if (positions.size > 0) {
            const xs = Array.from(positions.values()).map(p => p.x);
            const offset = UnionFindVisualizer.CANVAS_W / 2 - (Math.min(...xs) + Math.max(...xs)) / 2;
            positions.forEach(point => {
                point.x += offset;
            });
        }
        return positions;
    }

    private collectEdges(father: number[], positions: Map<number, UfPoint>): UfEdge[] {
        const edges: UfEdge[] = [];
        for (let i = 0; i < father.length; ++i) {
            if (father[i] === i) continue;
            if (!positions.has(i) || !positions.has(father[i])) continue;
            edges.push({ child: i, parent: father[i] });
        }
        return edges;
    }

    private renderEdges(edges: UfEdge[], positions: Map<number, UfPoint>): void {
        const lines = this.edgeLayer.selectAll<SVGLineElement, UfEdge>('line.uf-edge')
            .data(edges, edge => edge.child);

        const enter = lines.enter()
            .append('line')
            .attr('class', 'uf-edge')
            .attr('stroke', COLOR_EDGE)
            .attr('stroke-width', 1.6)
            .attr('marker-end', 'url(#uf-edge-arrow)');

        const merged = enter.merge(lines);
        merged.transition('uf-edge-move').duration(this.duration(220))
            .attr('x1', edge => this.edgeEnd(edge.child, edge.parent, positions).x1)
            .attr('y1', edge => this.edgeEnd(edge.child, edge.parent, positions).y1)
            .attr('x2', edge => this.edgeEnd(edge.child, edge.parent, positions).x2)
            .attr('y2', edge => this.edgeEnd(edge.child, edge.parent, positions).y2);

        lines.exit().remove();
    }

    private edgeEnd(parentIndex: number, childIndex: number, positions: Map<number, UfPoint>): {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    } {
        const parent = positions.get(parentIndex)!;
        const child = positions.get(childIndex)!;
        const dx = child.x - parent.x;
        const dy = child.y - parent.y;
        const length = Math.hypot(dx, dy) || 1;
        const ux = dx / length;
        const uy = dy / length;
        const radius = UnionFindVisualizer.NODE_RADIUS;
        return {
            x1: parent.x + ux * radius,
            y1: parent.y + uy * radius,
            x2: child.x - ux * (radius + 3),
            y2: child.y - uy * (radius + 3),
        };
    }

    private renderNodes(
        positions: Map<number, UfPoint>,
        father: number[],
        size: (number | null)[],
        visited: boolean[],
        n: number,
    ): void {
        const indexes = Array.from({ length: n }, (_, i) => i);
        const groups = this.nodeLayer.selectAll<SVGGElement, number>('g.uf-node')
            .data(indexes, index => index);

        const enter = groups.enter()
            .append('g')
            .attr('class', 'uf-node')
            .attr('transform', index => {
                const point = positions.get(index);
                return point ? `translate(${point.x}, ${point.y})` : '';
            });

        enter.append('circle')
            .attr('class', 'uf-node-visit-ring')
            .attr('r', UnionFindVisualizer.NODE_RADIUS + 5)
            .attr('fill', 'none')
            .attr('stroke', COLOR_VISIT_RING)
            .attr('stroke-width', 3)
            .style('opacity', 0)
            .style('pointer-events', 'none');

        enter.append('circle')
            .attr('class', 'uf-node-main')
            .attr('r', UnionFindVisualizer.NODE_RADIUS)
            .attr('stroke-width', 1.8);

        enter.append('text')
            .attr('class', 'uf-node-index')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('fill', COLOR_TEXT);

        enter.append('text')
            .attr('class', 'uf-node-size')
            .attr('text-anchor', 'middle')
            .attr('y', -(UnionFindVisualizer.NODE_RADIUS + 7))
            .style('font-size', '10px')
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('fill', COLOR_MUTED);

        const merged = enter.merge(groups);
        merged.transition('uf-node-move').duration(this.duration(220))
            .attr('transform', index => {
                const point = positions.get(index);
                return point ? `translate(${point.x}, ${point.y})` : '';
            });

        merged.select('.uf-node-main')
            .attr('fill', index => father[index] === index ? COLOR_ROOT_FILL : COLOR_NODE_FILL)
            .attr('stroke', COLOR_NODE_STROKE)
            .attr('stroke-width', 1.8);

        merged.select('.uf-node-visit-ring')
            .style('opacity', index => visited[index] ? 1 : 0);

        merged.select('.uf-node-index')
            .text(index => String(index));

        merged.select('.uf-node-size')
            .text(index => father[index] === index ? 'size=' + size[index] : '');

        groups.exit().remove();
    }

    private renderArrayRow(
        row: UfRow,
        values: (number | null)[],
        y: number,
        startX: number,
    ): void {
        const n = values.length;
        const indexes = Array.from({ length: n }, (_, i) => i);
        const cells = this.arrayLayer.selectAll<SVGGElement, number>(`g.uf-cell.row-${row}`)
            .data(indexes, index => index);

        const enter = cells.enter()
            .append('g')
            .attr('class', `uf-cell row-${row}`)
            .attr('transform', index =>
                `translate(${startX + index * UnionFindVisualizer.CELL_WIDTH}, ${y})`,
            );

        enter.append('rect')
            .attr('width', UnionFindVisualizer.CELL_WIDTH)
            .attr('height', UnionFindVisualizer.CELL_HEIGHT)
            .attr('stroke', COLOR_CELL_STROKE)
            .attr('stroke-width', 1.2)
            .attr('rx', 3);

        enter.append('text')
            .attr('class', 'uf-cell-value')
            .attr('x', UnionFindVisualizer.CELL_WIDTH / 2)
            .attr('y', UnionFindVisualizer.CELL_HEIGHT / 2 + 5)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('fill', COLOR_TEXT);

        const merged = enter.merge(cells);
        merged.transition('uf-cell-move').duration(this.duration(200))
            .attr('transform', index =>
                `translate(${startX + index * UnionFindVisualizer.CELL_WIDTH}, ${y})`,
            );

        merged.select('rect')
            .attr('fill', COLOR_CELL_FILL);

        merged.select('.uf-cell-value')
            .text(index => values[index] === null || values[index] === undefined
                ? ''
                : String(values[index]));

        cells.exit().remove();

        this.arrayLayer.selectAll(`text.uf-row-label.${row}`).remove();
        this.arrayLayer.append('text')
            .attr('class', `uf-row-label ${row}`)
            .attr('x', startX - 16)
            .attr('y', y + UnionFindVisualizer.CELL_HEIGHT / 2 + 5)
            .attr('text-anchor', 'end')
            .style('font-size', '13px')
            .style('font-family', '"JetBrains Mono", SimHei, monospace')
            .style('fill', COLOR_MUTED)
            .text(row);

        this.arrayLayer.selectAll(`text.uf-index-label.row-${row}`).remove();
        indexes.forEach(index => {
            this.arrayLayer.append('text')
                .attr('class', `uf-index-label row-${row}`)
                .attr('x', startX + index * UnionFindVisualizer.CELL_WIDTH + UnionFindVisualizer.CELL_WIDTH / 2)
                .attr('y', y - 7)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('font-family', '"JetBrains Mono", SimHei, monospace')
                .style('fill', '#98a2b3')
                .text(String(index));
        });
    }

    private fitViewBox(
        positions: Map<number, UfPoint>,
        startX: number,
        n: number,
        sizeY: number,
    ): void {
        const radius = UnionFindVisualizer.NODE_RADIUS;
        let minX = startX - 70;
        let maxX = startX + n * UnionFindVisualizer.CELL_WIDTH + 20;
        let minY = UnionFindVisualizer.FOREST_TOP - radius - 30;
        let maxY = sizeY + UnionFindVisualizer.CELL_HEIGHT + 20;

        positions.forEach(point => {
            minX = Math.min(minX, point.x - radius);
            maxX = Math.max(maxX, point.x + radius);
            minY = Math.min(minY, point.y - radius - 16);
            maxY = Math.max(maxY, point.y + radius);
        });

        const pad = 34;
        let x0 = minX - pad;
        let y0 = minY - pad;
        let width = (maxX - minX) + pad * 2;
        let height = (maxY - minY) + pad * 2;

        if (width < UnionFindVisualizer.MIN_VIEW_W) {
            const extra = UnionFindVisualizer.MIN_VIEW_W - width;
            x0 -= extra / 2;
            width = UnionFindVisualizer.MIN_VIEW_W;
        }
        if (height < UnionFindVisualizer.MIN_VIEW_H) {
            const extra = UnionFindVisualizer.MIN_VIEW_H - height;
            y0 -= extra / 2;
            height = UnionFindVisualizer.MIN_VIEW_H;
        }

        this.svg.attr('viewBox', `${x0} ${y0} ${width} ${height}`);
    }

    clear(): void {
        super.clear();
        this.node = null;
        this.edgeLayer = this.mainGroup.append('g').attr('class', 'uf-edge-layer');
        this.nodeLayer = this.mainGroup.append('g').attr('class', 'uf-node-layer');
        this.arrayLayer = this.mainGroup.append('g').attr('class', 'uf-array-layer');
        this.ensureArrowMarker();
    }
}
