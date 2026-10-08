import {
    floydNode, floyd_node_GREEN,
    floyd_node_BLUE, floyd_node_NONE
} from "../../node/GraphNode/impl/FloydNode";
import { MessageController, MessageType } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { create } from "../../node/factory";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * floyd算法求最短路
 */
export class floyd {
    private node: floydNode;

    constructor(edges: number[][]) {
        this.node = create(floydNode, edges);
    }

    // 初始化
    private init(): void {
        this.node._clear();
    }

    /**
     * 执行算法
     */
    public async execute(): Promise<void> {
        this.init();

        if (this.node.nodeCnt === 0) {
            messageController.message("此图为空", MessageType.WARNING);
            return;
        }

        await stepController.wait();
        messageController.message("初始化dis数组", MessageType.INFO);
        for (let u = 0; u < this.node.nodeCnt; ++u) {
            for (let [v, w] of this.node.to[u]) {
                this.node._set_dis(u, v!, w!);
            }
            this.node._set_dis(u, u, 0);
        }
        
        for (let mid = 0; mid < this.node.nodeCnt; ++mid) {
            messageController.message("以" + mid + "为中间节点更新最短距离", MessageType.INFO);
            this.node._set_node_color(mid, floyd_node_GREEN);
            for (let i = 0; i < this.node.nodeCnt; i++) {
                for (let j = 0; j < this.node.nodeCnt; j++) {
                    if (this.node.dis[i][mid] === Infinity ||
                        this.node.dis[mid][j] === Infinity ||
                        i === mid || j === mid) {
                        continue;
                    }

                    this.node._set_node_color(i, floyd_node_BLUE);
                    this.node._set_node_color(j, floyd_node_BLUE);
                    messageController.message(
                        "比较路径" + i + "->" + mid + "->" + j +
                            "与" + i + "->" + j + "的距离",
                        MessageType.INFO
                    );

                    await stepController.wait();
                    if (this.node.dis[i][j] > this.node.dis[i][mid] +
                        this.node.dis[mid][j]) {
                        messageController.message(
                            "dis(" + i + "->" + mid + "->" + j + ")=" +
                                this.node.dis[i][mid] + this.node.dis[mid][j] + " < dis(" +
                                i + "->" + j + ")=" + this.node.dis[i][j] + "更新最短距离",
                            MessageType.INFO
                        );
                        this.node._set_dis(
                            i, j,
                            this.node.dis[i][mid] + this.node.dis[mid][j]
                        );
                    }

                    this.node._set_node_color(i, floyd_node_NONE);
                    this.node._set_node_color(j, floyd_node_NONE);
                }
            }

            this.node._set_node_color(mid, floyd_node_NONE);
        }

        messageController.message("算法执行完成", MessageType.SUCCESS);
        return;
    }
};