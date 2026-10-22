import { ArrayNode } from "../ArrayNode";

// 原始数据颜色
export const BinarySearch_GREEN: boolean = true;
export const BinarySearch_NONE: boolean = false;

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

    /**
     * 设置数组颜色
     * 
     * 动画效果：让data[idx]颜色变为color
     * 
     * @param idx 索引
     * @param color 颜色
     */
    public _set_color(idx: number, color: boolean) {
        this.color[idx] = color;
    }

    /************************************************** */

    private static ascendAssert(data: number[]): void {
        for (let i: number = 1; i < data.length; ++i) {
            if (data[i] < data[i - 1]) {
                throw new Error("data数组必须按升序排序");
            }
        }
    }

    public left: number | null; 
    public right: number | null;
    public mid: number | null;
    public color: boolean[];

    constructor(data: number[]) {
        BinarySearchNode.ascendAssert(data);
        super(data);
        this.left = this.right = this.mid = null;
        this.color = Array(data.length).fill(BinarySearch_NONE);
    }
};