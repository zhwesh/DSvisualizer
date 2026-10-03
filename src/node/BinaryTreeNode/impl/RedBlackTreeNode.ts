import { BinaryTreeNode } from "../BinaryTreeNode";

export const _RB_tree_red: boolean = true;
export const _RB_tree_black: boolean = false;

/**
 * 红黑树节点
 */
export class RedBlackTreeNode extends BinaryTreeNode<RedBlackTreeNode> {
    /**
     * 设置当前节点的父节点
     * 
     * 动画效果：令当前节点父节点指向father
     * 
     * @param father 要设置的父节点
     */
    public _set_father(father: RedBlackTreeNode | null): void {
        this.father = father;
    }

    /**
     * 设置当前节点的颜色
     * 
     * 动画效果：令当前节点颜色为color
     * 
     * @param color 要设置的父节点
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
    }

    /************************************************** */

    public father: RedBlackTreeNode | null; // 父节点
    public color: boolean   // 颜色

    constructor(
        val: number | null,
        left: RedBlackTreeNode | null,
        right: RedBlackTreeNode | null,
        father: RedBlackTreeNode | null,
        color: boolean
    ) {
        super(val, left, right);
        this.father = father;
        this.color = color;
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
    public brother(): RedBlackTreeNode | null {
        if (this.isLeftSon()) {
            return this.father!.right;
        } else {
            return this.father!.left;
        }
    }
};