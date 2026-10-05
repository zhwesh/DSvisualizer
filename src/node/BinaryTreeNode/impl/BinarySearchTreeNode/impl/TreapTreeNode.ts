import { BinarySearchTreeNode } from "../BinarySearchTreeNode";

/**
 * Treap树节点
 */
export class TreapTreeNode extends BinarySearchTreeNode<TreapTreeNode> {
    /**
     * 右旋
     * 
     * 动画效果：对当前节点进行右旋操作
     * 
     * @returns 旋转后的子树根节点
     */
    public _rotate_right(): TreapTreeNode {
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
    public _rotate_left(): TreapTreeNode {
        const y = this.right!;
        this.right = y.left;
        y.left = this;
        return y;
    }

    /************************************************** */

    public priority: number;    // 优先级（小根堆）

    constructor(
        val: number | null,
        left: TreapTreeNode | null,
        right: TreapTreeNode | null,
        priority: number
    ) {
        super(val, left, right);
        this.priority = priority;
    }
}
