import { BinaryTreeNode } from "../BinaryTreeNode";

/**
 * 线段树节点
 */
export class SegmentTreeNode extends BinaryTreeNode<SegmentTreeNode> {
    /**
     * 设置懒更新信息
     * @param lazy 新懒更新信息 
     */
    public _set_lazy(lazy: number | null) {
        this.lazy = lazy;
    }

    public lazy: number | null; // 懒更新信息

    constructor(
        val: number | null,
        left: SegmentTreeNode | null,
        right: SegmentTreeNode | null,
        lazy: number | null
    ) {
        super(val, left, right);
        this.lazy = lazy;
    }
}