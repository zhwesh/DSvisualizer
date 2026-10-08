import { ArrayNode } from "../ArrayNode";

/**
 * 栈数组节点
 */
export class ArrayStackNode extends ArrayNode {
    /**
     * 设置栈顶指针
     * 
     * 动画效果：栈顶指针指向data[top]
     * 
     * @param top 栈顶指针索引
     */
    public _set_top(top: number | null): void {
        this.top = top;
    }

    /************************************************** */

    // 栈顶指针（当值为null时不显示）
    public top: number | null;

    constructor(data: (number | null)[]) {
        super(data);
        this.top = null;
    }
}