import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { ArrayQueueNode } from "../../node/ArrayNode/impl/ArrayQueueNode";
import { create } from "../../node/factory"

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 普通队列（数组实现）
 */
export class ArrayQueue {
    private arr: ArrayQueueNode;

    constructor() {
        this.arr = create(
            ArrayQueueNode,
            new Array(4).fill(null)
        );
        this.arr._set_head(0);
        this.arr._set_tail(0);
    }

    // 双倍扩容
    private async expand(): Promise<void> {
        messageController.message("创建双倍大小的临时数组", MessageType.INFO);
        const len = this.size();
        const tmp = create(
            ArrayQueueNode,
            new Array(len === 0 ? 1 : (len << 1)).fill(null)
        );
        await stepController.wait();

        messageController.message("拷贝原数组数据", MessageType.INFO);
        for (let i = 0; i < len; ++i) {
            tmp._swap_value(i, this.arr, this.arr.head! + i);
        }
        await stepController.wait();

        messageController.message("使用临时数组作为新数组", MessageType.INFO);
        this.arr._swap_array(tmp);
        this.arr._set_head(0);
        this.arr._set_tail(len);
        tmp._delete();
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.arr.head! === this.arr.tail!;
    }

    // 元素个数
    public size(): number {
        return this.arr.tail! - this.arr.head!;
    }

    /**
     * 获取队首
     * @returns 队首元素
     */
    public async peek(): Promise<number | null> {
        if (this.isEmpty()) {
            messageController.message("队列为空", MessageType.ERROR);
            return null;
        }

        await stepController.wait();
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return this.arr.data[this.arr.head!];
    }

    /**
     * 将val添加至队尾
     * @param val 新元素
     */
    public async add(val: number): Promise<void> {
        if (this.arr.tail! === this.arr.data.length) {
            await stepController.wait();
            messageController.message("队列容量已满，扩容", MessageType.INFO);
            await this.expand();
        }

        await stepController.wait();
        this.arr._set_value(this.arr.tail!, val);
        this.arr._set_tail(this.arr.tail! + 1);

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 弹出队首
     */
    public async poll(): Promise<void> {
        if (this.isEmpty()) {
            messageController.message("队列为空", MessageType.ERROR);
            return;
        }

        await stepController.wait();
        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
        this.arr._set_value(this.arr.head!, null);
        this.arr._set_head(this.arr.head! + 1);
    }

    // 清除所有元素
    public async clear(): Promise<void> {
        if (this.arr.head! === this.arr.tail!) {
            messageController.message("队列已经为空", MessageType.WARNING);
            return;
        }

        await stepController.wait();
        messageController.message("清除所有元素", MessageType.INFO);
        for (let i = 0; i < this.arr.data.length; i++) {
            this.arr._set_value(i, null);
        }

        await stepController.wait();
        messageController.message("设置首尾指针", MessageType.INFO);
        this.arr._set_head(0);
        this.arr._set_tail(0);
    }
}