import { TreeNode } from "../TreeNode";

/**
 * 前缀树节点（仅存储小写字母）
 * 
 * 可视化层动画效果：sons数组长度为26，其下标代表字母a-z
 * 在指向子节点的边上显示字母，值为null的子节点不显示
 */
export class TrieNode extends TreeNode<TrieNode> {
    /**
     * 设置pass值
     * 
     * 动画效果：pass值更新
     * 
     * @param pass 要设置的pass值
     */
    public _set_pass(pass: number): void {
        this.pass = pass;
    }

    /**
     * 设置end值
     * 
     * 动画效果：end值更新
     * 
     * @param end 要设置的end值
     */
    public _set_end(end: number): void {
        this.end = end;
    }

    /**
     * 设置下标为ch的孩子
     * 
     * 动画效果：令当前节点字母为ch的边指向son
     * 
     * @param ch 字母下标（0表示'a'，25表示'z'）
     * @param son 要设置的孩子
     */
    public _set_son(ch: number, son: TrieNode | null): void {
        this.sons[ch] = son;
    }

    /**
     * 删除当前节点
     * 
     * 动画效果：当前节点及其子树消失
     */
    public _delete(): void {
        this.pass = 0;
        this.end = 0;
        this.sons.fill(null);
    }

    public pass: number;    // 经过当前节点的字符串数量
    public end: number;     // 以当前节点为结尾的字符串数量

    constructor(pass: number, end: number) {
        super(new Array<TrieNode | null>(26).fill(null));
        this.pass = pass;
        this.end = end;
    }
};