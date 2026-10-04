import { DataNode } from "../DataNode";

/**
 * 二叉搜索树节点
 */
export class BinarySearchTreeNode<T extends BinarySearchTreeNode<T> = BinarySearchTreeNode<any>> extends DataNode {
    public val: number | null;      // 节点的值
    public left: T | null;          // 左孩子
    public right: T | null;         // 右孩子

    constructor(
        val: number | null,
        left: T | null,
        right: T | null
    ) {
        super();
        this.val = val;
        this.left = left;
        this.right = right;
    }

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
     * 设置当前节点的左孩子
     * 
     * 动画效果：令当前节点左孩子指向left
     * 
     * @param left 要设置的左孩子
     */
    public _set_left(left: T | null): void {
        this.left = left;
    }

    /**
     * 设置当前节点的右孩子
     * 
     * 动画效果：令当前节点左孩子指向right
     * 
     * @param right 要设置的右孩子
     */
    public _set_right(right: T | null): void {
        this.right = right;
    }

    /**
     * 删除当前节点
     * 
     * 动画效果：当前节点消失
     */
    public _delete(): void {
        this.val = null;
        this.left = null;
        this.right = null;
    }
}