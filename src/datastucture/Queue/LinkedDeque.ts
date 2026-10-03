import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { DoublyLinkedListNode } from "../../node/LinkedNode/impl/DoublyLinkedNode";
import { create } from "../../node/factory"

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 双端队列（双向循环链表实现）
 */
export class LinkedDeque {
    /**
     * 设置哨兵节点
     * @param header 要设置的哨兵节点
     */
    public _set_header(header: DoublyLinkedListNode): void {
        this.header = header;
    }

    /**
     * 动画效果：清空队列（令哨兵节点前后指针指向自己）
     */
    public async _clear(): Promise<void> {
        this.header._set_next(this.header);
        this.header._set_last(this.header);
        this.sz = 0;
    }

    /************************************************** */

    private header!: DoublyLinkedListNode;
    private sz: number;

    constructor() {
        this._set_header(create(DoublyLinkedListNode, null, null, null));
        this.header._set_next(this.header);
        this.header._set_last(this.header);
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

        await stepController.wait();
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return this.header.next!.val!;
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

        await stepController.wait();
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return this.header.last!.val!;
    }

    /**
     * 将val添加至队首
     * @param val 新值
     */
    public async addFirst(val: number): Promise<void> {
        messageController.message("创建节点", MessageType.INFO);
        let node = create(DoublyLinkedListNode, val, null, null);

        await stepController.wait();
        messageController.message("链接节点", MessageType.INFO);
        node._set_next(this.header.next);
        node._set_last(this.header);

        await stepController.wait();
        this.header.next!._set_last(node);
        this.header._set_next(node);

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
        let node = create(DoublyLinkedListNode, val, null, null);

        await stepController.wait();
        messageController.message("链接节点", MessageType.INFO);
        node._set_next(this.header);
        node._set_last(this.header.last);

        await stepController.wait();
        this.header.last!._set_next(node);
        this.header._set_last(node);
        
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

        await stepController.wait();
        messageController.message("删除节点", MessageType.INFO);
        const node = this.header.next!;
        this.header.next!.next!._set_last(this.header);
        this.header._set_next(this.header.next!.next);

        await stepController.wait();
        node._delete();

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

        await stepController.wait();
        messageController.message("删除节点", MessageType.INFO);
        const node = this.header.last!;
        this.header.last!.last!._set_next(this.header);
        this.header._set_last(this.header.last!.last);

        await stepController.wait();
        node._delete();
        
        await stepController.wait();
        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }

    // 清除所有元素
    public async clear(): Promise<void> {
        if (this.isEmpty()) {
            messageController.message("队列已经为空", MessageType.WARNING);
            return;
        }

        await this._clear();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }
}