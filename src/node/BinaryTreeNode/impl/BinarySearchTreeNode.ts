import { BinaryTreeNode } from "../BinaryTreeNode";

/**
 * 二叉搜索树节点
 */
export class BinarySearchTreeNode extends BinaryTreeNode<BinarySearchTreeNode> {
    constructor(val: number | null,
        left: BinarySearchTreeNode | null,
        right: BinarySearchTreeNode | null) {
        super(val, left, right);
    }
}