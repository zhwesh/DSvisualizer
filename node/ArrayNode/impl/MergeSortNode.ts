import { ArrayNode } from "../ArrayNode";

// 数据颜色
export const MergeSort_GREEN: boolean = true;
export const MergeSort_NONE: boolean = false;

export class MergeSortNode extends ArrayNode {
    /**
     * 清空数据颜色
     * 
     * 动画效果：将data的所有数据的背景颜色设为无色
     */
    public _clear_color(): void {
        for (let i = 0; i < this.color.length; ++i) {
            this.color[i] = MergeSort_NONE;
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
     * 将val添加至当前数组
     * 
     * 动画效果：将val添加至当前数组
     * 
     * @param val 待添加的值
     */
    public _add_value(val: number): void {
        this.data.push(val);
        this.color.push(MergeSort_NONE);
    }

    /************************************************** */

    public color: boolean[];

    constructor(data: number[]) {
        super(data);
        this.color = new Array(data.length).fill(MergeSort_NONE);
    }
};
