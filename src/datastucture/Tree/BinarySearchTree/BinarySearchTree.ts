import { BinarySearchTreeNode } from "../../../node/BinaryTreeNode/impl/BinarySearchTreeNode/BinarySearchTreeNode"
import { create } from "../../../node/factory";
import { MessageController, MessageType, SuccessMessage } from "../../../controller/MessageController";
import { StepController } from "../../../controller/StepController";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 二叉搜索树
 */
export class BinarySearchTree {
    /**
     * 设置根节点
     * @param root 要设置的根节点
     */
    public _set_root(root: BinarySearchTreeNode<any> | null): void {
        this.root = root;
    }

    /************************************************** */

    /**
     * 动画效果：清空二叉搜索树
     */
    public _clear(): void {
        this._set_root(null);
        this.sz = 0;
    }

    private root!: BinarySearchTreeNode<any> | null;    // 根节点
    private sz: number;                                 // 节点数量

    constructor() {
        this._set_root(null);
        this.sz = 0;
    }

    // 清除所有元素
    public clear(): void {
        if (this.root === null) {
            messageController.message("二叉搜索树已经为空", MessageType.WARNING);
            return;
        }

        this._clear();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.sz === 0;
    }

    // 元素个数
    public size(): number {
        return this.sz;
    }

    /**
     * 查找val是否存在
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

        messageController.message("值'" + val + "'不存在", MessageType.WARNING);
        return false;
    }

    /**
     * 插入val
     * @param val 要插入的值
     */
    public async insert(val: number): Promise<void> {
        if (this.root === null) {
            await stepController.wait();
            messageController.message("创建根节点", MessageType.INFO);
            this._set_root(create(BinarySearchTreeNode, val, null, null));
            ++this.sz;

            messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
            return;
        }

        await stepController.wait();
        messageController.message("从根节点开始查找插入位置", MessageType.INFO);
        let x: BinarySearchTreeNode<any> = this.root;
        while (true) {
            if (x.val === val) {
                messageController.message("值'" + val + "'已存在", MessageType.WARNING);
                return;
            }
            const toLeft = val < x.val!;

            await stepController.wait();
            if (toLeft) {
                messageController.message(
                    val + " 小于 " + x.val + "，向左查找",
                    MessageType.INFO
                );
            } else {
                messageController.message(
                    val + " 大于 " + x.val + "，向右查找",
                    MessageType.INFO
                );
            }
            const next = toLeft ? x.left : x.right;

            if (next === null) {
                await stepController.wait();
                messageController.message("创建新节点", MessageType.INFO);
                const node = create(BinarySearchTreeNode, val, null, null);

                await stepController.wait();
                messageController.message("将新节点链接到树中", MessageType.INFO);
                if (toLeft) {
                    x._set_left(node);
                } else {
                    x._set_right(node);
                }
                ++this.sz;

                messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
                return;
            }
            x = next;
        }
    }

    /**
     * 删除val
     * @param val 要删除的值
     */
    public async delete(val: number): Promise<void> {
        await stepController.wait();
        messageController.message("从根节点开始查找待删除节点", MessageType.INFO);

        let x: BinarySearchTreeNode<any> | null = this.root;
        let f: BinarySearchTreeNode<any> | null = null;
        while (x !== null && x.val !== val) {
            const toLeft = val < x.val!;
            await stepController.wait();
            if (toLeft) {
                messageController.message(
                    val + " < " + x.val + "，向左查找",
                    MessageType.INFO
                );
            } else {
                messageController.message(
                    val + " > " + x.val + "，向右查找",
                    MessageType.INFO
                );
            }
            f = x;
            x = toLeft ? x.left : x.right;
        }
        if (x === null) {
            messageController.message("值'" + val + "'不存在", MessageType.WARNING);
            return;
        }

        if (x.left !== null && x.right !== null) {
            await stepController.wait();
            messageController.message(
                "待删除节点有两个孩子，查找中序后继节点",
                MessageType.INFO
            );
            let y: BinarySearchTreeNode<any> = x.right;
            let fy: BinarySearchTreeNode<any> = x;
            while (y.left !== null) {
                fy = y;
                y = y.left;
            }

            await stepController.wait();
            messageController.message("将后继节点的值复制到待删除节点", MessageType.INFO);
            x._set_value(y.val);
            x = y;
            f = fy;
        }

        const child = (x.left !== null) ? x.left : x.right;

        await stepController.wait();
        messageController.message("删除节点，并将其孩子链接到父节点", MessageType.INFO);
        if (f === null) {
            this._set_root(child);
        } else if (f.left === x) {
            f._set_left(child);
        } else {
            f._set_right(child);
        }

        await stepController.wait();
        messageController.message("删除节点", MessageType.INFO);
        x._delete();
        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }
}
