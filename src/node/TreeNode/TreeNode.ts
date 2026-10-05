import { DataNode } from "../DataNode";

// 树节点
export class TreeNode<T extends TreeNode<T>> extends DataNode {
    /**
     * 给当前节点添加一个孩子
     * 
     * 动画效果：当前节点新增一个孩子son
     * 
     * @param son 要添加的子节点
     */
    public _add_son(son: T | null): void {
        this.sons.push(son);
    }

    /**
     * 删除当前节点
     * 
     * 动画效果：当前节点及其子树消失
     */
    public _delete(): void {
        this.sons = Array(0);
    }

    /************************************************** */

    public sons: (T | null)[];    // 当前节点的所有孩子

    constructor(sons: (T | null)[]) {
        super();
        this.sons = sons;
    }
};