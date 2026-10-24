import { ArrayNode } from "../ArrayNode";

/**
 * 队列数组节点
 */
export class ArrayQueueNode extends ArrayNode {
    /**
     * 设置队首指针
     * 
     * 动画效果：队首指针指向data[head]
     * 
     * @param head 队首指针索引
     */
    public _set_head(head: number): void {
        this.head = head;
    }

    /**
     * 设置队尾指针
     * 
     * 动画效果：队尾指针指向data[tail]
     * 
     * @param tail 队尾指针索引
     */
    public _set_tail(tail: number): void {
        this.tail = tail;
    }

    /************************************************** */

    // 队首指针
    public head: number;
    // 队尾指针
    public tail: number;

    constructor(data: (number | null)[]) {
        super(data);
        this.head = this.tail = 0;
    }
}