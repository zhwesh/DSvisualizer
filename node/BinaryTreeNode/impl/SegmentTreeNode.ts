import { BinaryTreeNode } from "../BinaryTreeNode";

/**
 * 线段树节点
 */
export class SegmentTreeNode extends BinaryTreeNode<SegmentTreeNode> {
    /**
     * 设置懒更新信息
     * 
     * 动画效果：节点lazy值更新为lazy
     * 
     * @param lazy 新懒更新信息 
     */
    public _set_lazy(lazy: number | null): void {
        this.lazy = lazy;
    }

    /**
     * 设置当前节点的和
     * 
     * 动画效果：节点sum值更新为sum
     * 
     * @param sum 当前节点的和
     */
    public _set_sum(sum: number | null): void {
        this.sum = sum;
    }

    /************************************************** */

    public lazy: number | null; // 懒更新信息
    public sum: number | null;  // 当前区间的和

    constructor(
        left: SegmentTreeNode | null,
        right: SegmentTreeNode | null,
        sum: number | null,
        lazy: number | null
    ) {
        super(left, right);
        this.sum = sum;
        this.lazy = lazy;
    }
}