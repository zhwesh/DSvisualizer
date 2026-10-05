import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { SinglyLinkedNode } from "../../node/LinkedNode/impl/SinglyLinkedNode";
import { create } from "../../node/factory";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 栈（单链表实现）
 */
export class LinkedStack {
    /**
     * 设置栈顶指针
     * @param head 要设置的栈顶指针
     */
    public _set_head(head: SinglyLinkedNode | null): void {
        this.head = head;
    }

    /**
     * 动画效果：清空栈并让栈顶指针消失
     */
    public _clear(): void {
        this._set_head(null);
        this.sz = 0;
    }

    /************************************************** */

    private head: SinglyLinkedNode | null;
    private sz: number;

    constructor() {
        this.head = null;
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

    // 清除所有元素
    public clear(): void {
        if (this.isEmpty()) {
            messageController.message("栈已经为空", MessageType.WARNING);
            return;
        }

        this._clear();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 获取栈顶
     * @returns 栈顶元素
     */
    public async top(): Promise<number | null> {
        if (this.isEmpty()) {
            messageController.message("栈为空", MessageType.ERROR);
            return null;
        }

        await stepController.wait();
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return this.head!.val;
    }

    /**
     * 弹出栈顶 
     */
    public async pop(): Promise<void> {
        if (this.isEmpty()) {
            messageController.message("栈为空", MessageType.ERROR);
            return;
        }

        await stepController.wait();
        messageController.message("删除节点", MessageType.INFO);
        let node = this.head!;
        this._set_head(this.head!.next);
        node._delete();
        --this.sz;
        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 将val入栈
     * @param val 新值
     */
    public async push(val: number): Promise<void> {
        await stepController.wait();
        messageController.message("创建节点", MessageType.INFO);
        let node = create(SinglyLinkedNode, val, null);

        await stepController.wait();
        messageController.message("链接节点", MessageType.INFO);
        node._set_next(this.head);
        this._set_head(node);
        ++this.sz;

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }
}