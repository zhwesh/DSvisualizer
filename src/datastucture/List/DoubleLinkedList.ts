import { ErrorMessage, MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { DoublyLinkedListNode } from "../../node/LinkedNode/impl/DoublyLinkedNode"
import { create } from "../../node/factory";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 线性表（双向链表实现）
 */
export class DoubleLinkedList {
    private head: DoublyLinkedListNode | null;
    private sz: number;

    constructor() {
        this.head = null;
        this.sz = 0;
    }

    // 清除所有元素
    public clear(): void {
        if (this.head === null) {
            messageController.message("链表已经为空", MessageType.WARNING);
            return;
        }

        messageController.message("清除所有元素", MessageType.INFO);
        this.head = null;
        this.sz = 0;

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

    // 获取索引为idx的节点
    private getNode(idx: number): DoublyLinkedListNode | null {
        if (idx < 0 || idx >= this.sz) {
            messageController.message(ErrorMessage.INDEX_OUT_OF_RANGE, MessageType.ERROR);
            return null;
        }
        let tmp = this.head!;
        while (idx-- > 0) {
            tmp = tmp.next!;
        }
        return tmp;
    }

    /**
     * 获取索引为idx的元素
     * @param idx 索引
     * @returns 值
     */
    public async get(idx: number): Promise<number | null> {
        const node = this.getNode(idx);
        if (node === null) {
            return null;
        }
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return node.val;
    }

    /**
     * 将索引为idx的元素设为val
     * @param idx 索引
     * @param val 新值
     */
    public async set(idx: number, val: number): Promise<void> {
        const node = this.getNode(idx);
        if (node === null) {
            return;
        }

        node._set_value(val);
        messageController.message(SuccessMessage.SET_SUCCESS, MessageType.SUCCESS);
    }

    // 将val插入到索引为idx的元素之前
    public async insert(idx: number, val: number): Promise<void> {
        if (idx < 0 || idx > this.sz) {
            messageController.message(ErrorMessage.INDEX_OUT_OF_RANGE, MessageType.ERROR);
            return;
        }

        messageController.message("查找节点", MessageType.INFO);
        let last: DoublyLinkedListNode | null = null,
            next = this.head;
        while (idx-- > 0) {
            last = next;
            next = next!.next;
        }
        await stepController.wait();
        
        messageController.message("创建新节点", MessageType.INFO);
        let node = create(DoublyLinkedListNode, val, null, null);
        await stepController.wait();

        messageController.message("链接节点", MessageType.INFO);
        node._set_next(next);
        await stepController.wait();

        node._set_last(last);
        await stepController.wait();

        if (last != null) {
            last._set_next(node);
        } else {
            this.head = node;
        }
        await stepController.wait();
        
        if (next != null) {
            next._set_last(node);
        }
        
        ++this.sz;

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 删除索引为idx的元素
     * @param idx 索引
     */
    public async delete(idx: number): Promise<void> {
        if (idx < 0 || idx >= this.sz) {
            messageController.message(ErrorMessage.INDEX_OUT_OF_RANGE, MessageType.ERROR);
            return;
        }

        messageController.message("查找节点", MessageType.INFO);
        let p = this.getNode(idx)!;
        await stepController.wait();

        messageController.message("删除节点", MessageType.INFO);
        if (p.last != null) {
            p.last._set_next(p.next);
        } else {
            this.head = p.next;
        }
        await stepController.wait();

        if (p.next != null) {
            p.next._set_last(p.last);
        }
        await stepController.wait();
        
        p._delete();
        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }
}