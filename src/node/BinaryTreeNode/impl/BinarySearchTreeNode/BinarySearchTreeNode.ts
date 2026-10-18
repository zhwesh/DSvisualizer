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

    /**
     * 设置节点是否为当前高亮节点
     * 
     * 动画效果：visited为真时在节点外圈显示高亮环，否则取消外圈
     * 
     * @param visited 是否高亮
     */
    public _set_visited(visited: boolean): void {
        this.visited = visited;
    }

    /************************************************** */

    public val: number | null;
    public visited: boolean;    // 当前节点高亮标记（外圈）

    constructor(
        val: number | null,
        left: T | null,
        right: T | null
    ) {
        super(left, right);
        this.val = val;
        this.visited = false;
    }
}