import { MessageController, MessageType } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { MergeSort_GREEN, MergeSortNode } from "../../node/ArrayNode/impl/MergeSortNode";
import { create } from "../../node/factory";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 归并排序
 */
export class MergeSort {
    private node!: MergeSortNode;

    /**
     * 初始化数组
     * @param data 待排序数组
     */
    private init(data: number[]): void {
        this.node = create(MergeSortNode, data);
    }

    /**
     * 对data[l...r]使用归并排序算法升序排序
     * @param l 区间左端点
     * @param r 区间右端点
     */
    private async mergeSort(l: number, r: number): Promise<void> {
        if (l >= r) {
            return;
        }

        messageController.message(
            "对左右两侧区间进行递归排序",
            MessageType.INFO
        );
        const mid = (l + r) >> 1;
        await this.mergeSort(l, mid);
        await this.mergeSort(mid + 1, r);

        messageController.message(
            "归并区间[" + l + "," + mid + "]与[" + (mid + 1) + "," + r + "]",
            MessageType.INFO
        );
        for (let i = l; i <= r; ++i) {
            this.node._set_color(i, MergeSort_GREEN);
        }

        let tmp = create(MergeSortNode, []);
        let a = l, b = mid + 1;
        while (a <= mid && b <= r) {
            messageController.message(
                "比较arr[" + a + "]与arr[" + b + "]",
                MessageType.INFO
            );
            await stepController.wait();
            if (this.node.data[a]! <= this.node.data[b]!) {
                messageController.message(
                    this.node.data[a] + " ≤ " + this.node.data[b] +
                        "，将" + this.node.data[a] + "加入数组",
                    MessageType.INFO
                );
                tmp._add_value(this.node.data[a++]!);
            } else {
                messageController.message(
                    this.node.data[a] + " > " + this.node.data[b] +
                        "，将" + this.node.data[b] + "加入数组",
                    MessageType.INFO
                );
                tmp._add_value(this.node.data[b++]!);
            }
        }

        await stepController.wait();
        messageController.message("将剩余元素加入数组", MessageType.INFO);
        while (a <= mid) {
            tmp._add_value(this.node.data[a++]!);
        }
        while (b <= r) {
            tmp._add_value(this.node.data[b++]!);
        }

        await stepController.wait();
        messageController.message("将临时结果写回数组", MessageType.INFO);
        for (let i = 0; i < tmp.data.length; ++i) {
            this.node._set_value(l + i, tmp.data[i]);
        }
        tmp._delete();

        messageController.message("区间[" + l + "," + r + "]排序完成", MessageType.SUCCESS);
        this.node._clear_color();
    }

    /**
     * 将data使用归并排序算法升序排序
     * @param data 待排序数组
     */
    public async sort(data: number[]): Promise<void> {
        this.init(data);

        await this.mergeSort(0, data.length - 1);

        messageController.message("排序完成", MessageType.SUCCESS);
    }
}
