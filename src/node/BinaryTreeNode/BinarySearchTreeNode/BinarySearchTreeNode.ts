import { BinaryTreeNode } from "../BinaryTreeNode";

/**
 * 二叉搜索树节点
 */
export class BinarySearchTreeNode<T extends BinarySearchTreeNode<T>>
    extends BinaryTreeNode<T> {
    constructor(
        val: number | null,
        left: T | null,
        right: T | null
    ) {
        super(val, left, right);
    }
}