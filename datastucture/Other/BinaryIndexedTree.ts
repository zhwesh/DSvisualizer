import {
    BinaryIndexedTree_DATA_GREEN,
    BinaryIndexedTree_DATA_NONE,
    BinaryIndexedTree_TREE_GREEN,
    BinaryIndexedTree_TREE_RED,
    BinaryIndexedTreeNode
} from "../../node/ArrayNode/impl/BinaryIndexedTreeNode";
import { create } from "../../node/factory";
import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 树状数组（单点加 + 区间求和）
 * 
 * 原始数组和树状数组下标从1开始（0号下标不使用）
 */
export class BinaryIndexedTree {
    // 内部数组节点
    private node: BinaryIndexedTreeNode;
    // 元素个数
    private n: number;

    /**
     * 根据初始数组建树
     * @param nums 初始数组（长度为n，元素对应下标1...n）
     */
    constructor(n: number) {
        this.n = n;
        this.node = create(BinaryIndexedTreeNode, n);
    }

    /**
     * 获取x的最低位的1对应的值
     * @param x x
     * @returns x & -x
     */
    private lowbit(x: number): number {
        return x & -x;
    }

    /**
     * 将原始数据arr[idx]增加val
     * @param idx 下标
     * @param val 增加的值
     */
    public async add(idx: number, val: number): Promise<void> {
        if (idx < 1 || idx > this.n) {
            messageController.message("索引越界", MessageType.ERROR);
            return;
        }

        this.node._set_value(idx, this.node.data[idx]! + val);
        this.node._set_data_color(idx, BinaryIndexedTree_DATA_GREEN);

        while (idx <= this.n) {
            const lb = this.lowbit(idx);

            await stepController.wait();
            messageController.message(
                "将区间(" + (idx - lb) + "," + idx + "]增加" + val,
                MessageType.INFO
            );
            this.node._set_tree_color(idx, BinaryIndexedTree_TREE_GREEN);
            this.node._set_tree(idx, (this.node.tree[idx] as number) + val);
            idx += lb;
        }

        messageController.message(SuccessMessage.SET_SUCCESS, MessageType.SUCCESS);
        this.node._clear_color();
    }

    /**
     * 查询区间[l,r]的元素和
     * @param l 区间左端点
     * @param r 区间右端点
     * @returns 区间[l,r]的元素和（区间无效时返回null）
     */
    public async query(l: number, r: number): Promise<number | null> {
        if (l < 1 || r > this.n || l > r) {
            messageController.message("区间越界", MessageType.ERROR);
            return null;
        }

        // 分解右端点r
        let sum = 0;
        while (r > 0) {
            const lb = this.lowbit(r);
            await stepController.wait();
            messageController.message(
                "将区间(" + (r - lb) + "," + r + "]的累加和添加到结果",
                MessageType.INFO
            );
            this.node._set_tree_color(r, BinaryIndexedTree_TREE_GREEN);
            for (let i = r - lb + 1; i <= r; ++i) {
                this.node._set_data_color(i, BinaryIndexedTree_DATA_GREEN);
            }
            sum += this.node.tree[r]!;
            r -= lb;
        }

        // 分解左端点l-1
        --l;
        while (l > 0) {
            const lb = this.lowbit(l);
            await stepController.wait();
            messageController.message(
                "将区间(" + (l - lb) + "," + l + "]的累加和从结果减去",
                MessageType.INFO
            );
            this.node._set_tree_color(l, BinaryIndexedTree_TREE_RED);
            for (let i = l - lb + 1; i <= l; ++i) {
                this.node._set_data_color(i, BinaryIndexedTree_DATA_NONE);
            }
            sum -= this.node.tree[l]!;
            l -= lb;
        }

        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        this.node._clear_color();
        return sum;
    }
}
