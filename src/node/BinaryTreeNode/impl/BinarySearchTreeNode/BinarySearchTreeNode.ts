import { BinaryTreeNode } from "../../BinaryTreeNode";

/**
 * 二叉搜索树节点
 */
export class BinarySearchTreeNode<T extends BinarySearchTreeNode<T>>
    extends BinaryTreeNode<T> {
    /**
     * 设置节点的值
     * 
     * 动画效果：节点值更新为val
     * 
     * @param val 要设置的值
     */
    public _set_value(val: number | null): void {
        this.val = val;
    }

    /************************************************** */

    public val: number | null;

    constructor(
        val: number | null,
        left: T | null,
        right: T | null
    ) {
        super(left, right);
        this.val = val;
    }
}