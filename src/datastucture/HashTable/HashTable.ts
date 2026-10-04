import { HashTableNode } from "../../node/LinkedNode/impl/HashTableNode";
import { create } from "../../node/factory";
import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 哈希表（链地址法实现）
 * 
 * 数字键的哈希值取键本身
 * 桶索引 = (桶数组长度 - 1) & 哈希值
 */
export class HashTable {
    /**
     * 设置桶数组
     * @param arr 新的桶数组
     */
    public _set_array(arr: (HashTableNode | null)[]): void {
        this.arr = arr;
    }

    /**
     * 设置索引为idx的桶
     * @param idx 桶索引
     * @param node 桶的头节点
     */
    public _set_bucket(idx: number, node: HashTableNode | null): void {
        this.arr[idx] = node;
    }

    /**
     * 动画效果：清空哈希表
     */
    public _clear(): void {
        this._set_array(new Array(16).fill(null));
        this.usedCap = 0;
        this.sz = 0;
    }

    /************************************************** */

    // 桶数组
    private arr!: (HashTableNode | null)[];
    // 已用桶数量（非空桶个数）
    private usedCap: number;
    // 键数量
    private sz: number;

    constructor() {
        this._set_array(new Array(16).fill(null));
        this.usedCap = 0;
        this.sz = 0;
    }

    /**
     * 双倍扩容并重新散列
     */
    private async expand(): Promise<void> {
        const oldArr = this.arr;

        await stepController.wait();
        messageController.message("创建双倍大小的新桶数组", MessageType.INFO);
        this._set_array(new Array(oldArr.length << 1).fill(null));
        this.usedCap = 0;

        for (let i = 0; i < oldArr.length; ++i) {
            let node = oldArr[i];
            while (node !== null) {
                const next = node.next;
                const idx = (this.arr.length - 1) & node.hash;

                await stepController.wait();
                messageController.message(
                    "将键" + node.val + "重新散列到桶" + idx,
                    MessageType.INFO
                );
                node._set_next(null);
                let tail = this.arr[idx];
                if (tail === null) {
                    this._set_bucket(idx, node);
                    ++this.usedCap;
                } else {
                    while (tail.next !== null) {
                        tail = tail.next;
                    }
                    tail._set_next(node);
                }
                node = next;
            }
        }
    }

    // 清除所有键
    public clear(): void {
        if (this.sz === 0) {
            messageController.message("哈希表已经为空", MessageType.WARNING);
            return;
        }

        this._clear();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.sz === 0;
    }

    // 键数量
    public size(): number {
        return this.sz;
    }

    /**
     * 查找键key是否存在
     * @param key 要查找的键
     * @returns 键是否存在
     */
    public async contains(key: number): Promise<boolean> {
        const idx = (this.arr.length - 1) & key;

        await stepController.wait();
        messageController.message("哈希值为" + key + "，对应桶" + idx, MessageType.INFO);

        let node = this.arr[idx];
        while (node !== null) {
            await stepController.wait();
            if (node.val === key) {
                messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
                return true;
            }
            messageController.message(
                "键" + node.val + "不等于" + key + "，继续查找下一个节点",
                MessageType.INFO
            );
            node = node.next;
        }

        messageController.message("键'" + key + "'不存在", MessageType.WARNING);
        return false;
    }

    /**
     * 插入键key
     * @param key 要插入的键
     * @returns 是否插入成功（键已存在时返回false）
     */
    public async add(key: number): Promise<boolean> {
        if (this.usedCap > this.arr.length * 0.75) {
            await stepController.wait();
            messageController.message("已用桶比例超过75%，扩容", MessageType.INFO);
            await this.expand();
        }

        const idx = (this.arr.length - 1) & key;

        await stepController.wait();
        messageController.message("哈希值为" + key + "，对应桶" + idx, MessageType.INFO);

        let node = this.arr[idx];
        let prev: HashTableNode | null = null;
        while (node !== null) {
            await stepController.wait();
            if (node.val === key) {
                messageController.message("键'" + key + "'已存在", MessageType.WARNING);
                return false;
            }
            messageController.message(
                "键" + node.val + "不等于" + key + "，继续查找下一个节点",
                MessageType.INFO
            );
            prev = node;
            node = node.next;
        }

        await stepController.wait();
        messageController.message("创建新节点", MessageType.INFO);
        node = create(HashTableNode, key, key, null);

        await stepController.wait();
        messageController.message("将新节点链接到桶" + idx, MessageType.INFO);
        if (prev === null) {
            this._set_bucket(idx, node);
            ++this.usedCap;
        } else {
            prev._set_next(node);
        }
        ++this.sz;

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
        return true;
    }

    /**
     * 删除键key
     * @param key 要删除的键
     * @returns 是否删除成功（键不存在时返回false）
     */
    public async remove(key: number): Promise<boolean> {
        const idx = (this.arr.length - 1) & key;

        await stepController.wait();
        messageController.message("哈希值为" + key + "，对应桶" + idx, MessageType.INFO);

        let node = this.arr[idx];
        let prev: HashTableNode | null = null;
        while (node !== null && node.val !== key) {
            await stepController.wait();
            messageController.message(
                "键" + node.val + "不等于" + key + "，继续查找下一个节点",
                MessageType.INFO
            );
            prev = node;
            node = node.next;
        }
        if (node === null) {
            messageController.message("键'" + key + "'不存在", MessageType.WARNING);
            return false;
        }

        await stepController.wait();
        messageController.message("删除节点", MessageType.INFO);
        if (prev === null) {
            this._set_bucket(idx, node.next);
            if (node.next === null) {
                --this.usedCap;
            }
        } else {
            prev._set_next(node.next);
        }

        await stepController.wait();
        node._delete();
        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
        return true;
    }
}
