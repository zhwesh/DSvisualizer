import { ArrayNode } from "../ArrayNode";

/**
 * 数组实现的并查集节点
 * 
 * 可视化层动画效果：
 * 同时展示father数组（实际为data数组）、sz数组，以及由father数组构成的森林
 * father[i]为节点i的父节点，father[i]==i时代表节点i为所在集合的根节点
 * sz[i]为以i为根的集合大小（仅当i为根时有意义）
 */
export class UnionFindSetNode extends ArrayNode {
    /**
     * 设置以x为根的集合大小
     * 
     * 动画效果：改变节点x处显示的集合大小
     * 
     * @param x 节点编号
     * @param size 集合大小
     */
    public _set_size(x: number, size: number | null): void {
        this.sz[x] = size;
    }

    /**
     * 清除所有节点的高亮
     */
    public _clear_visited(): void {
        this.visited.fill(false);
    }

    /**
     * 设置高亮节点
     * 
     * 动画效果：将节点idx设为visited
     * 
     * @param idx 节点索引
     * @param visited 是否高亮
     */
    public _set_visited(idx: number, visited: boolean): void {
        this.visited[idx] = visited;
    }

    /************************************************** */

    // 集合大小数组（当值为null时不显示）
    public sz: (number | null)[];
    // 节点是否被访问
    public visited: boolean[];

    constructor(father: number[], sz: number[]) {
        super(father);
        this.sz = sz;
        this.visited = Array(sz.length).fill(false);
    }
}
