/**
 * 所有算法层数据节点的父类
 * 实现唯一id的分配逻辑
 */
export class DataNode {
    // 节点唯一id
    private id: number;
    // 全局计数器
    private static cnt: number = 0;

    // 自动分配id
    constructor() {
        this.id = DataNode.cnt;
        ++DataNode.cnt;
    }

    /**
     * 重置计数器
     * （图形页面层应在每次加载新页面时调用一次）
     */
    public static restart() {
        DataNode.cnt = 0;
    }

    /**
     * 获取节点id
     * @returns 节点id
     */
    public getId(): number {
        return this.id;
    }
}