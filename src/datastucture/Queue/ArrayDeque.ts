import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { ArrayDequeNode } from "../../node/ArrayNode/impl/ArrayDequeNode";
import { create } from "../../node/factory"

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 双端队列（数组实现）
 */
export class ArrayDeque {
    private arr: ArrayDequeNode;

    constructor() {
        this.arr = create(
            ArrayDequeNode,
            new Array(9).fill(null)
        );
        this.arr._set_head(4);
        this.arr._set_tail(4);
    }

    // 三倍扩容
    private async expand(): Promise<void> {
        messageController.message("创建三倍大小的临时数组", MessageType.INFO);
        const len = this.arr.data.length;
        const sz = this.size();
        let tmp = create(
            ArrayDequeNode,
            new Array(len * 3).fill(null)
        );
        await stepController.wait();

        messageController.message("拷贝原数组数据", MessageType.INFO);
        const idx = (tmp.data.length - sz) >> 1;
        for (let i = 0; i < sz; ++i) {
            tmp._set_value(idx + i, this.arr.data[this.arr.getHead()! + i]);
        }
        tmp.sz = sz;
        await stepController.wait();

        messageController.message("使用临时数组作为新数组", MessageType.INFO);
        this.arr._swap_array(tmp);
        this.arr._set_head(idx);
        this.arr._set_tail(idx + sz);
        tmp._delete();
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.arr.getHead()! === this.arr.getTail()!;
    }

    // 元素个数
    public size(): number {
        return this.arr.getTail()! - this.arr.getHead()!;
    }

    /**
     * 获取队首
     * @returns 队首元素
     */
    public async peekFirst(): Promise<number | null> {
        if (this.isEmpty()) {
            messageController.message("队列为空", MessageType.ERROR);
            return null;
        }

        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return this.arr.data[this.arr.getHead()!];
    }

    /**
     * 获取队尾
     * @returns 队尾元素
     */
    public async peekLast(): Promise<number | null> {
        if (this.isEmpty()) {
            messageController.message("队列为空", MessageType.ERROR);
            return null;
        }

        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return this.arr.data[this.arr.getTail()! - 1];
    }

    /**
     * 将val添加至队首
     * @param val 新数据
     */
    public async addFirst(val: number): Promise<void> {
        if (this.arr.getHead()! === 0) {
            messageController.message("扩容", MessageType.INFO);
            await this.expand();
        }

        this.arr._set_head(this.arr.getHead()! - 1);
        this.arr._set_value(this.arr.getHead()!, val);

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 将val添加至队尾
     * @param val 新元素
     */
    public async addLast(val: number): Promise<void> {
        if (this.arr.getTail()! === this.arr.data.length) {
            messageController.message("扩容", MessageType.INFO);
            await this.expand();
        }

        this.arr._set_value(this.arr.getTail()!, val);
        this.arr._set_tail(this.arr.getTail()! + 1);

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 弹出队首
     */
    public async pollFirst(): Promise<void> {
        if (this.isEmpty()) {
            messageController.message("队列为空", MessageType.ERROR);
            return;
        }

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
        this.arr._set_value(this.arr.getHead()!, null);
        this.arr._set_head(this.arr.getHead()! + 1);
    }

    /**
     * 弹出队尾 
     */
    public async pollLast(): Promise<void> {
        if (this.isEmpty()) {
            messageController.message("队列为空", MessageType.ERROR);
            return;
        }

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
        this.arr._set_tail(this.arr.getTail()! - 1);
        this.arr._set_value(this.arr.getTail()!, null);
    }

    // 清除所有元素
    public async clear(): Promise<void> {
        if (this.arr.getHead()! === this.arr.getTail()!) {
            messageController.message("队列已经为空", MessageType.WARNING);
            return;
        }

        messageController.message("清除所有元素", MessageType.INFO);
        for (let i = 0; i < this.arr.data.length; i++) {
            this.arr._set_value(i, null);
        }
        await stepController.wait();

        messageController.message("设置首尾指针", MessageType.INFO);
        this.arr._set_head(this.arr.data.length >> 1);
        this.arr._set_tail(this.arr.data.length >> 1);
    }
}