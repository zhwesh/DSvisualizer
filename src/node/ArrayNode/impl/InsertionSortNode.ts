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
    public _set_color(idx: number, color: boolean) {
        this.color[idx] = color;
    }

    /************************************************** */

    public color: boolean[];

    constructor(data: number[]) {
        super(data);
        this.color = new Array(data.length).fill(InsertionSort_NONE);
    }
};
