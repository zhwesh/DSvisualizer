import { DirectedGraphNode } from "../DirectedGraphNode";

// 节点颜色
export const dijkstra_node_NONE: number = 0;    // 还未入堆的节点
export const dijkstra_node_GREEN: number = 1;   // 当前正在处理的节点
export const dijkstra_node_BLUE: number = 2;    // 已在堆中或已出堆的节点

// 边的颜色
export const dijkstra_edge_NONE: number = 0;    // 非候选/非最短路树上的边
export const dijkstra_edge_GREEN: number = 2;   // 最短路树上的边

export class dijkstraNode extends DirectedGraphNode {
    /**
     * 设置最短距离
     * 
     * 动画效果：dis[node]设为dis
     * 
     * @param node 节点
     * @param dis 距离
     */
    public _set_dis(node: number, dis: number) {
        this.dis[node] = dis;
    }

    /**
     * 重置图的状态
     * 
     * 动画效果：dis数组元素全设为无穷大、图上所有颜色清空
     */
    public _clear() {
        this.dis.fill(Infinity);
        this.nodeColor.fill(dijkstra_node_NONE);
        this.edgeColor = Array.from(
            { length: this.nodeCnt },
            () => new Map<number, number>()
        );
        for (let u = 0; u < this.nodeCnt; ++u) {
            for (let [v] of this.to[u]) {
                this.edgeColor[u].set(v!, dijkstra_edge_NONE);
            }
        }
    }

    /**
     * 设置节点颜色
     * 
     * 动画效果：节点node颜色变为color
     * 
     * @param node 节点
     * @param color 颜色
     */
    public _set_node_color(node: number, color: number) {
        this.nodeColor[node] = color;
    }

    /**
     * 设置边的颜色
     * 
     * 动画效果：有向边(u,v)颜色变为color
     * 
     * @param u 边的起点
     * @param v 边的终点
     * @param color 要设置的颜色
     */
    public _set_edge_color(u: number, v: number, color: number): void {
        this.edgeColor[u].set(v, color);
    }

    /************************************************** */

    private static weightAssert(edges: number[][]) {
        for (const [, , w] of edges) {
            if (w < 0) {
                throw new Error("边权必须大于等于0");
            }
        }
    }

    public nodeColor: number[];
    public edgeColor: Map<number, number>[];
    public dis: number[];

    constructor(edges: number[][]) {
        super(edges);
        dijkstraNode.weightAssert(edges);
        this.nodeColor = new Array(this.nodeCnt).fill(dijkstra_node_NONE);
        this.edgeColor = Array.from(
            { length: this.nodeCnt },
            () => new Map<number, number>()
        );
        for (let u = 0; u < this.nodeCnt; ++u) {
            for (let [v] of this.to[u]) {
                this.edgeColor[u].set(v!, dijkstra_edge_NONE);
            }
        }
        this.dis = new Array(this.nodeCnt).fill(Infinity);
    }
};