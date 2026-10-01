import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { DataNode } from "../DataNode";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 双端队列的数组节点
 * 当data内某位置的数字为null时不显示数字
 */
export class DequeArrayNode extends DataNode {
    public data: (number | null)[];

    public sz: number;

    constructor(data: (number | null)[]) {
        super();
        this.data = data;
        this.sz = 0;
    }
}

/**
 * 双端队列（数组实现）
 */
export class ArrayDeque {
    /**
     * 将array中索引为idx的元素设为val
     * 
     * 动画效果：将数组array的idx处设为val
     * 
     * @param array 待修改数组
     * @param idx 数组索引
     * @param val 新值
     */
    public static _set_value(array: DequeArrayNode,
        idx: number, val: number | null): void {
        array.data[idx] = val;
    }

    /**
     * 将arrayDeque的队首指针设为idx
     * 
     * 动画效果：将arrayDeque的队首指针移动到idx位置
     * 
     * @param arrayDeque 待修改队列
     * @param idx 队首指针新位置
     */
    public static _set_head(arrayDeque: ArrayDeque, idx: number): void {
        arrayDeque.head = idx;
    }

    /**
     * 将arrayDeque的队尾指针设为idx
     * 
     * 动画效果：将arrayDeque的队尾指针移动到idx位置
     * 
     * @param arrayDeque 待修改队列
     * @param idx 队尾指针新位置
     */
    public static _set_tail(arrayDeque: ArrayDeque, idx: number): void {
        arrayDeque.tail = idx;
    }

    /**
     * 交换array1的idx1处的值与array2的idx2处的值
     * 
     * 动画效果：交换上述两个值
     * 
     * @param array1 数组1
     * @param idx1 数组1的索引
     * @param array2 数组2
     * @param idx2 数组2的索引
     */
    public static _swap_value(array1: DequeArrayNode, idx1: number,
        array2: DequeArrayNode, idx2: number): void {
        const tmp: number | null = array1.data[idx1];
        array1.data[idx1] = array2.data[idx2];
        array2.data[idx2] = tmp;
    }

    /**
     * 创建新数组
     * 
     * 动画效果：新数组浮现于画布上
     * 
     * @param len 新数组长度
     * @returns 创建好的数组
     */
    public static _create_array(len: number): DequeArrayNode {
        return new DequeArrayNode(
            new Array(len).fill(null)
        );
    }

    /**
     * 交换两个数组
     * 
     * 动画效果：交换两个数组
     * 
     * @param array1 数组1
     * @param array2 数组2
     */
    public static _swap_array(array1: DequeArrayNode, array2: DequeArrayNode): void {
        const data: (number | null)[] = array1.data;
        array1.data = array2.data;
        array2.data = data;

        const sz: number = array1.sz;
        array1.sz = array2.sz;
        array2.sz = sz;
    }

    /************************************************** */

    private arr: DequeArrayNode;
    private head: number;
    private tail: number;

    constructor() {
        this.arr = ArrayDeque._create_array(9);
        this.head = this.tail = 4;
    }

    // 三倍扩容
    private async expand(): Promise<void> {
        messageController.message("创建三倍大小的临时数组", MessageType.INFO);
        const len = this.arr.data.length;
        const sz = this.size();
        let tmp = ArrayDeque._create_array(len * 3);
        await stepController.wait();

        messageController.message("拷贝原数组数据", MessageType.INFO);
        const idx = (tmp.data.length - sz) >> 1;
        for (let i = 0; i < sz; ++i) {
            ArrayDeque._set_value(
                tmp, idx + i,
                this.arr.data[this.head + i]
            );
        }
        await stepController.wait();

        messageController.message("使用临时数组作为新数组", MessageType.INFO);
        ArrayDeque._swap_array(this.arr, tmp);
        ArrayDeque._set_head(this, idx);
        ArrayDeque._set_tail(this, idx + sz);
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.tail === this.head;
    }

    // 元素个数
    public size(): number {
        return this.tail - this.head;
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
        return this.arr.data[this.head];
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
        return this.arr.data[this.tail - 1];
    }

    /**
     * 将val添加至队首
     * @param val 新数据
     */
    public async addFirst(val: number): Promise<void> {
        if (this.head === 0) {
            messageController.message("扩容", MessageType.INFO);
            await this.expand();
        }

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
        ArrayDeque._set_value(this.arr, --this.head, val);
    }

    /**
     * 将val添加至队尾
     * @param val 新元素
     */
    public async addLast(val: number): Promise<void> {
        if (this.tail == this.arr.data.length) {
            messageController.message("扩容", MessageType.INFO);
            await this.expand();
        }

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
        ArrayDeque._set_value(this.arr, this.tail++, val);
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
        ArrayDeque._set_value(this.arr, this.head++, null);
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
        ArrayDeque._set_value(this.arr, --this.tail, null);
    }

    // 清除所有元素
    public async clear(): Promise<void> {
        if (this.head === this.tail) {
            messageController.message("队列已经为空", MessageType.WARNING);
            return;
        }

        messageController.message("清除所有元素", MessageType.INFO);
        for (let i = 0; i < this.arr.data.length; i++) {
            ArrayDeque._set_value(this.arr, i, null);
        }
        await stepController.wait();

        messageController.message("设置首尾指针", MessageType.INFO);
        ArrayDeque._set_head(this, this.arr.data.length >> 1);
        ArrayDeque._set_tail(this, this.arr.data.length >> 1);
    }
}