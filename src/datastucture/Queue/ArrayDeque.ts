import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { ArrayQueueNode } from "../../node/ArrayNode/impl/ArrayQueueNode";
import { create } from "../../node/factory"

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 双端队列（数组实现）
 */
export class ArrayDeque {
    /**
     * 动画效果：清空队列，并设置首尾指针
     */
    public async _clear(): Promise<void> {
        messageController.message("清除所有元素", MessageType.INFO);
        for (let i = 0; i < this.arr.data.length; i++) {
            this.arr._set_value(i, null);
        }

        await stepController.wait();
        messageController.message("设置首尾指针", MessageType.INFO);
        this.arr._set_head(this.arr.data.length >> 1);
        this.arr._set_tail(this.arr.data.length >> 1);
    }

    /************************************************** */

    private arr: ArrayQueueNode;

    constructor() {
        this.arr = create(
            ArrayQueueNode,
            new Array(9).fill(null)
        );
        this.arr._set_head(4);
        this.arr._set_tail(4);
    }

    // 三倍扩容
    private async expand(): Promise<void> {
        messageController.message("创建三倍大小的临时数组", MessageType.INFO);
        const sz = this.size();
        let tmp = create(
            ArrayQueueNode,
            new Array(sz === 0 ? 9 : sz * 3).fill(null)
        );

        await stepController.wait();
        messageController.message("拷贝原数组数据", MessageType.INFO);
        const idx = (tmp.data.length - sz) >> 1;
        for (let i = 0; i < sz; ++i) {
            tmp._set_value(idx + i, this.arr.data[this.arr.head! + i]);
        }

        await stepController.wait();
        messageController.message("使用临时数组作为新数组", MessageType.INFO);
        this.arr._swap_array(tmp);
        this.arr._set_head(idx);
        this.arr._set_tail(idx + sz);
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
    public async getFirst(): Promise<number | null> {
        if (this.isEmpty()) {
            messageController.message("队列为空", MessageType.ERROR);
            return null;
        }

        await stepController.wait();
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return this.arr.data[this.arr.head!];
    }

    /**
     * 获取队尾
     * @returns 队尾元素
     */
    public async getLast(): Promise<number | null> {
        if (this.isEmpty()) {
            messageController.message("队列为空", MessageType.ERROR);
            return null;
        }

        await stepController.wait();
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return this.arr.data[this.arr.tail! - 1];
    }

    /**
     * 将val添加至队首
     * @param val 新数据
     */
    public async pushFirst(val: number): Promise<void> {
        if (this.arr.head! === 0) {
            await stepController.wait();
            messageController.message("扩容", MessageType.INFO);
            await this.expand();
        }

        await stepController.wait();
        this.arr._set_head(this.arr.head! - 1);
        this.arr._set_value(this.arr.head!, val);

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 将val添加至队尾
     * @param val 新元素
     */
    public async pushLast(val: number): Promise<void> {
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
    public async popFirst(): Promise<void> {
        if (this.isEmpty()) {
            messageController.message("队列为空", MessageType.ERROR);
            return;
        }

        await stepController.wait();
        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
        this.arr._set_value(this.arr.head!, null);
        this.arr._set_head(this.arr.head! + 1);
    }

    /**
     * 弹出队尾 
     */
    public async popLast(): Promise<void> {
        if (this.isEmpty()) {
            messageController.message("队列为空", MessageType.ERROR);
            return;
        }

        await stepController.wait();
        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
        this.arr._set_tail(this.arr.tail! - 1);
        this.arr._set_value(this.arr.tail!, null);
    }

    // 清除所有元素
    public async clear(): Promise<void> {
        if (this.arr.head! === this.arr.tail!) {
            messageController.message("队列已经为空", MessageType.WARNING);
            return;
        }

        await this._clear();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }
}