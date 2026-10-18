import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { ArrayListNode } from "../../node/ArrayNode/impl/ArrayListNode";
import { create } from "../../node/factory"

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 线性表（数组实现）
 */
export class ArrayList {
    /**
     * 动画效果：清空数组
     */
    public _clear(): void {
        this.arr._delete();
        this.sz = 0;
    }

    /************************************************** */

    // 内部数组节点
    private arr: ArrayListNode;
    // 已经使用的大小
    private sz: number;

    constructor() {
        this.arr = create(
            ArrayListNode,
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
            ArrayListNode,
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

    /**
     * 清除所有元素
     */
    public clear(): void {
        if (this.sz === 0) {
            messageController.message("数组已经为空", MessageType.WARNING);
            return;
        }

        this._clear();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 是否为空
     * @returns 是否为空
     */
    public isEmpty(): boolean {
        return this.sz === 0;
    }

    /**
     * 元素个数
     * @returns 元素个数
     */
    public size(): number {
        return this.sz;
    }

    /**
     * 获取索引为idx的元素
     * @param idx 索引
     * @returns 索引为idx的元素
     */
    public async get(idx: number): Promise<number | null> {
        if (idx < 0 || idx >= this.sz) {
            messageController.message("索引越界", MessageType.ERROR);
            return null;
        }

        await stepController.wait();
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return this.arr.data[idx] as number;
    }

    /**
     * 将索引为idx的元素设为val
     * @param idx 索引
     * @param val 新值
     */
    public async set(idx: number, val: number): Promise<void> {
        if (idx < 0 || idx >= this.sz) {
            messageController.message("索引越界", MessageType.ERROR);
            return;
        }

        await stepController.wait();
        messageController.message("修改数据", MessageType.INFO);
        this.arr._set_value(idx, val);

        messageController.message(SuccessMessage.SET_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 将val插入到索引为idx的元素之前
     * @param idx 索引
     * @param val 待插入的值
     */
    public async insert(idx: number, val: number): Promise<void> {
        if (idx < 0 || idx > this.sz) {
            messageController.message("索引越界", MessageType.ERROR);
            return;
        }
        if (this.sz === this.arr.data.length) {
            await stepController.wait();
            messageController.message("数组容量已满，扩容", MessageType.INFO);
            await this.expand();
        }

        await stepController.wait();
        messageController.message("将元素向后移动", MessageType.INFO);
        for (let i = this.sz; i > idx; --i) {
            this.arr._swap_value(i, this.arr, i - 1);
        }
        ++this.sz;

        await stepController.wait();
        messageController.message("插入数据", MessageType.INFO);
        this.arr._set_value(idx, val);

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 删除索引为idx的元素
     * @param idx 索引
     */
    public async delete(idx: number): Promise<void> {
        if (idx < 0 || idx >= this.sz) {
            messageController.message("元素不存在", MessageType.ERROR);
            return;
        }

        await stepController.wait();
        messageController.message("将元素向前移动", MessageType.INFO);
        --this.sz;
        for (let i = idx; i < this.sz; ++i) {
            this.arr._swap_value(i, this.arr, i + 1);
        }

        await stepController.wait();
        messageController.message("删除多余元素", MessageType.INFO);
        this.arr._set_value(this.sz, null);

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }
}