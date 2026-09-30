import { ErrorMessage, MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { DataNode } from "../DataNode";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 数组节点
 * 当data内某位置的数字为null时不显示数字
 */
export class ArrayNode extends DataNode {
    public data: (number | null)[];

    public sz: number;

    constructor(data: (number | null)[]) {
        super();
        this.data = data;
        this.sz = 0;
    }
}

/**
 * 线性表（数组实现）
 */
export class ArrayList {
    /**
     * 将array中索引为idx的元素设为val
     * 
     * 动画效果：将数组array的idx处设为val
     * 
     * @param array 待修改数组
     * @param idx 数组索引
     * @param val 新值
     */
    public static _set_value(array: ArrayNode,
        idx: number, val: number | null): void {
        array.data[idx] = val;
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
    public static _swap_value(array1: ArrayNode, idx1: number,
        array2: ArrayNode, idx2: number): void {
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
    public static _create_array(len: number): ArrayNode {
        return new ArrayNode(
            new Array(len).fill(null)
        );
    }

    /**
     * 删除数组
     * 
     * 动画效果：数组消失
     * 
     * @param array 
     */
    public static _delete_array(array: ArrayNode) {
        array.data = Array(0);
        array.sz = 0;
    }

    /**
     * 交换两个数组
     * 
     * 动画效果：交换两个数组
     * 
     * @param array1 数组1
     * @param array2 数组2
     */
    public static _swap_array(array1: ArrayNode, array2: ArrayNode): void {
        const data: (number | null)[] = array1.data;
        array1.data = array2.data;
        array2.data = data;

        const sz: number = array1.sz;
        array1.sz = array2.sz;
        array2.sz = sz;
    }

    /************************************************** */

    // 内部数组节点
    public arr: ArrayNode;

    constructor() {
        this.arr = ArrayList._create_array(0);
    }

    /**
     * 双倍扩容
     */
    private async expand(): Promise<void> {
        messageController.message("创建双倍大小的临时数组", MessageType.INFO);
        const len = this.arr.data.length;
        const tmp: ArrayNode = ArrayList._create_array(len === 0 ? 1 : (len << 1));
        await stepController.wait();

        messageController.message("拷贝原数组数据", MessageType.INFO);
        for (let i = 0; i < this.arr.sz; ++i) {
            ArrayList._swap_value(tmp, i, this.arr, i);
        }
        tmp.sz = this.arr.sz;
        await stepController.wait();

        messageController.message("使用临时数组作为新数组", MessageType.INFO);
        ArrayList._swap_array(this.arr, tmp);
        ArrayList._delete_array(tmp);
    }

    /**
     * 清除所有元素
     */
    public clear(): void {
        if (this.arr.sz === 0) {
            messageController.message("数组已经为空", MessageType.WARNING);
            return;
        }

        messageController.message("清除所有元素", MessageType.INFO);
        ArrayList._delete_array(this.arr);

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 是否为空
     * @returns 是否为空
     */
    public isEmpty(): boolean {
        return this.arr.sz === 0;
    }

    /**
     * 元素个数
     * @returns 元素个数
     */
    public size(): number {
        return this.arr.sz;
    }

    /**
     * 获取索引为idx的元素
     * @param idx 索引
     * @returns 索引为idx的元素
     */
    public async get(idx: number): Promise<number | null> {
        if (idx < 0 || idx >= this.arr.sz) {
            messageController.message(ErrorMessage.INDEX_OUT_OF_RANGE, MessageType.ERROR);
            return null;
        }
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return this.arr.data[idx] as number;
    }

    /**
     * 将索引为idx的元素设为val
     * @param idx 索引
     * @param val 新值
     */
    public async set(idx: number, val: number): Promise<void> {
        if (idx < 0 || idx >= this.arr.sz) {
            messageController.message(ErrorMessage.INDEX_OUT_OF_RANGE, MessageType.ERROR);
            return;
        }

        messageController.message("修改数据", MessageType.INFO);
        ArrayList._set_value(this.arr, idx, val);

        messageController.message(SuccessMessage.SET_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 将val插入到索引为idx的元素之前
     * @param idx 索引
     * @param val 待插入的值
     */
    public async insert(idx: number, val: number): Promise<void> {
        if (idx < 0 || idx > this.arr.sz) {
            messageController.message(ErrorMessage.INDEX_OUT_OF_RANGE, MessageType.ERROR);
            return;
        }
        if (this.arr.sz === this.arr.data.length) {
            messageController.message("扩容", MessageType.INFO);
            await this.expand();
        }
        await stepController.wait();

        messageController.message("将元素向后移动", MessageType.INFO);
        for (let i = this.arr.sz; i > idx; --i) {
            ArrayList._swap_value(this.arr, i, this.arr, i - 1);
        }
        ++this.arr.sz;
        await stepController.wait();

        messageController.message("插入数据", MessageType.INFO);
        ArrayList._set_value(this.arr, idx, val);

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 删除索引为idx的元素
     * @param idx 索引
     */
    public async delete(idx: number): Promise<void> {
        if (idx < 0 || idx >= this.arr.sz) {
            messageController.message(ErrorMessage.INDEX_OUT_OF_RANGE, MessageType.ERROR);
            return;
        }

        messageController.message("将元素向前移动", MessageType.INFO);
        --this.arr.sz;
        for (let i = idx; i < this.arr.sz; ++i) {
            ArrayList._swap_value(this.arr, i, this.arr, i + 1);
        }
        await stepController.wait();

        messageController.message("删除多余元素", MessageType.INFO);
        ArrayList._set_value(this.arr, this.arr.sz, null);

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }
}