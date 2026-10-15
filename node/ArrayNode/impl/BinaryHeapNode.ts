import { ArrayNode } from "../ArrayNode";

/**
 * 数组实现的二叉堆节点
 * 
 * 可视化层动画效果：
 * 同时展示数组与它对应的完全二叉树
 * data数组下标从1开始有效（data[0]不使用），下标i即该元素在完全二叉树中的层序遍历编号：
 * data[1]为根节点，i号节点的左右孩子分别为i<<1、i<<1|1，父节点为i>>1
 */
export class BinaryHeapNode extends ArrayNode {
    constructor(data: (number | null)[]) {
        super(data);
    }
}