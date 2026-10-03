import { BinaryTreeNode } from "../BinaryTreeNode";

export class AVLTreeNode extends BinaryTreeNode<AVLTreeNode> {
    /**
     * 设置当前节点的父节点
     * 
     * 动画效果：令当前节点父节点指向father
     * 
     * @param father 要设置的父节点
     */
    public _set_father(father: AVLTreeNode | null): void {
        this.father = father;
    }

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
     */
    public _rotate_right(): void {
        let y = this.left!, f = this.father!;
        y.father = f;
        if (this.isLeftSon()) {
            f.left = y;
        } else if (this.isRightSon()) {
            f.right = y;
        } else {
            f.father = y;
        }
        this.father = y;
        if (y.right != null) {
            y.right.father = this;
        }
        this.left = y.right;
        y.right = this;
        this.updateHeight();
        y.updateHeight();
    }

    /**
     * 左旋
     * 
     * 动画效果：对当前节点进行左旋操作
     */
    public _rotate_left(): void {
        let y = this.right!, f = this.father!;
        y.father = f;
        if (this.isLeftSon()) {
            f.left = y;
        } else if (this.isRightSon()) {
            f.right = y;
        } else {
            f.father = y;
        }
        this.father = y;
        if (y.left != null) {
            y.left.father = this;
        }
        this.right = y.left;
        y.left = this;
        this.updateHeight();
        y.updateHeight();
    }

    /************************************************** */

    public father: AVLTreeNode | null;  // 父节点
    public height: number;              // 高度

    constructor(
        val: number | null,
        left: AVLTreeNode | null,
        right: AVLTreeNode | null,
        father: AVLTreeNode | null,
        height: number
    ) {
        super(val, left, right);
        this.father = father;
        this.height = height;
    }

    // 是否为左孩子
    public isLeftSon(): boolean {
        return this == this.father!.left;
    }

    // 是否为右孩子
    public isRightSon(): boolean {
        return this == this.father!.right;
    }

    // 获取兄弟节点
    public brother(): AVLTreeNode | null {
        if (this.isLeftSon()) {
            return this.father!.right;
        } else {
            return this.father!.left;
        }
    }

    // 更新当前节点的高度
    private updateHeight(): void {
        const leftHeight = (this.left === null ? 0 : this.left.height);
        const rightHeight = (this.right === null ? 0 : this.right.height);
        this.height = Math.max(leftHeight, rightHeight) + 1;
    }
}
