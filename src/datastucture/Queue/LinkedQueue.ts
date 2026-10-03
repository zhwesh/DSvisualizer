import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { SinglyLinkedNode } from "../../node/LinkedNode/impl/SinglyLinkedNode";
import { create } from "../../node/factory"

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 普通队列（单链表实现）
 */
export class LinkedQueue {
    /**
     * 设置哨兵节点
     * @param header 要设置的哨兵节点
     */
    public _set_header(header: SinglyLinkedNode) {
        this.header = header;
    }

    /**
     * 设置队尾指针
     * @param tail 要设置的队尾指针
     */
    public _set_tail(tail: SinglyLinkedNode) {
        this.tail = tail;
    }

    /************************************************** */

    private header!: SinglyLinkedNode;
    private tail!: SinglyLinkedNode;
    private sz: number;

    constructor() {
        let node = create(SinglyLinkedNode, null, null);
        this._set_header(node);
        this._set_tail(node);
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
    public async peek(): Promise<number | null> {
        if (this.isEmpty()) {
            messageController.message("队列为空", MessageType.ERROR);
            return null;
        }

        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return this.header.next!.val!;
    }

    /**
     * 将val添加至队尾
     * @param val 新值
     */
    public async add(val: number): Promise<void> {
        messageController.message("创建节点", MessageType.INFO);
        let node = create(SinglyLinkedNode, val, null);
        await stepController.wait();

        messageController.message("链接节点", MessageType.INFO);
        this.tail._set_next(node);
        this._set_tail(node);
        await stepController.wait();

        ++this.sz;

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 弹出队首
     */
    public async poll(): Promise<void> {
        if (this.isEmpty()) {
            messageController.message("队列为空", MessageType.ERROR);
            return;
        }

        messageController.message("删除节点", MessageType.INFO);
        const node = this.header.next!;
        this.header._set_next(node.next);
        await stepController.wait();

        node._delete();
        await stepController.wait();

        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }

    // 清除所有元素
    public clear() {
        this.header._set_next(this.header);
        this._set_tail(this.header);
        this.sz = 0;

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }
}