import { ArrayNode } from "../ArrayNode";

/**
 * 二分查找算法节点
 */
export class BinarySearchNode extends ArrayNode {
    /**
     * 设置左指针
     * 
     * 动画效果：让左指针指向data[left]
     * 
     * @param left 左指针
     */
    public _set_left(left: number | null): void {
        this.left = left;
    }

    /**
     * 设置右指针
     * 
     * 动画效果：让右指针指向data[right]
     * 
     * @param right 右指针
     */
    public _set_right(right: number | null): void {
        this.right = right;
    }

    /**
     * 设置中间指针
     * 
     * 动画效果：让中间指针指向data[mid]
     * 
     * @param mid 中间指针
     */
    public _set_mid(mid: number | null): void {
        this.mid = mid;
    }

    /************************************************** */

    public left: number | null; 
    public right: number | null;
    public mid: number | null;

    constructor(data: number[]) {
        super(data);
        this.left = this.right = this.mid = null;
    }
};