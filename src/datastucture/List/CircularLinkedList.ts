import { ErrorMessage, MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { CircularLinkedListNode } from "../../node/LinkedNode/impl/CircularLinkedNode"
import { create } from "../../node/factory";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 线性表（循环链表实现）
 */
export class CircularLinkedList {
    private head: CircularLinkedListNode;   // 哨兵节点，不储存数据
    private sz: number;

    constructor() {
        this.head = new CircularLinkedListNode(null, null);
        this.head.next = this.head;
        this.sz = 0;
    }

    // 清除所有元素
    public clear(): void {
        if (this.head.next === this.head) {
            messageController.message("链表已经为空", MessageType.WARNING);
            return;
        }

        messageController.message("清除所有元素", MessageType.INFO);
        this.head.next = this.head;
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
    private getNode(idx: number): CircularLinkedListNode | null {
        if (idx < 0 || idx >= this.sz) {
            messageController.message(ErrorMessage.INDEX_OUT_OF_RANGE, MessageType.ERROR);
            return null;
        }
        let tmp = this.head.next!;
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

    /**
     * 将val插入到索引为idx的元素之前
     * @param idx 索引
     * @param val 新值
     */
    public async insert(idx: number, val: number): Promise<void> {
        if (idx < 0 || idx > this.sz) {
            messageController.message(ErrorMessage.INDEX_OUT_OF_RANGE, MessageType.ERROR);
            return;
        }

        messageController.message("查找节点", MessageType.INFO);
        let p: CircularLinkedListNode = this.head, q = this.head.next;
        while (idx-- > 0) {
            p = q!;
            q = q!.next;
        }
        await stepController.wait();

        messageController.message("创建新节点", MessageType.INFO);
        let newNode = create(CircularLinkedListNode, val, null);
        await stepController.wait();

        messageController.message("链接节点", MessageType.INFO);
        newNode._set_next(q);
        await stepController.wait();

        p._set_next(newNode);
        
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
        let p = this.head;
        while (idx-- > 0) {
            p = p.next!;
        }
        await stepController.wait();

        messageController.message("删除节点", MessageType.INFO);
        let q = p.next!;
        p._set_next(q.next);
        await stepController.wait();

        q._delete();
        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }
}