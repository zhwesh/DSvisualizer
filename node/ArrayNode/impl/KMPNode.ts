import { ArrayNode } from "../ArrayNode";

/**
 * KMP算法节点类
 * 
 * 可视化层动画效果：
 * 将data数组作为next数组
 * str与next数组对齐，初始时template与str左对齐
 * 求next数组时，模式串的公共前缀染蓝色（prefixColor），公共后缀染绿色（suffixColor）
 */
export class KMPNode extends ArrayNode {
    /**
     * 设置待匹配字符串指针
     * 
     * 动画效果：待匹配字符串指针指向str[ptr]
     * 
     * @param ptr 指针位置
     */
    public _set_str_ptr(ptr: number) {
        this.strPtr = ptr;
    }

    /**
     * 设置模式串指针
     * 
     * 动画效果：模式串指针指向str[ptr]
     * 
     * @param ptr 指针位置
     */
    public _set_template_ptr(ptr: number) {
        this.templatePtr = ptr;
    }

    /**
     * 让str[idx1]与template[idx2]对齐
     * 
     * 动画效果：移动template使之与str对应位置对齐
     * 
     * @param _idx1 str索引
     * @param _idx2 templat索引
     */
    public _align(_idx1: number, _idx2: number) { }

    /**
     * 设置模式串前缀颜色
     * 
     * 动画效果：将template[idx]标为前缀色（蓝色）
     * 
     * @param idx 模式串索引
     * @param color 是否染色
     */
    public _set_prefix_color(idx: number, color: boolean): void {
        this.prefixColor[idx] = color;
    }

    /**
     * 设置模式串后缀颜色
     * 
     * 动画效果：将template[idx]标为后缀色（绿色）
     * 
     * @param idx 模式串索引
     * @param color 是否染色
     */
    public _set_suffix_color(idx: number, color: boolean): void {
        this.suffixColor[idx] = color;
    }

    /**
     * 清空模式串颜色
     * 
     * 动画效果：清除template上所有前后缀颜色
     */
    public _clear_color(): void {
        this.prefixColor.fill(false);
        this.suffixColor.fill(false);
    }

    /************************************************** */

    public str: string;         // 待匹配字符串
    public template: string;    // 模式串
    public strPtr: number;      // 待匹配字符串指针（当前待匹配位置）
    public templatePtr: number; // 模式串指针（当前待匹配位置）
    public prefixColor: boolean[];  // 前缀颜色（蓝色）
    public suffixColor: boolean[];  // 后缀颜色（绿色）

    constructor(str: string, template: string) {
        super(new Array(str.length).fill(null));
        this.str = str;
        this.template = template;
        this.strPtr = this.templatePtr = 0;
        this.prefixColor = new Array(template.length).fill(false);
        this.suffixColor = new Array(template.length).fill(false);
    }
};