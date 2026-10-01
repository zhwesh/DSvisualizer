import { ArrayNode } from "../ArrayNode";

/**
 * 双端队列的数组节点
 */
export class ArrayDequeNode extends ArrayNode {
    // 队首指针（当值为null时不显示）
    private head: number | null;
    // 队尾指针（当值为null时不显示）
    private tail: number | null;

    constructor(data: (number | null)[]) {
        super(data);
        this.head = this.tail = null;
    }

    /**
     * 设置队首指针
     * @param head 队首指针索引
     */
    public _set_head(head: number): void {
        this.head = head;
    }

    /**
     * 设置队尾指针
     * @param tail 队尾指针索引
     */
    public _set_tail(tail: number): void {
        this.tail = tail;
    }

    /************************************************** */

    // 获取队首指针
    public getHead(): number | null {
        return this.head;
    }

    // 获取队尾指针
    public getTail(): number | null {
        return this.tail;
    }
}