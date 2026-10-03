import { ErrorMessage, MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { ArrayStackNode } from "../../node/ArrayNode/impl/ArrayStackNode"
import { create } from "../../node/factory"

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 栈（数组实现）
 */
export class ArrayStack {
    // 内部数组节点
    private arr: ArrayStackNode;
    // 已经使用的大小
    private sz: number;

    constructor() {
        this.arr = create(
            ArrayStackNode,
            new Array(0)
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
            ArrayStackNode,
            new Array(len === 0 ? 1 : (len << 1)).fill(null)
        );
        await stepController.wait();

        messageController.message("拷贝原数组数据", MessageType.INFO);
        for (let i = 0; i < len; ++i) {
            tmp._swap_value(i, this.arr, i);
        }
        await stepController.wait();

        messageController.message("使用临时数组作为新数组", MessageType.INFO);
        this.arr._swap_array(tmp);
        tmp._delete();
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.sz === 0;
    }

    // 元素个数
    public size(): number {
        return this.sz;
    }

    // 清除所有元素
    public clear(): void {
        if (this.sz === 0) {
            messageController.message("栈已经为空", MessageType.WARNING);
            return;
        }

        messageController.message("清除所有元素", MessageType.INFO);
        this.arr._delete();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 获得栈顶
     * @returns 栈顶元素值
     */
    public async peek(): Promise<number | null> {
        if (this.isEmpty()) {
            messageController.message("栈为空", MessageType.ERROR);
            return null;
        }

        await stepController.wait();
        return this.arr.data[this.sz - 1];
    }

    /**
     * 弹出栈顶
     */
    public async pop(): Promise<void> {
        if (this.isEmpty()) {
            messageController.message("栈为空", MessageType.ERROR);
            return;
        }

        await stepController.wait();
        this.arr._set_value(--this.sz, null);
    }

    /**
     * 将val入栈
     * @param val 新值
     */
    public async push(val: number): Promise<void> {
        if (this.sz === this.arr.data.length) {
            await stepController.wait();
            messageController.message("栈容量已满，扩容", MessageType.INFO);
            await this.expand();
        }

        await stepController.wait();
        messageController.message("插入数据", MessageType.INFO);
        this.arr._set_value(this.sz, val);
        ++this.sz;

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }
}