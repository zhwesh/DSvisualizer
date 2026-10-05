import { ArrayNode } from "../ArrayNode";

// 覆盖条颜色
export const BinaryIndexedTree_TREE_GRAY: number = 0;
export const BinaryIndexedTree_TREE_GREEN: number = 1;
export const BinaryIndexedTree_TREE_RED: number = 2;

// 原始数据颜色
export const BinaryIndexedTree_DATA_GREEN: boolean = true;
export const BinaryIndexedTree_DATA_NONE: boolean = false;

/**
 * 树状数组节点
 * 
 * 可视化层动画效果：
 * 同时维护原始数组（data）和树状数组（tree）
 * 将每个节点对应的覆盖条（索引i对应覆盖区间(i-lowbit(i),i]的覆盖条）
 * 显示在data数组上，tree数组的值则标注在覆盖条右端
 * 
 * 覆盖条拥有颜色属性（索引i对应的覆盖条颜色为treeColor[i]），颜色共有三种：
 * 0代表灰色，1代表绿色，2代表红色
 * 
 * 原始数组也用于颜色属性（索引i对应的原始数组颜色为dataColor[i]），颜色共有两种：
 * true代表绿色，false代表无色
 * 
 * 下标从1开始有效（下标0不使用），即data[1...n]、tree[1...n]
 */
export class BinaryIndexedTreeNode extends ArrayNode {
    /**
     * 设置树状数组节点
     * @param sum 要设置的值
     */
    public _set_tree(idx: number, sum: (number | null)): void {
        this.tree[idx] = sum;
    }

    /**
     * 设置树状数组节点对应的覆盖条颜色
     * @param color 要设置的颜色
     */
    public _set_tree_color(idx: number, color: number): void {
        this.treeColor[idx] = color;
    }

    /**
     * 设置原始数据颜色
     * @param color 要设置的颜色
     */
    public _set_data_color(idx: number, color: boolean): void {
        this.dataColor[idx] = color;
    }

    /**
     * 重置所有颜色
     * 
     * 动画效果：所有覆盖条变为灰色，所有原始数据节点变为无色
     */
    public _clear_color(): void {
        this.treeColor.fill(BinaryIndexedTree_TREE_GRAY);
        this.dataColor.fill(BinaryIndexedTree_DATA_NONE);
    }

    public tree: (number | null)[];     // 树状数组
    public treeColor: number[];         // 覆盖条颜色
    public dataColor: boolean[];        // 原始数组节点颜色

    constructor(n: number) {
        super(new Array(n + 1).fill(0));
        this.tree = new Array(n + 1).fill(0);
        this.treeColor = new Array(n + 1).fill(BinaryIndexedTree_TREE_GRAY);
        this.dataColor = new Array(n + 1).fill(BinaryIndexedTree_DATA_NONE);
    }
}
