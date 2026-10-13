import { MessageController, MessageType } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { BubbleSort_GREEN, BubbleSort_NONE, BubbleSortNode } from "../../node/ArrayNode/impl/BubbleSortNode";
import { create } from "../../node/factory"

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 冒泡排序
 */
export class BubbleSort {
    private node!: BubbleSortNode;

    /**
     * 初始化数组
     * @param data 待排序数组
     */
    private init(data: number[]): void {
        this.node = create(BubbleSortNode, data);
    }

    /**
     * 将data使用冒泡排序算法升序排序
     * @param data 待排序数组
     */
    public async sort(data: number[]): Promise<void> {
        this.init(data);
        
        const n = data.length;
        for (let i = 0; i < n - 1; ++i) {
            await stepController.wait();
            messageController.message("第" + (i + 1) + "轮冒泡", MessageType.INFO);

            let swapped = false;
            for (let j = 0; j < n - 1 - i; ++j) {
                this.node._set_color(j, BubbleSort_GREEN);
                this.node._set_color(j + 1, BubbleSort_GREEN);
                await stepController.wait();
                messageController.message("比较arr[" + j + "]与arr[" + (j + 1) + "]", MessageType.INFO);
                if (this.node.data[j]! > this.node.data[j + 1]!) {
                    messageController.message(
                        this.node.data[j] + " > " + this.node.data[j + 1] + "，交换",
                        MessageType.INFO
                    );
                    this.node._swap_value(
                        j, this.node, j + 1
                    );
                    swapped = true;
                }
                this.node._set_color(j, BubbleSort_NONE);
                this.node._set_color(j + 1, BubbleSort_NONE);
            }

            if (!swapped) {
                messageController.message("本轮未发生交换，说明数组已经有序", MessageType.INFO);
                break;
            }
        }

        messageController.message("排序完成", MessageType.SUCCESS);
    }
}