import { BinarySearchTreeNode } from "../BinarySearchTreeNode";

export const RedBlackTree_Red: boolean = true;
export const RedBlackTree_Black: boolean = false;

/**
 * 红黑树节点
 */
export class RedBlackTreeNode extends BinarySearchTreeNode<RedBlackTreeNode> {
    /**
     * 设置当前节点的颜色
     * 
     * 动画效果：令当前节点颜色为color
     * 
     * @param color 要设置的颜色
     */
    public _set_color(color: boolean): void {
        this.color = color;
    }

    /**
     * 交换当前节点与其他节点的颜色
     * 
     * 动画效果：交换当前节点与其他节点的颜色
     * 
     * @param other 另一个节点
     */
    public _swap_color(other: RedBlackTreeNode): void {
        const tmp = other.color;
        other.color = this.color;
        this.color = tmp;
    }

    /**
     * 右旋
     * 
     * 动画效果：对当前节点进行右旋操作
     * 
     * @returns 旋转后的子树根节点
     */
    public _rotate_right(): RedBlackTreeNode {
        const y = this.left!;
        this.left = y.right;
        y.right = this;
        return y;
    }

    /**
     * 左旋
     * 
     * 动画效果：对当前节点进行左旋操作
     * 
     * @returns 旋转后的子树根节点
     */
    public _rotate_left(): RedBlackTreeNode {
        const y = this.right!;
        this.right = y.left;
        y.left = this;
        return y;
    }

    /************************************************** */

    public color: boolean;  // 颜色

    constructor(
        val: number | null,
        left: RedBlackTreeNode | null,
        right: RedBlackTreeNode | null,
        color: boolean
    ) {
        super(val, left, right);
        this.color = color;
    }
}
