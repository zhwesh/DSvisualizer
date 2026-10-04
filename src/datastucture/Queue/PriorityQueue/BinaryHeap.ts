import { BinaryHeapNode } from "../../../node/ArrayNode/impl/BinaryHeapNode"
import { create } from "../../../node/factory";
import { MessageController, MessageType, SuccessMessage } from "../../../controller/MessageController";
import { StepController } from "../../../controller/StepController";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 二叉堆（小根堆，数组存储）
 */
export class BinaryHeap {
    /**
     * 动画效果：清空堆
     */
    public _clear(): void {
        this.arr._delete();
        this.arr._set_value(0, null);
        this.sz = 0;
    }

    /************************************************** */

    // 内部数组节点
    private arr: BinaryHeapNode;
    // 元素个数
    private sz: number;

    constructor() {
        this.arr = create(
            BinaryHeapNode,
            new Array(1).fill(null)
        );
        this.sz = 0;
    }

    /**
     * 双倍扩容
     */
    private async expand(): Promise<void> {
        messageController.message("创建双倍大小的临时数组", MessageType.INFO);
        const len = this.size();
        const tmp = create(
            BinaryHeapNode,
            new Array(len === 0 ? 2 : (len << 1) + 1).fill(null)
        );
        await stepController.wait();

        messageController.message("拷贝原数组数据", MessageType.INFO);
        for (let i = 1; i <= len; ++i) {
            tmp._swap_value(i, this.arr, i);
        }
        await stepController.wait();

        messageController.message("使用临时数组作为新数组", MessageType.INFO);
        this.arr._swap_array(tmp);
        tmp._delete();
    }

    // 清除所有元素
    public clear(): void {
        if (this.sz === 0) {
            messageController.message("堆已经为空", MessageType.WARNING);
            return;
        }

        this._clear();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.sz === 0;
    }

    // 元素个数
    public size(): number {
        return this.sz;
    }

    /**
     * 获取堆顶
     * @returns 堆顶元素
     */
    public async peek(): Promise<number | null> {
        if (this.isEmpty()) {
            messageController.message("堆为空", MessageType.ERROR);
            return null;
        }

        await stepController.wait();
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return this.arr.data[1] as number;
    }

    /**
     * 将val插入堆
     * @param val 要插入的值
     */
    public async add(val: number): Promise<void> {
        if (this.sz + 1 >= this.arr.data.length) {
            await stepController.wait();
            messageController.message("数组容量已满，扩容", MessageType.INFO);
            await this.expand();
        }

        await stepController.wait();
        messageController.message("将新元素放到数组末尾", MessageType.INFO);
        ++this.sz;
        this.arr._set_value(this.sz, val);

        let i = this.sz;
        while (i > 1) {
            const father = i >> 1;
            await stepController.wait();
            if (this.arr.data[i]! < this.arr.data[father]!) {
                messageController.message(
                    "节点" + this.arr.data[i] + "小于父节点" + this.arr.data[father] + "，交换",
                    MessageType.INFO
                );
                this.arr._swap_value(i, this.arr, father);
                i = father;
            } else {
                messageController.message(
                    "节点" + this.arr.data[i] + "不小于父节点" + this.arr.data[father] + "，调整结束",
                    MessageType.INFO
                );
                break;
            }
        }

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 弹出堆顶
     */
    public async poll(): Promise<void> {
        if (this.isEmpty()) {
            messageController.message("堆为空", MessageType.ERROR);
            return;
        }

        if (this.sz === 1) {
            await stepController.wait();
            messageController.message("删除堆顶元素", MessageType.INFO);
            this.arr._set_value(1, null);
            this.sz = 0;

            messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
            return;
        }

        await stepController.wait();
        messageController.message("将数组末尾元素移到堆顶", MessageType.INFO);
        this.arr._swap_value(1, this.arr, this.sz);
        this.arr._set_value(this.sz, null);
        --this.sz;

        messageController.message("向下调整堆顶", MessageType.INFO);
        let i = 1;
        while (true) {
            let small = i << 1;
            if (small > this.sz) {
                break;
            }
            if (small + 1 <= this.sz && this.arr.data[small + 1]! < this.arr.data[small]!) {
                small = small + 1;
            }

            await stepController.wait();
            if (this.arr.data[small]! < this.arr.data[i]!) {
                messageController.message(
                    "节点" + this.arr.data[i] + "大于较小孩子" + this.arr.data[small] + "，交换",
                    MessageType.INFO
                );
                this.arr._swap_value(i, this.arr, small);
                i = small;
            } else {
                messageController.message(
                    "节点" + this.arr.data[i] + "不大于较小孩子，调整结束",
                    MessageType.INFO
                );
                break;
            }
        }

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }
}
