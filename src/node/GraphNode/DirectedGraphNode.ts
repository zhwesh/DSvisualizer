import { DataNode } from "../DataNode";

/**
 * 图节点类，使用邻接表存放一张有向图
 * 
 * 约定：图的节点编号从0开始
 * edges[i] = [u, v, w]代表从u到v的权值为w的有向边
 */
export class DirectedGraphNode extends DataNode {
    public to: (number | null)[][][];   // 邻接表
    public nodeCnt: number;             // 节点数量

    constructor(edges: (number | null)[][]) {
        super();
        this.nodeCnt = 0;
        for (let [u, v] of edges) {
            this.nodeCnt = Math.max(this.nodeCnt, u!);
            this.nodeCnt = Math.max(this.nodeCnt, v!);
        }
        ++this.nodeCnt;
        this.to = new Array(this.nodeCnt).fill([]);
        for (const [u, v, w] of edges) {
            this.to[u!].push([v, w]);
        }
    }
};