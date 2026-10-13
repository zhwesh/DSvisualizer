import { BinaryTreeNode } from "../../BinaryTreeNode";

/**
 * 二叉搜索树节点
 */
export class BinarySearchTreeNode<T extends BinarySearchTreeNode<T>>
    extends BinaryTreeNode<T> {
    /**
     * 设置节点的值
     * @param val 要设置的值
     */
    public _set_value(val: number | null): void {
        this.val = val;
    }

    /**
     * 设置节点高亮（查找时当前节点变绿）
     * @param visited 是否高亮
     */
    public _set_visited(visited: boolean): void {
        this.visited = visited;
    }

    /************************************************** */

    public val: number | null;
    public visited: boolean = false;    // 查找高亮标记

    constructor(
        val: number | null,
        left: T | null,
        right: T | null
    ) {
        super(left, right);
        this.val = val;
    }
}