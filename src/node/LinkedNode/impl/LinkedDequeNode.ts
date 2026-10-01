import { LinkedNode } from "../LinkedNode";

/**
 * 双端队列链表节点
 */
export class LinkedDequeNode extends LinkedNode<LinkedDequeNode> {
    /**
     * 设置当前节点的前驱节点
     * 
     * 动画效果：当前节点指向last
     * 
     * @param last 前驱节点
     */
    public _set_last(last: LinkedDequeNode | null): void {
        this.last = last;
    }

    /************************************************** */

    public last: LinkedDequeNode | null;

    constructor(val: number | null,
        next: LinkedDequeNode | null,
        last: LinkedDequeNode | null) {
        super(val, next);
        this.last = last;
    }
}