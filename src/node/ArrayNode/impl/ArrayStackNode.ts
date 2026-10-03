import { ArrayNode } from "../ArrayNode";

/**
 * 队列数组节点
 */
export class ArrayStackNode extends ArrayNode {
    // 栈顶指针（当值为null时不显示）
    private top: number | null;

    constructor(data: (number | null)[]) {
        super(data);
        this.top = null;
    }

    /**
     * 设置队首指针
     * @param top 队首指针索引
     */
    public _set_top(top: number | null): void {
        this.top = top;
    }
}