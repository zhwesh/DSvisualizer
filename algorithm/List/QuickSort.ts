import { MessageController, MessageType } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { QuickSort_GREEN, QuickSortNode } from "../../node/ArrayNode/impl/QuickSortNode";
import { create } from "../../node/factory";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 快速排序
 */
export class QuickSort {
    private node!: QuickSortNode;

    /**
     * 初始化数组
     * @param data 待排序数组
     */
    private init(data: number[]): void {
        this.node = create(QuickSortNode, data);
    }

    /**
     * 对data[l...r]使用快速排序算法升序排序
     * @param l 区间左端点
     * @param r 区间右端点
     */
    private async quickSort(l: number, r: number): Promise<void> {
        if (l >= r) {
            return;
        }

        messageController.message("对区间[" + l + "," + r + "]进行划分", MessageType.INFO);
        for (let i = l; i <= r; ++i) {
            this.node._set_color(i, QuickSort_GREEN);
        }

        await stepController.wait();
        messageController.message("三点取中法设置枢轴", MessageType.INFO);
        const mid = (l + r) >> 1;
        if (this.node.data[l]! > this.node.data[mid]!) {
            this.node._swap_value(l, this.node, mid);
        }
        if (this.node.data[l]! > this.node.data[r]!) {
            this.node._swap_value(l, this.node, r);
        } 
        if (this.node.data[mid]! > this.node.data[r]!) {
            this.node._swap_value(mid, this.node, r);
        }
        this.node._swap_value(l, this.node, mid);
        const pivot = this.node.data[l]!;
        this.node._set_pivot(l);

        let i = l;
        for (let j = l + 1; j <= r; ++j) {
            await stepController.wait();
            messageController.message(
                "比较data[" + j + "]=" + this.node.data[j] + "与pivot",
                MessageType.INFO
            );
            if (this.node.data[j]! < pivot) {
                ++i;
                if (i !== j) {
                    messageController.message(
                        this.node.data[j] + " < " + pivot + "，交换data[" + i + "]与data[" + j + "]",
                        MessageType.INFO
                    );
                    this.node._swap_value(i, this.node, j);
                } else {
                    messageController.message(
                        this.node.data[j] + " < " + pivot + "，已在正确位置",
                        MessageType.INFO
                    );
                }
            } else {
                messageController.message(
                    this.node.data[j] + " ≥ " + pivot + "，继续比较",
                    MessageType.INFO
                );
            }
        }

        await stepController.wait();
        if (i !== l) {
            messageController.message("将pivot归位到位置" + i, MessageType.INFO);
            this.node._swap_value(l, this.node, i);
            this.node._set_pivot(i);
        } else {
            messageController.message("pivot已在正确位置" + i, MessageType.INFO);
        }
        this.node._clear_color();

        messageController.message("对左右两侧区间进行递归划分", MessageType.INFO);
        await this.quickSort(l, i - 1);
        await this.quickSort(i + 1, r);

        messageController.message("区间[" + l + "," + r + "]排序完成", MessageType.SUCCESS);
    }

    /**
     * 将data使用快速排序算法升序排序
     * @param data 待排序数组
     */
    public async sort(data: number[]): Promise<void> {
        this.init(data);

        await this.quickSort(0, data.length - 1);

        messageController.message("排序完成", MessageType.SUCCESS);
    }
}
