import { UnionFindSetNode } from "../../node/ArrayNode/impl/UnionFindSetNode";
import { create } from "../../node/factory";
import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 并查集
 */
export class UnionFindSet {
    // 并查集节点（data为父节点数组father，sz为集合大小数组）
    private arr: UnionFindSetNode;

    /**
     * 初始化n个元素，编号0...n-1，各独属于一个集合
     * @param n 元素个数
     */
    constructor(n: number) {
        const father: number[] = new Array(n);
        const sz: number[] = new Array(n);
        for (let i = 0; i < n; ++i) {
            father[i] = i;
            sz[i] = 1;
        }
        this.arr = create(UnionFindSetNode, father, sz);
    }

    /**
     * 查找x所在集合的根节点（路径压缩）
     * @param x 元素编号
     * @returns x所在集合的根节点（编号不存在时返回null）
     */
    public async find(x: number): Promise<number | null> {
        if (x < 0 || x >= this.arr.data.length) {
            messageController.message("节点编号'" + x + "'不存在", MessageType.ERROR);
            return null;
        }

        // 找到根节点
        messageController.message(
            "检查father[" + x + "]与" + x + "是否相等",
            MessageType.INFO
        );
        if (this.arr.data[x] === x) {
            messageController.message(
                "father[" + x + "]等于" + x + "，" + x + "为根节点",
                MessageType.INFO
            );
            messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
            return x;
        }

        await stepController.wait();
        messageController.message(
            "father[" + x + "] != " + x + "，递归查找",
            MessageType.INFO
        );
        const root = await this.find(this.arr.data[x]!);

        await stepController.wait();
        messageController.message("路径压缩：将father[" + x + "]直接设为" + root, MessageType.INFO);
        this.arr._set_value(x, root);

        return root;
    }

    /**
     * 将u、v所在集合合并
     * @param u 元素编号
     * @param v 元素编号
     */
    public async union(u: number, v: number): Promise<void> {
        await stepController.wait();
        messageController.message("查找节点" + u + "所在集合的根节点", MessageType.INFO);
        const fu = await this.find(u);
        if (fu === null) {
            return;
        }

        await stepController.wait();
        messageController.message("查找节点" + v + "所在集合的根节点", MessageType.INFO);
        const fv = await this.find(v);
        if (fv === null) {
            return;
        }

        if (fu === fv) {
            messageController.message(
                "节点" + u + "和节点" + v + "已属于同一集合",
                MessageType.WARNING
            );
            return;
        }

        await stepController.wait();
        messageController.message(
            "将" + fu + "的父节点设为" + fv + "，并更新集合大小",
            MessageType.INFO
        );
        this.arr._set_value(fu, fv);
        this.arr._set_size(fv, this.arr.sz[fv]! + this.arr.sz[fu]!);

        messageController.message("合并完成", MessageType.SUCCESS);
    }

    /**
     * 返回x所在集合的大小
     * @param x 元素编号
     * @returns x所在集合的大小（编号不存在时返回0）
     */
    public async getSize(x: number): Promise<number> {
        await stepController.wait();
        messageController.message("查找节点" + x + "所在集合的根节点", MessageType.INFO);
        const root = await this.find(x);
        if (root === null) {
            return 0;
        }

        await stepController.wait();
        const size = this.arr.sz[root]!;
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return size;
    }

    /**
     * 返回u、v是否在同一个集合
     * @param u 元素编号
     * @param v 元素编号
     * @returns u、v是否在同一个集合（编号不存在时返回false）
     */
    public async inSameSet(u: number, v: number): Promise<boolean> {
        messageController.message("查找节点" + u + "所在集合的根节点", MessageType.INFO);
        const fu = await this.find(u);
        if (fu === null) {
            return false;
        }

        messageController.message("查找节点" + v + "所在集合的根节点", MessageType.INFO);
        const fv = await this.find(v);
        if (fv === null) {
            return false;
        }

        await stepController.wait();
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return fu === fv;
    }
}
