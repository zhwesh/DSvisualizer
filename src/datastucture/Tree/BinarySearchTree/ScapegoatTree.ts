import { ScapegoatTreeNode } from "../../../node/BinaryTreeNode/impl/BinarySearchTreeNode/impl/ScapegoatTreeNode";
import { create } from "../../../node/factory";
import { MessageController, MessageType, SuccessMessage } from "../../../controller/MessageController";
import { StepController } from "../../../controller/StepController";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

// 平衡因子：较大孩子的键数量超过α×当前节点键数量时重构
const ScapegoatTree_Alpha: number = 0.7;

/**
 * 替罪羊树
 */
export class ScapegoatTree {
    /**
     * 设置根节点
     * @param root 要设置的根节点
     */
    public _set_root(root: ScapegoatTreeNode | null): void {
        this.root = root;
    }

    /**
     * 动画效果：清空替罪羊树
     */
    public _clear(): void {
        this._set_root(null);
    }

    /************************************************** */

    private root!: ScapegoatTreeNode | null;    // 根节点

    constructor() {
        this._set_root(null);
    }

    // 清除所有值
    public clear(): void {
        if (this.isEmpty()) {
            messageController.message("替罪羊树已经为空", MessageType.WARNING);
            return;
        }

        this._clear();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.root === null;
    }

    // 键数量
    public size(): number {
        return this.root === null ? 0 : this.root.size;
    }

    // 获取子树的键数量
    private sizeOf(node: ScapegoatTreeNode | null): number {
        return node === null ? 0 : node.size;
    }

    // 当前节点是否不平衡
    private isUnbalanced(node: ScapegoatTreeNode): boolean {
        return ScapegoatTree_Alpha * node.size <
            Math.max(this.sizeOf(node.left), this.sizeOf(node.right));
    }

    /**
     * 查找val所在的节点
     * @param val 要查找的值
     * @returns val所在的节点（不存在时返回null）
     */
    private findNode(val: number): ScapegoatTreeNode | null {
        let x = this.root;
        while (x !== null) {
            if (val === x.val) {
                return x;
            }
            x = val < x.val! ? x.left : x.right;
        }
        return null;
    }

    /**
     * 中序遍历收集节点
     * @param node 子树根节点
     * @param arr 收集数组
     */
    private inorder(node: ScapegoatTreeNode | null,
        arr: ScapegoatTreeNode[]): void {
        if (node === null) {
            return;
        }
        this.inorder(node.left, arr);
        arr.push(node);
        this.inorder(node.right, arr);
    }

    /**
     * 将有序节点数组的[l,r]区间二分建成平衡子树
     * @param arr 有序节点数组
     * @param l 左端点
     * @param r 右端点
     * @returns 建成的子树根节点
     */
    private build(arr: ScapegoatTreeNode[], l: number, r: number):
        ScapegoatTreeNode | null {
        if (l > r) {
            return null;
        }
        const mid = (l + r) >> 1;
        const node = arr[mid];
        const left = this.build(arr, l, mid - 1);
        const right = this.build(arr, mid + 1, r);

        node._set_left(left);
        node._set_right(right);
        node._set_size(1 + this.sizeOf(left) + this.sizeOf(right));
        return node;
    }

    /**
     * 重构以node为根的子树
     * @param node 不平衡的子树根节点
     * @returns 重构后的子树根节点
     */
    private async rebuild(node: ScapegoatTreeNode): Promise<ScapegoatTreeNode> {
        await stepController.wait();
        messageController.message(
            "节点[" + node.val + "]的子树不平衡，进行重构",
            MessageType.INFO
        );
        const arr: ScapegoatTreeNode[] = [];
        this.inorder(node, arr);

        await stepController.wait();
        messageController.message(
            "将收集到的" + arr.length + "个键二分重建为平衡子树",
            MessageType.INFO
        );
        return this.build(arr, 0, arr.length - 1)!;
    }

    /**
     * 递归插入，返回新的子树根节点和是否插入成功
     * @param node 子树根节点
     * @param val 要插入的值
     * @returns [新的子树根节点, 是否插入成功]
     */
    private async insertNode(node: ScapegoatTreeNode | null, val: number):
        Promise<[ScapegoatTreeNode, boolean]> {
        if (node === null) {
            await stepController.wait();
            messageController.message("创建新节点[" + val + "]", MessageType.INFO);
            return [create(ScapegoatTreeNode, val, null, null, 1), true];
        }

        if (val === node.val) {
            messageController.message("值'" + val + "'已存在", MessageType.WARNING);
            return [node, false];
        }

        const toLeft = val < node.val!;
        await stepController.wait();
        if (toLeft) {
            messageController.message(
                val + " < " + node.val + "，向左查找插入位置",
                MessageType.INFO
            );
        } else {
            messageController.message(
                val + " > " + node.val + "，向右查找插入位置",
                MessageType.INFO
            );
        }

        const next = toLeft ? node.left : node.right;
        const [child, inserted] = await this.insertNode(next, val);
        if (!inserted) {
            return [node, false];
        }
        if (child !== next) {
            if (toLeft) {
                node._set_left(child);
            } else {
                node._set_right(child);
            }
        }

        await stepController.wait();
        messageController.message("更新节点[" + node.val + "]的size", MessageType.INFO);
        node._set_size(1 + this.sizeOf(node.left) + this.sizeOf(node.right));

        if (this.isUnbalanced(node)) {
            return [await this.rebuild(node), true];
        }
        return [node, true];
    }

    /**
     * 插入val
     * @param val 要插入的值
     */
    public async insert(val: number): Promise<void> {
        if (this.root === null) {
            await stepController.wait();
            messageController.message("创建根节点[" + val + "]", MessageType.INFO);
            this._set_root(create(ScapegoatTreeNode, val, null, null, 1));

            messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
            return;
        }

        await stepController.wait();
        messageController.message("从根节点开始查找插入位置", MessageType.INFO);
        const [newRoot, inserted] = await this.insertNode(this.root, val);
        if (!inserted) {
            return;
        }
        this._set_root(newRoot);

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 递归删除，返回新的子树根节点和是否删除成功
     * @param node 子树根节点
     * @param val 要删除的值
     * @returns [新的子树根节点, 是否删除成功]
     */
    private async deleteNode(node: ScapegoatTreeNode, val: number):
        Promise<[ScapegoatTreeNode | null, boolean]> {
        await stepController.wait();
        if (val < node.val!) {
            if (node.left === null) {
                return [node, false];
            }
            messageController.message(
                val + " < " + node.val + "，向左查找待删除节点",
                MessageType.INFO
            );
            const [child, deleted] = await this.deleteNode(node.left, val);
            if (!deleted) {
                return [node, false];
            }
            if (child !== node.left) {
                node._set_left(child);
            }
        } else if (val > node.val!) {
            if (node.right === null) {
                return [node, false];
            }
            messageController.message(
                val + " > " + node.val + "，向右查找待删除节点",
                MessageType.INFO
            );
            const [child, deleted] = await this.deleteNode(node.right, val);
            if (!deleted) {
                return [node, false];
            }
            if (child !== node.right) {
                node._set_right(child);
            }
        } else {
            if (node.left !== null && node.right !== null) {
                await stepController.wait();
                messageController.message(
                    "待删除节点有两个孩子，查找中序后继节点",
                    MessageType.INFO
                );
                let succ = node.right;
                while (succ.left !== null) {
                    succ = succ.left;
                }

                await stepController.wait();
                messageController.message(
                    "将后继节点的值复制到待删除节点",
                    MessageType.INFO
                );
                node._set_value(succ.val);

                const [child] = await this.deleteNode(node.right, succ.val!);
                if (child !== node.right) {
                    node._set_right(child);
                }
            } else {
                const child = (node.left !== null) ? node.left : node.right;

                await stepController.wait();
                messageController.message(
                    "删除节点，并将其孩子链接到父节点",
                    MessageType.INFO
                );
                node._delete();
                return [child, true];
            }
        }

        await stepController.wait();
        messageController.message("更新节点[" + node.val + "]的size", MessageType.INFO);
        node._set_size(1 + this.sizeOf(node.left) + this.sizeOf(node.right));

        if (this.isUnbalanced(node)) {
            return [await this.rebuild(node), true];
        }
        return [node, true];
    }

    /**
     * 删除val
     * @param val 要删除的值
     */
    public async delete(val: number): Promise<void> {
        if (this.root === null) {
            messageController.message("值'" + val + "'不存在", MessageType.WARNING);
            return;
        }

        await stepController.wait();
        messageController.message("从根节点开始查找待删除节点", MessageType.INFO);
        const [newRoot, deleted] = await this.deleteNode(this.root, val);
        if (!deleted) {
            messageController.message("值'" + val + "'不存在", MessageType.WARNING);
            return;
        }
        this._set_root(newRoot);

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 查找值val是否存在
     * @param val 要查找的值
     * @returns 值是否存在
     */
    public async contains(val: number): Promise<boolean> {
        let x = this.root;

        await stepController.wait();
        messageController.message("从根节点开始查找 " + val, MessageType.INFO);
        while (x !== null) {
            if (x.val === val) {
                await stepController.wait();
                messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
                return true;
            }
            const toLeft = val < x.val!;
            await stepController.wait();
            if (toLeft) {
                messageController.message(
                    val + " < " + x.val + "，向左查找",
                    MessageType.INFO
                );
                x = x.left;
            } else {
                messageController.message(
                    val + " > " + x.val + "，向右查找",
                    MessageType.INFO
                );
                x = x.right;
            }
        }

        messageController.message("值'" + val + "'不存在", MessageType.INFO);
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return false;
    }

    /**
     * 返回树中小于val的值数量
     * @param val val
     * @returns 小于val的值数量
     */
    public async small(val: number): Promise<number> {
        let x = this.root;
        let res = 0;

        while (x !== null) {
            await stepController.wait();
            if (x.val! < val) {
                const cnt = this.sizeOf(x.left) + 1;
                messageController.message(
                    x.val + " < " + val + "，加上左子树与当前节点的" + cnt + "个键，继续向右查找",
                    MessageType.INFO
                );
                res += cnt;
                x = x.right;
            } else if (x.val! > val) {
                messageController.message(
                    "节点" + x.val + " > " + val + "，继续向左查找",
                    MessageType.INFO
                );
                x = x.left;
            } else {
                const cnt = this.sizeOf(x.left);
                messageController.message(
                    x.val + " = " + val + "，加上左子树的" + cnt + "个键，统计结束",
                    MessageType.INFO
                );
                res += cnt;
                break;
            }
        }

        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return res;
    }

    /**
     * 查询val为第几小的值
     * @param val val
     * @returns val的排名（不存在时返回null）
     */
    public async rank(val: number): Promise<number | null> {
        await stepController.wait();
        messageController.message("查询键'" + val + "'的排名", MessageType.INFO);
        const res = await this.small(val);
        if (this.findNode(val) === null) {
            messageController.message("值'" + val + "'不存在", MessageType.INFO);
            return null;
        }
        return res + 1;
    }

    /**
     * 查询第k小的键
     * @param k 排名
     * @returns 第x小的键（不存在时返回null）
     */
    public async index(k: number): Promise<number | null> {
        if (this.root === null || k < 1 || k > this.root.size) {
            messageController.message("排名" + k + "不存在", MessageType.WARNING);
            return null;
        }

        let node: ScapegoatTreeNode | null = this.root;
        while (node !== null) {
            await stepController.wait();
            if (this.sizeOf(node.left) >= k) {
                messageController.message(
                    "第" + k + "小的键在左子树，向左查找",
                    MessageType.INFO
                );
                node = node.left;
            } else if (this.sizeOf(node.left) + 1 < k) {
                k -= this.sizeOf(node.left) + 1;
                messageController.message(
                    "第" + k + "小的键在右子树，向右查找",
                    MessageType.INFO
                );
                node = node.right;
            } else {
                messageController.message(
                    "第" + k + "小的键为" + node.val,
                    MessageType.INFO
                );
                break;
            }
        }

        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return node === null ? null : node.val;
    }

    /**
     * 查询小于val的最大值（前驱）
     * @param val val
     * @returns 小于val的最大值（不存在时返回null）
     */
    public async predecessor(val: number): Promise<number | null> {
        let node = this.root;
        let res: number | null = null;

        while (node !== null) {
            await stepController.wait();
            if (node.val! >= val) {
                messageController.message(
                    "节点" + node.val + " ≥ " + val + "，向左查找",
                    MessageType.INFO
                );
                node = node.left;
            } else {
                messageController.message(
                    "节点" + node.val + " < " + val + "，暂作答案，向右查找更大的键",
                    MessageType.INFO
                );
                res = node.val!;
                node = node.right;
            }
        }

        if (res === null) {
            messageController.message("值'" + val + "'没有前驱", MessageType.INFO);
        }
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return res;
    }

    /**
     * 查询大于val的最小值（后继）
     * @param val val
     * @returns 大于val的最小值（不存在时返回null）
     */
    public async successor(val: number): Promise<number | null> {
        let node = this.root;
        let res: number | null = null;

        while (node !== null) {
            await stepController.wait();
            if (node.val! <= val) {
                messageController.message(
                    node.val + " ≤ " + val + "，向右查找",
                    MessageType.INFO
                );
                node = node.right;
            } else {
                messageController.message(
                    node.val + " > " + val + "，暂作答案，继续向左查找更小的值",
                    MessageType.INFO
                );
                res = node.val!;
                node = node.left;
            }
        }

        if (res === null) {
            messageController.message("值'" + val + "'没有后继", MessageType.INFO);
        }
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return res;
    }
}
