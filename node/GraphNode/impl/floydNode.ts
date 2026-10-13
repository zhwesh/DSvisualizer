import { DirectedGraphNode } from "../DirectedGraphNode";

// 节点颜色
export const floyd_node_NONE: number = 0;   // 当前未处理的节点
export const floyd_node_GREEN: number = 1;  // 中间节点
export const floyd_node_BLUE: number = 2;   // 当前正在处理的节点

export class floydNode extends DirectedGraphNode {
    /**
     * 设置从u到v的最短距离
     * 
     * 动画效果：dis[u][v]设为dis
     * 
     * @param u 节点u
     * @param v 节点v
     * @param dis 距离
     */
    public _set_dis(u: number, v: number, dis: number) {
        this.dis[u][v] = dis;
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

    /************************************************** */

    public nodeColor: number[];
    public dis: number[][];

    constructor(edges: number[][]) {
        super(edges);
        for (const [, , w] of edges) {
            if (w < 0) {
                throw new Error("边权必须大于等于0");
            }
        }
        this.nodeColor = new Array(this.nodeCnt).fill(floyd_node_NONE);
        this.dis = Array.from(
            { length: this.nodeCnt },
            () => new Array(this.nodeCnt).fill(Infinity)
        );
    }
};