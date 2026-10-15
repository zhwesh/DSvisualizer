import { LinkedNode } from "../LinkedNode";

/**
 * 双向链表节点
 */
export class DoublyLinkedListNode extends LinkedNode<DoublyLinkedListNode> {
    /**
     * 设置当前节点的前驱节点
     * 
     * 动画效果：当前节点前驱指针指向last
     * 
     * @param last 前驱节点
     */
    public _set_last(last: DoublyLinkedListNode | null): void {
        this.last = last;
    }

    /**
     * 删除当前节点
     * 
     * 动画效果：当前节点消失
     */
    public _delete(): void {
        this.val = null;
        this.next = null;
        this.last = null;
    }

    /************************************************** */

    public last: DoublyLinkedListNode | null;

    constructor(val: number | null,
        next: DoublyLinkedListNode | null,
        last: DoublyLinkedListNode | null) {
        super(val, next);
        this.last = last;
    }
}