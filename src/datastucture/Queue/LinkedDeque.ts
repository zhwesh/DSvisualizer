import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { LinkedDequeNode } from "../../node/LinkedNode/impl/LinkedDequeNode";
import { create } from "../../node/factory"

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 双端队列（双向循环链表实现）
 */
export class LinkedDeque {
    private head: LinkedDequeNode;
    private sz: number;

    constructor() {
        this.head = create(LinkedDequeNode, null, null, null);
        this.head._set_next(this.head);
        this.head._set_last(this.head);
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
        let node = create(LinkedDequeNode, val, null, null);
        await stepController.wait();

        messageController.message("链接节点", MessageType.INFO);
        node._set_next(this.head.next);
        node._set_last(this.head);
        await stepController.wait();

        this.head.next!._set_last(node);
        this.head._set_next(node);
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
        let node = create(LinkedDequeNode, val, null, null);
        await stepController.wait();

        messageController.message("链接节点", MessageType.INFO);
        node._set_next(this.head);
        node._set_last(this.head.last);
        await stepController.wait();

        this.head.last!._set_next(node);
        this.head._set_last(node);
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
        this.head.next!.next!._set_last(this.head);
        this.head._set_next(this.head.next!.next);
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

        messageController.message("删除节点", MessageType.INFO);
        const node = this.head.last!;
        this.head.last!.last!._set_next(this.head);
        this.head._set_last(this.head.last!.last);
        await stepController.wait();
        
        node._delete();
        await stepController.wait();
        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }

    // 清除所有元素
    public clear() {
        this.head._set_next(this.head);
        this.head._set_last(this.head);
        this.sz = 0;

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }
}