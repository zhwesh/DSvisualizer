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

    /************************************************** */

    public pivot: number | null;    // 枢轴下标
    public color: boolean[];

    constructor(data: number[]) {
        super(data);
        this.pivot = null;
        this.color = new Array(data.length).fill(QuickSort_NONE);
    }
};
