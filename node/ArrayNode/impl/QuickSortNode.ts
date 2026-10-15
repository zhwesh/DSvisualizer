import { ArrayNode } from "../ArrayNode";

// 数据颜色
export const QuickSort_GREEN: boolean = true;
export const QuickSort_NONE: boolean = false;

export class QuickSortNode extends ArrayNode {
    /**
     * 清空数据颜色
     * 
     * 动画效果：将data的所有数据的背景颜色设为无色
     */
    public _clear_color(): void {
        for (let i = 0; i < this.color.length; ++i) {
            this.color[i] = QuickSort_NONE;
        }
    }

    /**
     * 设置数据颜色
     * 
     * 动画效果：将data[idx]背景颜色设为color
     * 
     * @param idx 索引
     * @param color 颜色
     */
    public _set_color(idx: number, color: boolean): void {
        this.color[idx] = color;
    }

    /**
     * 设置枢轴
     * 
     * 动画效果：让枢轴指针指向data[pivot]
     * 
     * @param pivot 枢轴下标
     */
    public _set_pivot(pivot: number | null): void {
        this.pivot = pivot;
    }

    /**
     * 将val添加至当前数组
     * 
     * 动画效果：将val添加至当前数组
     * 
     * @param val 待添加的值
     */
    public _add_value(val: number): void {
        this.data.push(val);
        this.color.push(QuickSort_NONE);
    }

    /**
     * 删除当前数组
     * 
     * 动画效果：当前数组消失
     */
    public _delete(): void {
        this.data = Array(0);
        this.color = Array(0);
        this.pivot = null;
    }

    /**
     * 交换当前数组和另一个数组
     * 
     * 动画效果：交换两个数组
     * 
     * @param other 另一个数组
     */
    public _swap_array(other: ArrayNode): void {
        const data = this.data;
        this.data = other.data;
        other.data = data;

        if (other instanceof QuickSortNode) {
            const color = this.color;
            this.color = other.color;
            other.color = color;
            other.pivot = null;
        }
        this.pivot = null;
    }

    /************************************************** */

    public pivot: number | null;    // 枢轴下标
    public color: boolean[];

    constructor(data: number[]) {
        super(data);
        this.pivot = null;
        this.color = new Array(data.length).fill(QuickSort_NONE);
    }
};
