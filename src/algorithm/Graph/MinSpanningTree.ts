import { MinSpanningTree_BLUE, MinSpanningTree_GREEN, MinSpanningTree_NONE, MinSpanningTreeNode } from "../../node/GraphNode/impl/MinSpanningTreeNode";
import { MessageController, MessageType } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { create } from "../../node/factory";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 最小生成树（kruskal算法）
 */
export class MinSpanningTree {
    private graph: MinSpanningTreeNode;
    private father: number[];

    constructor(edges: number[][]) {
        this.graph = create(MinSpanningTreeNode, edges);
        this.father = new Array(this.graph.nodeCnt);
        for (let i = 0; i < this.graph.nodeCnt; ++i) {
            this.father[i] = i;
        }
    }

    /**
     * 查找x所在集合根节点
     * @param x 待查找元素
     * @returns x所在集合根节点
     */
    private find(x: number): number {
        return x === this.father[x] ? x : this.find(this.father[x]);
    }

    /**
     * 执行算法
     */
    public async execute(): Promise<void> {
        await stepController.wait();
        messageController.message("将边集按w排序", MessageType.INFO);
        this.graph._sort_edges();

        await stepController.wait();
        let selectedCnt = 0;    // 已经选中的边数量
        for (let [u, v] of this.graph.edges) {
            this.graph._set_edge_color(u, v, MinSpanningTree_BLUE);
            messageController.message(
                "尝试将边(" + u + "," + v + ")加入答案",
                MessageType.INFO
            );
            let fu = this.find(u), fv = this.find(v);

            await stepController.wait();
            if (fu != fv) {
                messageController.message(
                    "节点" + u + "与" + v + "不连通，将该边加入答案",
                    MessageType.INFO
                );
                this.father[fu] = fv;
                this.graph._set_edge_color(u, v, MinSpanningTree_GREEN);
                ++selectedCnt;
            } else {
                messageController.message(
                    "节点" + u + "与" + v + "已经连通，跳过该边",
                    MessageType.INFO
                );
                this.graph._set_edge_color(u, v, MinSpanningTree_NONE);
            }

            if (selectedCnt === this.graph.nodeCnt - 1) {
                messageController.message(
                    "边数达到" + selectedCnt + "，退出循环",
                    MessageType.INFO
                );
                break;
            }
        }

        if (selectedCnt < this.graph.nodeCnt - 1) {
            messageController.message("此图不连通，最小生成树不存在", MessageType.ERROR);
            return;
        }
        messageController.message("算法执行完成", MessageType.SUCCESS);
    }
};