import { MessageController, MessageType } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { create } from "../../node/factory";
import { prim_BLUE, prim_GREEN, prim_NONE, primNode } from "../../node/GraphNode/impl/PrimNode";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 最小生成树（prim算法）
 */
export class prim {
    private graph: primNode;
    private dist!: number[];    // 每个节点到生成树的最小边权
    private pre!: number[];     // 最小边在生成树内的端点
    private inTree!: boolean[]; // 节点是否已加入生成树

    constructor(edges: number[][]) {
        this.graph = create(primNode, edges);
    }

    // 初始化
    private init(): void {
        this.graph._clear();
        this.dist = new Array(this.graph.nodeCnt).fill(Infinity);
        this.pre = new Array(this.graph.nodeCnt).fill(-1);
        this.inTree = new Array(this.graph.nodeCnt).fill(false);
    }

    /**
     * 执行算法
     */
    public async execute(): Promise<void> {
        this.init();

        if (this.graph.nodeCnt === 0) {
            messageController.message("此图为空", MessageType.WARNING);
            return;
        }

        await stepController.wait();
        messageController.message("从节点0开始构建生成树", MessageType.INFO);
        this.dist[0] = 0;

        let selectedCnt = 0;    // 已经选中的边数量
        for (let t = 0; t < this.graph.nodeCnt; ++t) {
            let u = -1;
            for (let i = 0; i < this.graph.nodeCnt; ++i) {
                if (!this.inTree[i] && (u === -1 || this.dist[i] < this.dist[u])) {
                    u = i;
                }
            }

            if (u === -1 || this.dist[u] === Infinity) {
                messageController.message("此图不连通，最小生成树不存在", MessageType.ERROR);
                return;
            }

            if (this.pre[u] !== -1) {
                await stepController.wait();
                messageController.message(
                    "从优先队列中取出边权最小的边(" + this.pre[u] + "," + u + ")加入生成树",
                    MessageType.INFO
                );
                this.graph._set_edge_color(this.pre[u], u, prim_GREEN);
                ++selectedCnt;
            }
            this.inTree[u] = true;

            for (let [v, w] of this.graph.to[u]) {
                if (this.inTree[v!]) {
                    continue;
                }
                if (w! < this.dist[v!]) {
                    await stepController.wait();
                    if (this.pre[v!] !== -1) {
                        messageController.message(
                            "节点" + v + "已有更优候选边，将(" + this.pre[v!] + "," + v + ")移出优先队列",
                            MessageType.INFO
                        );
                        this.graph._set_edge_color(this.pre[v!], v!, prim_NONE);
                    }
                    messageController.message(
                        "将边(" + u + "," + v + ")加入优先队列",
                        MessageType.INFO
                    );
                    this.graph._set_edge_color(u, v!, prim_BLUE);
                    this.dist[v!] = w!;
                    this.pre[v!] = u;
                }
            }

            if (this.graph.nodeCnt > 1 &&
                selectedCnt === this.graph.nodeCnt - 1) {
                messageController.message(
                    "边数达到" + selectedCnt + "，退出循环",
                    MessageType.INFO
                );
                break;
            }
        }

        messageController.message("算法执行完成", MessageType.SUCCESS);
    }
};
