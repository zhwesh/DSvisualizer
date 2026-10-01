import { LinkedNode } from "../LinkedNode";

/**
 * 循环链表节点
 */
export class CircularLinkedListNode extends LinkedNode<CircularLinkedListNode> {
    constructor(val: number | null, next: CircularLinkedListNode | null) {
        super(val, next);
    }
}