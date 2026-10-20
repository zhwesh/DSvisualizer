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

    // 当前被标记为 visited 的节点队列
    private visitedNodes: TreapTreeNode[] = [];

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
    private setVisited(node: TreapTreeNode): void {
        this.clearVisited();
        node._set_visited(true);
        this.visitedNodes.push(node);
    }

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
        this.clearVisited();
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
     * 获取根节点（可视化层只读访问）
     * @returns 根节点，空树时为null
     */
    public getRootNode(): TreapTreeNode | null {
        return this.root;
    }

    /**
     * 查找val是否存在
     * @param val 要查找的值
     * @returns 值是否存在
     */
    public async contains(val: number): Promise<boolean> {
        let x = this.root;

        while (x !== null) {
            this.setVisited(x);
            if (x.val === val) {
                messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
                await stepController.wait();

                this.clearVisited();
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
     * 递归插入，返回新的子树根节点和是否插入成功
     * @param node 子树根节点
     * @param val 要插入的值
     * @returns [新的子树根节点, 是否插入成功]
     */
    private async insertNode(node: TreapTreeNode | null, val: number):
        Promise<[TreapTreeNode, boolean]> {
        if (node === null) {
            const priority = this.randomPriority();
            messageController.message(
                "创建新节点" + val + "，随机优先级为" + priority,
                MessageType.INFO
            );
            node = create(TreapTreeNode, val, null, null, priority)
            this.setVisited(node);
            await stepController.wait();

            return [node, true];
        }

        if (node.val === val) {
            messageController.message("值'" + val + "'已存在", MessageType.WARNING);
            return [node, false];
        }

        this.setVisited(node);
        const toLeft = val < node.val!;
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
        await stepController.wait();

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
            this.setVisited(node);
            messageController.message(
                node.left.priority + " < " + node.priority + "，右旋",
                MessageType.INFO
            );
            return [node._rotate_right(), true];
        }
        if (!toLeft && node.right !== null &&
            node.right.priority < node.priority) {
            await stepController.wait();
            this.setVisited(node);
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
            messageController.message(
                "创建根节点" + val + "，随机优先级为" + priority,
                MessageType.INFO
            );
            this._set_root(create(TreapTreeNode, val, null, null, priority));
            this.setVisited(this.root!);
            ++this.sz;

            await stepController.wait();
            this.clearVisited();
            messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
            return;
        }

        const [newRoot, inserted] = await this.insertNode(this.root, val);
        if (!inserted) {
            this.clearVisited();
            return;
        }
        this._set_root(newRoot);
        ++this.sz;
        this.clearVisited();

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

        this.setVisited(node);
        if (val < node.val!) {
            if (node.left === null) {
                return [node, false];
            }
            messageController.message(
                val + " < " + node.val + "，向左查找待删除节点",
                MessageType.INFO
            );
            await stepController.wait();

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
            await stepController.wait();

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
        this.setVisited(node);
        if (node.left === null && node.right === null) {
            messageController.message("待删除节点为叶子节点，直接删除", MessageType.INFO);
            node._delete();
            await stepController.wait();

            return [null, true];
        }
        if (node.right === null) {
            const child = node.left;
            messageController.message("待删除节点只有左孩子，用左孩子替代", MessageType.INFO);
            node._delete();
            await stepController.wait();

            return [child, true];
        }
        if (node.left === null) {
            const child = node.right;
            messageController.message("待删除节点只有右孩子，用右孩子替代", MessageType.INFO);
            node._delete();
            await stepController.wait();

            return [child, true];
        }

        // 左右孩子都存在，将优先级较小的孩子旋转上来，再递归删除
        if (node.left.priority < node.right.priority) {
            messageController.message(
                node.left.priority + " < " + node.right.priority + "，右旋",
                MessageType.INFO
            );
            node = node._rotate_right();
            const [child, deleted] = await this.deleteNode(node.right, val);
            if (child !== node.right) {
                node._set_right(child);
            }
            await stepController.wait();

            return [node, deleted];
        } else {
            messageController.message(
                node.left.priority + " ≥ " + node.right.priority + "，左旋",
                MessageType.INFO
            );
            node = node._rotate_left();
            const [child, deleted] = await this.deleteNode(node.left, val);
            if (child !== node.left) {
                node._set_left(child);
            }
            await stepController.wait();

            return [node, deleted];
        }
    }

    /**
     * 删除val
     * @param val 要删除的值
     */
    public async delete(val: number): Promise<void> {
        if (this.root === null) {
            this.clearVisited();
            messageController.message("值'" + val + "'不存在", MessageType.WARNING);
            return;
        }

        const [newRoot, deleted] = await this.deleteNode(this.root, val);
        if (!deleted) {
            this.clearVisited();
            messageController.message("值'" + val + "'不存在", MessageType.WARNING);
            return;
        }
        this._set_root(newRoot);
        --this.sz;
        this.clearVisited();

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }
}
