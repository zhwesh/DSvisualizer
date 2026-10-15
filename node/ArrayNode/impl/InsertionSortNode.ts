import { ArrayNode } from "../ArrayNode";

// 数据颜色
export const InsertionSort_GREEN: boolean = true;
export const InsertionSort_NONE: boolean = false;

/**
 * 插入排序算法节点
 */
export class InsertionSortNode extends ArrayNode {
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
     * 将val添加至当前数组
     * 
     * 动画效果：将val添加至当前数组
     * 
     * @param val 待添加的值
     */
    public _add_value(val: number): void {
        this.data.push(val);
        this.color.push(InsertionSort_NONE);
    }

    /**
     * 删除当前数组
     * 
     * 动画效果：当前数组消失
     */
    public _delete(): void {
        this.data = Array(0);
        this.color = Array(0);
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

        if (other instanceof InsertionSortNode) {
            const color = this.color;
            this.color = other.color;
            other.color = color;
        }
    }

    /************************************************** */

    public color: boolean[];

    constructor(data: number[]) {
        super(data);
        this.color = new Array(data.length).fill(InsertionSort_NONE);
    }
};
