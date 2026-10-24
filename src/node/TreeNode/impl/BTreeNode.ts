import { TreeNode } from "../TreeNode";

/**
 * B树节点
 * 
 * 可视化层动画效果：每个节点使用方形数组代表该节点的key集合
 */
export class BTreeNode extends TreeNode<BTreeNode> {
    /**
     * 设置键
     * 
     * 动画效果：keys[idx]变为key
     * 
     * @param idx 索引
     * @param key 要设置的键
     */
    public _set_key(idx: number, key: number): void {
        this.keys[idx] = key;
    }

    /**
     * 在keys尾部添加键
     * 
     * 动画效果：keys尾部增加一个键key
     * 
     * @param key 要添加的键
     */
    public _add_key(key: number) {
        this.keys.push(key);
    }

    /**
     * 删除键
     * 
     * 动画效果：删除keys在idx处的数据，keys长度减少1
     * 
     * @param idx 索引
     */
    public _delete_key(idx: number): void {
        for (let i = idx + 1; i < this.keys.length; ++i) {
            this.keys[i - 1] = this.keys[i];
        }
        this.keys.pop();
    }

    /**
     * 设置孩子
     * 
     * 动画效果：sons[idx]变为son
     * 
     * @param idx 索引
     * @param son 要设置的孩子
     */
    public _set_son(idx: number, son: BTreeNode): void {
        this.sons[idx] = son;
    }

    /**
     * 在sons尾部添加孩子
     * 
     * 动画效果：sons尾部增加一个键son
     * 
     * @param son 要添加的键
     */
    public _add_son(son: BTreeNode) {
        this.sons.push(son);
    }

    /**
     * 删除键
     * 
     * 动画效果：删除son在idx处的数据，sons长度减少1
     * 
     * @param idx 索引
     */
    public _delete_son(idx: number): void {
        for (let i = idx + 1; i < this.sons.length; ++i) {
            this.sons[i - 1] = this.sons[i];
        }
        this.sons.pop();
    }

    /************************************************** */

    public keys: number[];  // 当前节点key集合

    constructor(keys: number[]) {
        super(Array<BTreeNode | null>(keys.length + 1).fill(null));
        this.keys = keys;
    }
};