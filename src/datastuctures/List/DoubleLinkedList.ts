import { ErrorMessage, MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";

/**
 * 双向链表节点
 */
export class DoubleLinkedListNode {
    val: number;
    next: DoubleLinkedListNode | null;
    last: DoubleLinkedListNode | null;

    constructor(val: number,
        next: DoubleLinkedListNode | null,
        last: DoubleLinkedListNode | null) {
        this.val = val;
        this.next = next;
        this.last = last;
    }
}

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 线性表（双向链表实现）
 */
export class DoubleLinkedList {
    /**
     * 设置节点的值
     * 
     * 动画效果：改变节点值
     * 
     * @param node 待修改节点
     * @param val 新值
     */
    public static _set_value(node: DoubleLinkedListNode, val: number): void {
        node.val = val;
    }

    /**
     * 设置某节点的后继节点
     * 
     * 动画效果：node指向next
     * 
     * @param node 待修改节点
     * @param next 后继节点
     */
    public static _set_next(node: DoubleLinkedListNode,
        next: DoubleLinkedListNode | null): void {
        node.next = next;
    }

    /**
     * 设置某节点的前驱节点
     * 
     * 动画效果：node指向last
     * 
     * @param node 待修改节点
     * @param last 前驱节点
     */
    public static _set_last(node: DoubleLinkedListNode,
        last: DoubleLinkedListNode | null): void {
        node.last = last;
    }

    /**
     * 创建新节点
     * 
     * 动画效果：出现一个新节点
     * 
     * @param val 新节点的值
     * @returns 新节点
     */
    public static _create_node(val: number) {
        return new DoubleLinkedListNode(val, null, null);
    }

    /**
     * 删除节点
     * 
     * 动画效果：对应节点消失
     * 
     * @param node 要删除的节点
     */
    public static _delete_node(node: DoubleLinkedListNode): void {
        node.next = node.last = null;
    }

    /**
     * 清空链表
     * 
     * 动画效果：链表清空
     * 
     * @param doubleLinkedList 要清空的链表
     */
    public static _clear(doubleLinkedList: DoubleLinkedList) {
        doubleLinkedList.head = null;
        doubleLinkedList.sz = 0;
    }

    /************************************************** */

    private head: DoubleLinkedListNode | null;
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
        DoubleLinkedList._clear(this);

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
    private getNode(idx: number): DoubleLinkedListNode | null {
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

        DoubleLinkedList._set_value(node, val);
        messageController.message(SuccessMessage.SET_SUCCESS, MessageType.SUCCESS);
    }

    // 将val插入到索引为idx的元素之前
    public async insert(idx: number, val: number): Promise<void> {
        if (idx < 0 || idx > this.sz) {
            messageController.message(ErrorMessage.INDEX_OUT_OF_RANGE, MessageType.ERROR);
            return;
        }

        messageController.message("查找节点", MessageType.INFO);
        let last: DoubleLinkedListNode | null = null,
            next = this.head;
        while (idx-- > 0) {
            last = next;
            next = next!.next;
        }
        await stepController.wait();
        
        messageController.message("创建新节点", MessageType.INFO);
        let node = DoubleLinkedList._create_node(val);
        await stepController.wait();

        messageController.message("链接节点", MessageType.INFO);
        DoubleLinkedList._set_next(node, next);
        await stepController.wait();

        DoubleLinkedList._set_last(node, last);
        await stepController.wait();

        if (last != null) {
            DoubleLinkedList._set_next(last, node);
        } else {
            this.head = node;
        }
        await stepController.wait();
        
        if (next != null) {
            DoubleLinkedList._set_last(next, node);
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
            DoubleLinkedList._set_next(p.last, p.next);
        } else {
            this.head = p.next;
        }
        await stepController.wait();

        if (p.next != null) {
            DoubleLinkedList._set_last(p.next, p.last);
        }
        await stepController.wait();
        
        DoubleLinkedList._delete_node(p);
        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }
}