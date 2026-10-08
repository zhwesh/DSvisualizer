import { DataNode } from "../DataNode";

/**
 * 图节点类，使用邻接表存放一张无向图
 * 
 * 约定：图的节点编号从0开始，节点数为最大编号+1（编号更大的孤立节点无法表示）
 * edges[i] = [u, v, w]代表从u到v的权值为w的无向边
 * 
 * 非法输入（自环、重边、编号/边权非法等）会在构造时抛出异常
 */
export class UndirectedGraphNode extends DataNode {
    private static edgesAssert(edges: (number | null)[][], isDirected: boolean): void {
        const used = new Set<string>();
        for (const edge of edges) {
            if (!Array.isArray(edge) || edge.length !== 3) {
                throw new Error("每条边必须是长度为3的数组[u, v, w]");
            }

            const [u, v] = edge;
            if (u === v) {
                throw new Error("无向图不允许自环");
            }

            const key = isDirected ? u + "," + v : Math.min(u!, v!) + "," + Math.max(u!, v!);
            if (used.has(key)) {
                throw new Error("无向图不允许重边");
            }
            used.add(key);
        }
    }

    public to: (number | null)[][][];   // 邻接表
    public nodeCnt: number;             // 节点数量

    constructor(edges: (number | null)[][]) {
        super();
        UndirectedGraphNode.edgesAssert(edges, false);
        this.nodeCnt = 0;
        for (let [u, v] of edges) {
            this.nodeCnt = Math.max(this.nodeCnt, u! + 1);
            this.nodeCnt = Math.max(this.nodeCnt, v! + 1);
        }
        this.to = Array.from({ length: this.nodeCnt }, () => []);
        for (const [u, v, w] of edges) {
            this.to[u!].push([v, w]);
            this.to[v!].push([u, w]);
        }
    }
};