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

    // 当前被标记为 visited 的节点队列
    private visitedNodes: BinarySearchTreeNode<any>[] = [];

    /**
     * 清除队列中所有节点的 visited 标记。
     */
    private clearVisited(): void {
        for (const node of this.visitedNodes) {
            node._set_visited(false);
        }
        this.visitedNodes.length = 0;
    }

    /**
     * 标记当前访问节点，并清除之前的 visited 标记。
     * @param node 当前访问节点
     */
    private setkVisited(node: BinarySearchTreeNode<any>): void {
        this.clearVisited();
        node._set_visited(true);
        this.visitedNodes.push(node);
    }

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
        this.clearVisited();
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
     * 获取根节点（可视化层只读访问）
     * @returns 根节点，空树时为null
     */
    public getRootNode(): BinarySearchTreeNode<any> | null {
        return this.root;
    }

    /**
     * 查找val是否存在
     * @param val 要查找的值
     * @returns 值是否存在
     */
    public async contains(val: number): Promise<boolean> {
        let x = this.root;

        messageController.message("从根节点开始查找 " + val, MessageType.INFO);
        await stepController.wait();
        while (x !== null) {
            this.setkVisited(x);
            if (x.val === val) {    
                await stepController.wait();
                this.clearVisited();
                messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
                return true;
            }
            const toLeft = val < x.val!;
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
            await stepController.wait();
        }

        this.clearVisited();
        messageController.message("值'" + val + "'不存在", MessageType.WARNING);
        return false;
    }

    /**
     * 插入val
     * @param val 要插入的值
     */
    public async insert(val: number): Promise<void> {
        if (this.root === null) {
            messageController.message("创建根节点", MessageType.INFO);
            this._set_root(create(BinarySearchTreeNode, val, null, null));
            ++this.sz;
            await stepController.wait();

            messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
            return;
        }

        messageController.message("从根节点开始查找插入位置", MessageType.INFO);
        let x: BinarySearchTreeNode<any> = this.root;
        await stepController.wait();
        while (true) {
            this.setkVisited(x);
            if (x.val === val) {
                await stepController.wait();
                this.clearVisited();
                messageController.message("值'" + val + "'已存在", MessageType.WARNING);
                return;
            }
            const toLeft = val < x.val!;

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
            await stepController.wait();

            if (next === null) {
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
                await stepController.wait();

                this.clearVisited();
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
        messageController.message("从根节点开始查找待删除节点", MessageType.INFO);
        let x: BinarySearchTreeNode<any> | null = this.root;
        let f: BinarySearchTreeNode<any> | null = null;
        await stepController.wait();
        while (x !== null && x.val !== val) {
            const toLeft = val < x.val!;
            this.setkVisited(x);
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
            await stepController.wait();
        }
        if (x === null) {
            this.clearVisited();
            messageController.message("值'" + val + "'不存在", MessageType.WARNING);
            return;
        }

        // 命中：高亮待删除节点，直至删除完成
        this.setkVisited(x);
        if (x.left !== null && x.right !== null) {
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
            await stepController.wait();
        }

        const child = (x.left !== null) ? x.left : x.right;

        messageController.message("并将其孩子链接到父节点", MessageType.INFO);
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
        this.clearVisited();
        await stepController.wait();

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }
}
