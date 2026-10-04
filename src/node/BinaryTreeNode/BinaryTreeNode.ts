import { DataNode } from "../DataNode";

/**
 * 二叉树节点
 */
export class BinaryTreeNode<T extends BinaryTreeNode<T>> extends DataNode {
    public left: T | null;          // 左孩子
    public right: T | null;         // 右孩子

    constructor(
        left: T | null,
        right: T | null
    ) {
        super();
        this.left = left;
        this.right = right;
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
        this.left = null;
        this.right = null;
    }
}