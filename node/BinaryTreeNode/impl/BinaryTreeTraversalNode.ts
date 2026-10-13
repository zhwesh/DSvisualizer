import { BinaryTreeNode } from "../BinaryTreeNode";

/**
 * 二叉树的遍历算法节点
 * 
 * 可视化层动画效果：
 * visited属性代表是否已被访问，若是则节点标记为绿色，否则为无色
 */
export class BinaryTreeTraversalNode extends BinaryTreeNode<BinaryTreeTraversalNode> {
    /**
     * 将当前节点所在子树全部设为未访问
     * 
     * 动画效果：当前节点所在子树全部变为未访问
     */
    public _clear_visited() {
        BinaryTreeTraversalNode.clearVisited(this);
    }

    /**
     * 设置节点是否已被访问
     * 
     * 动画效果：设置visited并变色
     * 
     * @param visited 节点是否已被访问
     */
    public _set_visited(visited: boolean) {
        this.visited = visited;
    }

    /************************************************** */

    public val: number;         // 节点的值
    public visited: boolean;    // 是否已被访问

    constructor(
        left: BinaryTreeTraversalNode | null,
        right: BinaryTreeTraversalNode | null,
        val: number
    ) {
        super(left, right);
        this.val = val;
        this.visited = false;
    }

    /**
     * 将node所在子树全部设为未访问
     * @param node 子树根节点
     */
    private static clearVisited(node: BinaryTreeTraversalNode | null): void {
        if (node === null) {
            return;
        }
        node.visited = false;
        this.clearVisited(node.left);
        this.clearVisited(node.right);
    }
}