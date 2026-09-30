import { ErrorMessage, MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { DataNode } from "../DataNode";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 单链表节点
 */
export class ListNode extends DataNode {
    public val: number;
    public next: ListNode | null;

    constructor(val: number, next: ListNode | null) {
        super();
        this.val = val;
        this.next = next;
    }
}

/**
 * 线性表（单链表实现）
 */
export class LinkedList {
    /**
     * 设置节点的值
     * 
     * 动画效果：改变节点值
     * 
     * @param node 待修改节点
     * @param val 新值
     */
    public static _set_value(node: ListNode, val: number): void {
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
    public static _set_next(node: ListNode, next: ListNode | null): void {
        node.next = next;
    }

    /**
     * 创建新节点
     * 
     * 动画效果：出现一个新节点
     * 
     * @param val 新节点的值
     * @returns 新节点
     */
    public static _create_node(val: number): ListNode {
        return new ListNode(val, null);
    }

    /**
     * 删除节点
     * 
     * 动画效果：对应节点消失
     * 
     * @param node 要删除的节点
     */
    public static _delete_node(node: ListNode): void {
        node.next = null;
    }

    /**
     * 清空链表
     * 
     * 动画效果：以head为头节点的链表消失
     * 
     * @param head 链表头节点
     */
    public static _clear(head: ListNode | null): void { }

    /************************************************** */

    private head: ListNode | null;
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
        LinkedList._clear(this.head);
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
    private getNode(idx: number): ListNode | null {
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

        LinkedList._set_value(node, val);
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
        let p: ListNode | null = null, q = this.head;
        while (idx-- > 0) {
            p = q;
            q = q!.next;
        }
        await stepController.wait();

        messageController.message("创建新节点", MessageType.INFO);
        let newNode = LinkedList._create_node(val);
        await stepController.wait();

        messageController.message("链接节点", MessageType.INFO);
        LinkedList._set_next(newNode, q);
        await stepController.wait();

        if (p != null) {
            LinkedList._set_next(p, newNode);
        } else {
            this.head = newNode;
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
        let p: ListNode | null = null, q: ListNode = this.head!;
        while (idx-- > 0) {
            p = q;
            q = q.next!;
        }
        await stepController.wait();

        messageController.message("删除节点", MessageType.INFO);
        if (p != null) {
            LinkedList._set_next(p, q.next);
        } else {
            this.head = q.next;
        }
        await stepController.wait();
        
        LinkedList._delete_node(q);
        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }
}