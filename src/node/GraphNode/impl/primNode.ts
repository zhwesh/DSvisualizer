import { UndirectedGraphNode } from "../UndirectedGraphNode";

// 边的颜色
export const prim_NONE: number = 0;         // 暂未选中
export const prim_GREEN: number = 1;        // 已选中
export const prim_BLUE: number = 2;         // 已加入优先队列

export class primNode extends UndirectedGraphNode {
    /**
     * 将边集按w排序
     */
    public _sort_edges(): void {
        this.edges.sort((a, b) => (a[2] - b[2]));
    }

    /**
     * 设置边的颜色
     * @param u 边的端点
     * @param v 边的另一个端点
     * @param color 要设置的颜色
     */
    public _set_edge_color(u: number, v: number, color: number): void {
        this.edgeColor[u].set(v, color);
        this.edgeColor[v].set(u, color);
    }

    /************************************************** */

    // 边的颜色
    public edgeColor: Map<number, number>[];
    // 边集
    public edges: number[][];

    constructor(edges: number[][]) {
        super(edges);
        this.edges = edges;
        this.edgeColor = Array.from(
            { length: this.nodeCnt },
            () => new Map<number, number>()
        );
        for (let u = 0; u < this.nodeCnt; ++u) {
            for (let [v] of this.to[u]) {
                this.edgeColor[u].set(v!, prim_NONE);
                this.edgeColor[v!].set(u!, prim_NONE);
            }
        }
    }
};