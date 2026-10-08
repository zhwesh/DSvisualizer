import {
    dijkstra_node_BLUE, dijkstra_node_GREEN,
    dijkstra_edge_GREEN, dijkstra_edge_NONE,
    dijkstraNode
} from "../../node/GraphNode/impl/dijkstraNode";
import { MessageController, MessageType } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { create } from "../../node/factory";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * dijkstra算法求最短路（树）
 */
export class dijkstra {
    private node: dijkstraNode;
    private father!: number[];          // 最短路树上的父节点
    private vis!: boolean[];            // 节点是否已出堆并处理过
    private heap!: [number, number][];  // 优先队列（懒删除，元素为[距离, 节点]）

    constructor(edges: number[][]) {
        this.node = create(dijkstraNode, edges);
        this.init();
    }

    // 初始化
    private init(): void {
        const n = this.node.nodeCnt;
        this.father = new Array(n).fill(-1);
        this.vis = new Array(n).fill(false);
        this.heap = [];
    }

    /**
     * 执行算法
     * @param start 起点
     */
    public async execute(start: number = 0): Promise<void> {
        this.node._clear();
        this.init();

        if (this.node.nodeCnt === 0) {
            messageController.message("此图为空", MessageType.WARNING);
            return;
        }

        if (start < 0 || start >= this.node.nodeCnt) {
            messageController.message("起点不存在", MessageType.ERROR);
            return;
        }

        await stepController.wait();
        messageController.message("初始化起点信息", MessageType.INFO);
        this.node._set_dis(start, 0);
        this.heap.push([0, start]);
        this.node._set_node_color(start, dijkstra_node_BLUE);

        while (this.heap.length > 0) {
            let idx = 0;
            for (let i = 1; i < this.heap.length; ++i) {
                if (this.heap[i][0] < this.heap[idx][0]) {
                    idx = i;
                }
            }
            const u = this.heap[idx][1];
            this.heap[idx] = this.heap[this.heap.length - 1];
            this.heap.pop();

            await stepController.wait();
            if (this.vis[u]) {
                messageController.message("节点" + u + "已经处理，跳过", MessageType.INFO);
                continue;
            }
            this.vis[u] = true;

            messageController.message(
                "对节点" + u + "的邻接边进行松弛操作",
                MessageType.INFO
            );
            this.node._set_node_color(u, dijkstra_node_GREEN);
            if (this.father[u] !== -1) {
                this.node._set_edge_color(this.father[u], u, dijkstra_edge_GREEN);
            }

            for (const [v, w] of this.node.to[u]) {
                await stepController.wait();
                if (this.node.dis[u] + w! < this.node.dis[v!]) {
                    messageController.message(
                        "经过边(" + u + "," + v + ")到达节点" + v + "的距离更短，更新",
                        MessageType.INFO
                    );
                    if (this.father[v!] != -1) {
                        this.node._set_edge_color(this.father[v!], v!, dijkstra_edge_NONE);
                    }
                    this.node._set_edge_color(u, v!, dijkstra_edge_NONE);
                    this.node._set_dis(v!, this.node.dis[u] + w!);
                    this.father[v!] = u;
                    this.heap.push([this.node.dis[u] + w!, v!]);
                    this.node._set_node_color(v!, dijkstra_node_BLUE);
                }
            }

            this.node._set_node_color(u, dijkstra_node_BLUE);
        }

        messageController.message("算法执行完成", MessageType.SUCCESS);
        return;
    }
};