import { SegmentTreeNode } from "../../../node/BinaryTreeNode/impl/SegmentTreeNode";
import { create } from "../../../node/factory";
import { MessageController, MessageType, SuccessMessage } from "../../../controller/MessageController";
import { StepController } from "../../../controller/StepController";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 线段树（链式实现，包括区间加、区间求和操作）
 */
export class SegmentTree {
    /**
     * 设置根节点
     * @param root 要设置的根节点
     */
    public _set_root(root: SegmentTreeNode | null): void {
        this.root = root;
    }

    /************************************************** */

    private root!: SegmentTreeNode | null;  // 根节点
    private n!: number;                     // 元素个数

    /**
     * 根据初始数组建树
     * @param nums 初始数组
     */
    constructor(nums: number[]) {
        this._set_root(null);
        this.n = nums.length;
        if (this.n > 0) {
            this._set_root(this.build(nums, 0, this.n - 1));
        }
    }

    /**
     * 递归建树
     * @param nums 初始数组
     * @param L 当前区间左端点
     * @param R 当前区间右端点
     * @returns 当前区间的线段树节点
     */
    private build(nums: number[], L: number, R: number): SegmentTreeNode {
        if (L === R) {
            return create(SegmentTreeNode, null, null, nums[L], 0);
        }

        const mid = L + ((R - L) >> 1);
        const left = this.build(nums, L, mid);
        const right = this.build(nums, mid + 1, R);

        const node = create(SegmentTreeNode, null, null, 0, 0);
        node._set_left(left);
        node._set_right(right);
        node._set_sum(left.sum! + right.sum!);
        return node;
    }

    /**
     * 将当前节点的懒标记下传给左右孩子
     * @param L 当前区间左端点
     * @param R 当前区间右端点
     * @param node 当前节点
     */
    private async down(L: number, R: number, node: SegmentTreeNode): Promise<void> {
        if (node.lazy === 0) {
            return;
        }

        const lazy = node.lazy!;
        const mid = L + ((R - L) >> 1);
        const left = node.left!;
        const right = node.right!;

        await stepController.wait();
        messageController.message(
            "将懒标记'" + lazy + "'下传给左右孩子",
            MessageType.INFO
        );
        left._set_sum(left.sum! + (mid - L + 1) * lazy);
        left._set_lazy(left.lazy! + lazy);
        right._set_sum(right.sum! + (R - mid) * lazy);
        right._set_lazy(right.lazy! + lazy);
        node._set_lazy(0);
    }

    /**
     * 递归区间加
     * @param l 操作区间左端点
     * @param r 操作区间右端点
     * @param val 要增加的值
     * @param L 当前区间左端点
     * @param R 当前区间右端点
     * @param node 当前节点
     */
    private async addRange(
        l: number, r: number, val: number,
        L: number, R: number, node: SegmentTreeNode
    ): Promise<void> {
        if (l <= L && R <= r) {
            await stepController.wait();
            messageController.message(
                "区间[" + L + "," + R + "]完全包含于[" + l + "," + r +
                    "]，节点值增加" + (R - L + 1) + "*" + val + "=" +
                    (R - L + 1) * val + "，懒标记增加" + val,
                MessageType.INFO
            );
            node._set_sum(node.sum! + (R - L + 1) * val);
            node._set_lazy(node.lazy! + val);
            return;
        }

        await this.down(L, R, node);
        const mid = L + ((R - L) >> 1);
        if (l <= mid) {
            await this.addRange(l, r, val, L, mid, node.left!);
        }
        if (r > mid) {
            await this.addRange(l, r, val, mid + 1, R, node.right!);
        }

        await stepController.wait();
        messageController.message(
            "用左右孩子的值更新节点[" + L + "," + R + "]",
            MessageType.INFO
        );
        node._set_sum(node.left!.sum! + node.right!.sum!);
    }

    /**
     * 令区间[l,r]中的每个元素增加val
     * @param l 区间左端点
     * @param r 区间右端点
     * @param val 增加的值
     */
    public async add(l: number, r: number, val: number): Promise<void> {
        if (l < 0 || r >= this.n || l > r) {
            messageController.message(
                "区间[" + l + "," + r + "]无效",
                MessageType.ERROR
            );
            return;
        }

        await stepController.wait();
        messageController.message(
            "令区间[" + l + "," + r + "]中的每个元素增加" + val,
            MessageType.INFO
        );
        await this.addRange(l, r, val, 0, this.n - 1, this.root!);

        messageController.message(SuccessMessage.SET_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 递归区间求和
     * @param l 查询区间左端点
     * @param r 查询区间右端点
     * @param L 当前区间左端点
     * @param R 当前区间右端点
     * @param node 当前节点
     * @returns 当前区间与区间[l,r]交集的元素和
     */
    private async queryRange(
        l: number, r: number,
        L: number, R: number,
        node: SegmentTreeNode
    ): Promise<number> {
        if (l <= L && R <= r) {
            await stepController.wait();
            messageController.message(
                "区间[" + L + "," + R + "]完全包含于[" + l + "," +
                    r + "]，返回当前区间和" + node.sum,
                MessageType.INFO
            );
            return node.sum!;
        }

        await this.down(L, R, node);
        const mid = L + ((R - L) >> 1);
        let res = 0;
        if (l <= mid) {
            res += await this.queryRange(l, r, L, mid, node.left!);
        }
        if (r > mid) {
            res += await this.queryRange(l, r, mid + 1, R, node.right!);
        }
        return res;
    }

    /**
     * 查询区间[l,r]的元素和
     * @param l 区间左端点
     * @param r 区间右端点
     * @returns 区间[l,r]的元素和（区间无效时返回null）
     */
    public async query(l: number, r: number): Promise<number | null> {
        if (l < 0 || r >= this.n || l > r) {
            messageController.message(
                "区间[" + l + "," + r + "]无效",
                MessageType.ERROR
            );
            return null;
        }

        await stepController.wait();
        messageController.message(
            "查询区间[" + l + "," + r + "]的元素和",
            MessageType.INFO
        );
        const res = await this.queryRange(l, r, 0, this.n - 1, this.root!);

        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return res;
    }
}
