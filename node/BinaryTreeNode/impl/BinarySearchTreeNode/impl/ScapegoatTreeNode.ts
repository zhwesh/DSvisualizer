import { BinarySearchTreeNode } from "../BinarySearchTreeNode";

/**
 * 替罪羊树节点
 * 
 * val为键（沿用二叉搜索树节点），size为子树键数量
 */
export class ScapegoatTreeNode extends BinarySearchTreeNode<ScapegoatTreeNode> {
    /**
     * 设置当前节点的子树键数量
     * 
     * 动画效果：改变当前节点显示的size
     * 
     * @param size 要设置的键数量
     */
    public _set_size(size: number): void {
        this.size = size;
    }

    /************************************************** */

    public size: number;    // 子树键数量

    constructor(
        val: number | null,
        left: ScapegoatTreeNode | null,
        right: ScapegoatTreeNode | null,
        size: number
    ) {
        super(val, left, right);
        this.size = size;
    }
}
