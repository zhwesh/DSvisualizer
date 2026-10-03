import { ArrayNode } from "../ArrayNode";

/**
 * 队列数组节点
 */
export class ArrayQueueNode extends ArrayNode {
    // 队首指针（当值为null时不显示）
    public head: number | null;
    // 队尾指针（当值为null时不显示）
    public tail: number | null;

    constructor(data: (number | null)[]) {
        super(data);
        this.head = this.tail = null;
    }

    /**
     * 设置队首指针
     * @param head 队首指针索引
     */
    public _set_head(head: number | null): void {
        this.head = head;
    }

    /**
     * 设置队尾指针
     * @param tail 队尾指针索引
     */
    public _set_tail(tail: number | null): void {
        this.tail = tail;
    }
}