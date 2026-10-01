import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { DataNode } from "../DataNode";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 链表节点
 */
export class LinkedDequeNode extends DataNode {
    public val: number | null;
    public next: LinkedDequeNode | null;
    public last: LinkedDequeNode | null;

    constructor(val: number | null,
        next: LinkedDequeNode | null,
        last: LinkedDequeNode | null) {
        super();
        this.val = val;
        this.next = next;
        this.last = last;
    }
}

/**
 * 双端队列（双向循环链表实现）
 */
export class LinkedDeque {
    /**
     * 设置节点的值
     * 
     * 动画效果：改变节点值
     * 
     * @param node 待修改节点
     * @param val 新值
     */
    public static _set_value(node: LinkedDequeNode, val: number): void {
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
    public static _set_next(node: LinkedDequeNode, next: LinkedDequeNode | null): void {
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
    public static _set_last(node: LinkedDequeNode, last: LinkedDequeNode | null): void {
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
    public static _create_node(val: number | null): LinkedDequeNode {
        return new LinkedDequeNode(val, null, null);
    }

    /**
     * 删除节点
     * 
     * 动画效果：对应节点消失
     * 
     * @param node 要删除的节点
     */
    public static _delete_node(node: LinkedDequeNode): void {
        node.next = node.last = null;
    }

    /**
     * 清空队列
     * 
     * 动画效果：队列linkedDeque消失
     * 
     * @param linkedDeque 要清空的队列
     */
    public static _clear(linkedDeque: LinkedDeque): void {
        LinkedDeque._set_next(linkedDeque.head, linkedDeque.head);
        LinkedDeque._set_last(linkedDeque.head, linkedDeque.head);
        linkedDeque.sz = 0;
    }
    
    /************************************************** */

    private head: LinkedDequeNode;
    private sz: number;

    constructor() {
        this.head = LinkedDeque._create_node(null);
        LinkedDeque._set_next(this.head, this.head);
        LinkedDeque._set_last(this.head, this.head);
        this.sz = 0;
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.sz === 0;
    }

    // 元素个数
    public size(): number {
        return this.sz;
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
        return this.head.next!.val!;
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
        return this.head.last!.val!;
    }

    /**
     * 将val添加至队首
     * @param val 新值
     */
    public async addFirst(val: number): Promise<void> {
        messageController.message("创建节点", MessageType.INFO);
        let node = LinkedDeque._create_node(val);
        await stepController.wait();

        messageController.message("链接节点", MessageType.INFO);
        LinkedDeque._set_next(node, this.head.next);
        LinkedDeque._set_last(node, this.head);
        await stepController.wait();

        LinkedDeque._set_last(this.head.next!, node);
        LinkedDeque._set_next(this.head, node);
        await stepController.wait();

        ++this.sz;

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 将val添加至队尾
     * @param val 新值
     */
    public async addLast(val: number): Promise<void> {
        messageController.message("创建节点", MessageType.INFO);
        let node = LinkedDeque._create_node(val);
        await stepController.wait();

        messageController.message("链接节点", MessageType.INFO);
        LinkedDeque._set_next(node, this.head);
        LinkedDeque._set_last(node, this.head.last);
        await stepController.wait();

        LinkedDeque._set_next(this.head.last!, node);
        LinkedDeque._set_last(this.head, node);
        await stepController.wait();

        ++this.sz;

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

        messageController.message("删除节点", MessageType.INFO);
        const node = this.head.next!;
        LinkedDeque._set_last(this.head.next!.next!, this.head);
        LinkedDeque._set_next(this.head, this.head.next!.next);
        await stepController.wait();

        LinkedDeque._delete_node(node);
        await stepController.wait();

        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 弹出队尾
     */
    public async pollLast(): Promise<void> {
        if (this.isEmpty()) {
            messageController.message("队列为空", MessageType.ERROR);
            return;
        }

        messageController.message("删除节点", MessageType.INFO);
        const node = this.head.last!;
        LinkedDeque._set_next(this.head.last!.last!, this.head);
        LinkedDeque._set_last(this.head, this.head.last!.last);
        await stepController.wait();
        
        LinkedDeque._delete_node(node);
        await stepController.wait();
        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }

    // 清除所有元素
    public clear() {
        LinkedDeque._clear(this);

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }
}