import { TreapTreeNode } from "../../../node/BinaryTreeNode/impl/BinarySearchTreeNode/impl/TreapTreeNode";
import { create } from "../../../node/factory";
import { MessageController, MessageType, SuccessMessage } from "../../../controller/MessageController";
import { StepController } from "../../../controller/StepController";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

// 随机优先级的上界（不含）
const TreapTree_PriorityRange: number = 1000;

/**
 * Treap树
 * 
 * 按二叉搜索树维护键，按小根堆维护随机优先级
 */
export class TreapTree {
    /**
     * 设置根节点
     * @param root 要设置的根节点
     */
    public _set_root(root: TreapTreeNode | null): void {
        this.root = root;
    }

    /**
     * 动画效果：清空Treap树
     */
    public _clear(): void {
        this._set_root(null);
        this.sz = 0;
    }

    /************************************************** */

    private root!: TreapTreeNode | null;    // 根节点
    private sz: number;                     // 节点数量

    constructor() {
        this._set_root(null);
        this.sz = 0;
    }

    // 随机生成一个优先级
    private randomPriority(): number {
        return Math.floor(Math.random() * TreapTree_PriorityRange);
    }

    // 清除所有键
    public clear(): void {
        if (this.sz === 0) {
            messageController.message("Treap树已经为空", MessageType.WARNING);
            return;
        }

        this._clear();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.sz === 0;
    }

    // 键数量
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

        while (x !== null) {
            await stepController.wait();
            if (x.val === val) {
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
        }

        messageController.message("值'" + val + "'不存在", MessageType.WARNING);
        return false;
    }

    /**
     * 递归插入，返回新的子树根节点和是否插入成功
     * @param node 子树根节点
     * @param val 要插入的值
     * @returns [新的子树根节点, 是否插入成功]
     */
    private async insertNode(node: TreapTreeNode | null, val: number):
        Promise<[TreapTreeNode, boolean]> {
        if (node === null) {
            const priority = this.randomPriority();
            await stepController.wait();
            messageController.message(
                "创建新节点" + val + "，随机优先级为" + priority,
                MessageType.INFO
            );
            return [create(TreapTreeNode, val, null, null, priority), true];
        }

        if (node.val === val) {
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

        // 维护小根堆：孩子优先级更小则旋转上来
        if (toLeft && node.left !== null &&
            node.left.priority < node.priority) {
            await stepController.wait();
            messageController.message(
                node.left.priority + " < " + node.priority + "，右旋",
                MessageType.INFO
            );
            return [node._rotate_right(), true];
        }
        if (!toLeft && node.right !== null &&
            node.right.priority < node.priority) {
            await stepController.wait();
            messageController.message(
                node.right.priority + " < " + node.priority + "，左旋",
                MessageType.INFO
            );
            return [node._rotate_left(), true];
        }
        return [node, true];
    }

    /**
     * 插入val
     * @param val 要插入的值
     */
    public async insert(val: number): Promise<void> {
        if (this.root === null) {
            const priority = this.randomPriority();
            await stepController.wait();
            messageController.message(
                "创建根节点" + val + "，随机优先级为" + priority,
                MessageType.INFO
            );
            this._set_root(create(TreapTreeNode, val, null, null, priority));
            ++this.sz;

            messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
            return;
        }

        const [newRoot, inserted] = await this.insertNode(this.root, val);
        if (!inserted) {
            return;
        }
        this._set_root(newRoot);
        ++this.sz;

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 递归删除，返回新的子树根节点和是否删除成功
     * @param node 子树根节点
     * @param val 要删除的值
     * @returns [新的子树根节点, 是否删除成功]
     */
    private async deleteNode(node: TreapTreeNode | null, val: number):
        Promise<[TreapTreeNode | null, boolean]> {
        if (node === null) {
            return [null, false];
        }

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
            return [node, true];
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
            return [node, true];
        }

        // 找到待删除节点
        if (node.left === null && node.right === null) {
            await stepController.wait();
            messageController.message("待删除节点为叶子节点，直接删除", MessageType.INFO);
            node._delete();
            return [null, true];
        }
        if (node.right === null) {
            const child = node.left;
            await stepController.wait();
            messageController.message("待删除节点只有左孩子，用左孩子替代", MessageType.INFO);
            node._delete();
            return [child, true];
        }
        if (node.left === null) {
            const child = node.right;
            await stepController.wait();
            messageController.message("待删除节点只有右孩子，用右孩子替代", MessageType.INFO);
            node._delete();
            return [child, true];
        }

        // 左右孩子都存在，将优先级较小的孩子旋转上来，再递归删除
        if (node.left.priority < node.right.priority) {
            await stepController.wait();
            messageController.message(
                node.left.priority + " < " + node.right.priority + "，右旋",
                MessageType.INFO
            );
            const newRoot = node._rotate_right();
            const [child, deleted] = await this.deleteNode(newRoot.right, val);
            if (child !== newRoot.right) {
                newRoot._set_right(child);
            }
            return [newRoot, deleted];
        } else {
            await stepController.wait();
            messageController.message(
                node.left.priority + " ≤ " + node.right.priority + "较小，左旋",
                MessageType.INFO
            );
            const newRoot = node._rotate_left();
            const [child, deleted] = await this.deleteNode(newRoot.left, val);
            if (child !== newRoot.left) {
                newRoot._set_left(child);
            }
            return [newRoot, deleted];
        }
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

        const [newRoot, deleted] = await this.deleteNode(this.root, val);
        if (!deleted) {
            messageController.message("值'" + val + "'不存在", MessageType.WARNING);
            return;
        }
        this._set_root(newRoot);
        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }
}
