import { MessageController, MessageType } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { InsertionSort_GREEN, InsertionSort_NONE, InsertionSortNode } from "../../node/ArrayNode/impl/InsertionSortNode";
import { create } from "../../node/factory";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 插入排序
 */
export class InsertionSort {
    private node!: InsertionSortNode;

    /**
     * 初始化数组
     * @param data 待排序数组
     */
    private init(data: number[]): void {
        this.node = create(InsertionSortNode, data);
    }

    /**
     * 将data使用插入排序算法升序排序
     * @param data 待排序数组
     */
    public async sort(data: number[]): Promise<void> {
        this.init(data);

        const n = data.length;
        for (let i = 1; i < n; ++i) {
            messageController.message("将" + this.node.data[i]! + "插入左侧已排序数组", MessageType.INFO);

            for (let j = i - 1; j >= 0; --j) {
                this.node._set_color(j, InsertionSort_GREEN);
                this.node._set_color(j + 1, InsertionSort_GREEN);
                await stepController.wait();
                messageController.message(
                    "比较data[" + j + "]与" + "data[" + (j + 1) + "]",
                    MessageType.INFO
                );
                if (this.node.data[j]! > this.node.data[j + 1]!) {
                    messageController.message(
                        this.node.data[j] + " > " + this.node.data[j + 1]! + "，交换",
                        MessageType.INFO
                    );
                    this.node._swap_value(j, this.node, j + 1);
                } else {
                    this.node._set_color(j, InsertionSort_NONE);
                    this.node._set_color(j + 1, InsertionSort_NONE);
                    break;
                }
                this.node._set_color(j, InsertionSort_NONE);
                this.node._set_color(j + 1, InsertionSort_NONE);
            }
        }

        messageController.message("排序完成", MessageType.SUCCESS);
    }
}
