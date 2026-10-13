import { LinkedNode } from "../LinkedNode";

/**
 * 单链表节点
 */
export class SinglyLinkedNode extends LinkedNode<SinglyLinkedNode> {
    constructor(val: number | null, next: SinglyLinkedNode | null) {
        super(val, next);
    }
}