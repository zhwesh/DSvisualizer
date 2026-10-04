import { DataNode } from "../DataNode";

/**
 * 数组节点
 * 当data内某位置的数字为null时不显示数字
 */
export class ArrayNode extends DataNode {
    // 底层数组（值为null的位置不显示数字）
    public data: (number | null)[];

    constructor(data: (number | null)[]) {
        super();
        this.data = data;
    }

    /**
     * 将当前数组中索引为idx的元素设为val
     * 
     * 动画效果：将当前对象的数组data中索引为idx的元素设为val
     * 
     * @param array 待修改数组
     * @param idx 数组索引
     * @param val 新值
     */
    public _set_value(idx: number, val: number | null): void {
        this.data[idx] = val;
    }

    /**
     * 交换当前数组idx1处的值与另一个ArrayNode对象的idx2处的值
     * 
     * 动画效果：交换上述两个值
     * 
     * @param idx1 数组1的索引
     * @param other 另一个ArrayNode对象
     * @param idx2 数组2的索引
     */
    public _swap_value(idx1: number, other: ArrayNode, idx2: number): void {
        const tmp: number | null = this.data[idx1];
        this.data[idx1] = other.data[idx2];
        other.data[idx2] = tmp;
    }

    /**
     * 删除当前数组
     * 
     * 动画效果：当前数组消失
     */
    public _delete(): void {
        this.data = Array(0);
    }

    /**
     * 交换当前数组和另一个数组
     * 
     * 动画效果：交换两个数组
     * 
     * @param other 另一个数组
     */
    public _swap_array(other: ArrayNode): void {
        const data: (number | null)[] = this.data;
        this.data = other.data;
        other.data = data;
    }
};