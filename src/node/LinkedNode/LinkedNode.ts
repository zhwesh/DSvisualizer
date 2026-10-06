import { DataNode } from "../DataNode";

export class LinkedNode<T extends LinkedNode<T>> extends DataNode {
    /**
     * 设置当前节点的值
     * 
     * 动画效果：改变当前节点的值
     * 
     * @param val 新值
     */
    public _set_value(val: number | null): void {
        this.val = val;
    }

    /**
     * 设置当前节点的后继节点
     * 
     * 动画效果：令当前节点指向next
     * 
     * @param next 后继节点
     */
    public _set_next(next: T | null): void {
        this.next = next;
    }

    /**
     * 删除当前节点
     * 
     * 动画效果：当前节点消失
     */
    public _delete(): void {
        this.val = null;
        this.next = null;
    }

    /************************************************** */

    // 节点的值（当值为null时不显示）
    public val: number | null;
    // 后继节点
    public next: T | null;

    constructor(val: number | null, next: T | null) {
        super();
        this.val = val;
        this.next = next;
    }
}