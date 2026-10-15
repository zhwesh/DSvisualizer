import { BinarySearchTreeNode } from "../BinarySearchTreeNode";

/**
 * AVL树节点
 */
export class AVLTreeNode extends BinarySearchTreeNode<AVLTreeNode> {
    /**
     * 设置当前节点的高度
     * 
     * 动画效果：令当前节点高度为height
     * 
     * @param height 要设置的高度
     */
    public _set_height(height: number): void {
        this.height = height;
    }

    /**
     * 右旋
     * 
     * 动画效果：对当前节点进行右旋操作
     * 
     * @returns 旋转后的子树根节点
     */
    public _rotate_right(): AVLTreeNode {
        const y = this.left!;
        this.left = y.right;
        y.right = this;
        this.updateHeight();
        y.updateHeight();
        return y;
    }

    /**
     * 左旋
     * 
     * 动画效果：对当前节点进行左旋操作
     * 
     * @returns 旋转后的子树根节点
     */
    public _rotate_left(): AVLTreeNode {
        const y = this.right!;
        this.right = y.left;
        y.left = this;
        this.updateHeight();
        y.updateHeight();
        return y;
    }

    /************************************************** */

    public height: number;  // 子树高度

    constructor(
        val: number | null,
        left: AVLTreeNode | null,
        right: AVLTreeNode | null,
        height: number
    ) {
        super(val, left, right);
        this.height = height;
    }

    // 更新当前节点的高度
    private updateHeight(): void {
        const leftHeight = (this.left === null ? 0 : this.left.height);
        const rightHeight = (this.right === null ? 0 : this.right.height);
        this.height = Math.max(leftHeight, rightHeight) + 1;
    }
}
