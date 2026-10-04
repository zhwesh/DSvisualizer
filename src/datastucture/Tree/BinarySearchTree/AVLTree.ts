import { AVLTreeNode } from "../../../node/BinarySearchTreeNode/impl/AVLTreeNode"
import { create } from "../../../node/factory";
import { MessageController, MessageType, SuccessMessage } from "../../../controller/MessageController";
import { StepController } from "../../../controller/StepController";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * AVL树（无父指针，递归返回新的子树根节点）
 */
export class AVLTree {
    /**
     * 设置根节点
     * @param root 要设置的根节点
     */
    public _set_root(root: AVLTreeNode | null): void {
        this.root = root;
    }

    /************************************************** */

    /**
     * 动画效果：清空AVL树
     */
    public _clear(): void {
        this._set_root(null);
        this.sz = 0;
    }

    private root!: AVLTreeNode | null;                  // 根节点
    private sz: number;                                 // 节点数量

    constructor() {
        this._set_root(null);
        this.sz = 0;
    }

    // 清除所有元素
    public clear(): void {
        if (this.root === null) {
            messageController.message("AVL树已经为空", MessageType.WARNING);
            return;
        }

        this._clear();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.root === null;
    }

    // 元素个数
    public size(): number {
        return this.sz;
    }

    // 获取节点高度
    public getHeight(x: AVLTreeNode | null): number {
        return (x === null) ? 0 : x.height;
    }

    // 更新节点高度
    private async updateHeight(x: AVLTreeNode): Promise<void> {
        const h = Math.max(this.getHeight(x.left), this.getHeight(x.right)) + 1;

        await stepController.wait();
        messageController.message("将节点" + x.val + "的高度更新为" + h, MessageType.INFO);
        x._set_height(h);
    }

    // 调整平衡，返回调整后的子树根节点
    private async balance(x: AVLTreeNode): Promise<AVLTreeNode> {
        if (this.getHeight(x.left) > this.getHeight(x.right) + 1) {
            const y = x.left!;
            if (this.getHeight(y.left) < this.getHeight(y.right)) {
                await stepController.wait();
                messageController.message(
                    "节点" + x.val + "的左孩子的右子树过高，左旋节点" + y.val,
                    MessageType.INFO
                );
                x._set_left(y._rotate_left());
            }

            await stepController.wait();
            messageController.message(
                "节点" + x.val + "的左子树过高，右旋节点" + x.val,
                MessageType.INFO
            );
            return x._rotate_right();
        } else if (this.getHeight(x.right) > this.getHeight(x.left) + 1) {
            const y = x.right!;
            if (this.getHeight(y.right) < this.getHeight(y.left)) {
                await stepController.wait();
                messageController.message(
                    "节点" + x.val + "的右孩子的左子树过高，右旋节点" + y.val,
                    MessageType.INFO
                );
                x._set_right(y._rotate_right());
            }

            await stepController.wait();
            messageController.message(
                "节点" + x.val + "的右子树过高，左旋节点" + x.val,
                MessageType.INFO
            );
            return x._rotate_left();
        } else {
            return x;
        }
    }

    // 递归插入，返回新的子树根节点/是否插入成功
    private async insertNode(x: AVLTreeNode, val: number): Promise<[AVLTreeNode, boolean]> {
        if (x.val === val) {
            messageController.message("值'" + val + "'已存在", MessageType.WARNING);
            return [x, false];
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
            const node = create(AVLTreeNode, val, null, null, 1);

            await stepController.wait();
            messageController.message("将新节点链接到树中", MessageType.INFO);
            if (toLeft) {
                x._set_left(node);
            } else {
                x._set_right(node);
            }
        } else {
            const [child, inserted] = await this.insertNode(next, val);
            if (!inserted) {
                return [x, false];
            }
            if (child !== next) {
                if (toLeft) {
                    x._set_left(child);
                } else {
                    x._set_right(child);
                }
            }
        }
        await this.updateHeight(x);
        return [await this.balance(x), true];
    }

    /**
     * 插入val
     * @param val 要插入的值
     */
    public async insert(val: number): Promise<void> {
        if (this.root === null) {
            await stepController.wait();
            messageController.message("创建根节点", MessageType.INFO);
            this._set_root(create(AVLTreeNode, val, null, null, 1));
            ++this.sz;

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
        ++this.sz;

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    // 递归删除子树中的最小节点，返回新的子树根节点
    private async eraseMin(x: AVLTreeNode): Promise<AVLTreeNode | null> {
        if (x.left === null) {
            const child = x.right;
            await stepController.wait();
            messageController.message("删除后继节点，并将其孩子链接到父节点", MessageType.INFO);

            await stepController.wait();
            messageController.message("删除节点", MessageType.INFO);
            x._delete();
            return child;
        }

        const child = await this.eraseMin(x.left);
        if (child !== x.left) {
            x._set_left(child);
        }
        await this.updateHeight(x);
        return await this.balance(x);
    }

    // 递归删除，返回新的子树根节点和是否删除成功
    private async eraseNode(x: AVLTreeNode, val: number): Promise<[AVLTreeNode | null, boolean]> {
        if (val < x.val!) {
            if (x.left === null) {
                return [x, false];
            }
            
            await stepController.wait();
            messageController.message(val + " < " + x.val + "，向左查找", MessageType.INFO);
            const [child, deleted] = await this.eraseNode(x.left, val);
            if (!deleted) {
                return [x, false];
            }
            if (child !== x.left) {
                x._set_left(child);
            }
            await this.updateHeight(x);
            return [await this.balance(x), true];
        } else if (val > x.val!) {
            if (x.right === null) {
                return [x, false];
            }

            await stepController.wait();
            messageController.message(val + " > " + x.val + "，向右查找", MessageType.INFO);
            const [child, deleted] = await this.eraseNode(x.right, val);
            if (!deleted) {
                return [x, false];
            }
            if (child !== x.right) {
                x._set_right(child);
            }
            await this.updateHeight(x);
            return [await this.balance(x), true];
        } else {
            if (x.left !== null && x.right !== null) {
                await stepController.wait();
                messageController.message("待删除节点有两个孩子，查找中序后继节点", MessageType.INFO);
                let succ = x.right;
                while (succ.left !== null) {
                    succ = succ.left;
                }

                await stepController.wait();
                messageController.message("将后继节点的值复制到待删除节点", MessageType.INFO);
                x._set_value(succ.val);

                const child = await this.eraseMin(x.right);
                if (child !== x.right) {
                    x._set_right(child);
                }
                await this.updateHeight(x);
                return [await this.balance(x), true];
            }

            const child = (x.left !== null) ? x.left : x.right;

            await stepController.wait();
            messageController.message("删除节点", MessageType.INFO);
            x._delete();
            return [child, true];
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

        await stepController.wait();
        messageController.message("从根节点开始查找待删除节点", MessageType.INFO);
        const [newRoot, deleted] = await this.eraseNode(this.root, val);
        if (!deleted) {
            messageController.message("值'" + val + "'不存在", MessageType.WARNING);
            return;
        }
        this._set_root(newRoot);
        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 查找val是否存在
     * @param val 要查找的值
     * @returns 是否存在
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
                messageController.message(val + " < " + x.val + "，向左查找", MessageType.INFO);
                x = x.left;
            } else {
                messageController.message(val + " > " + x.val + "，向右查找", MessageType.INFO);
                x = x.right;
            }
        }

        messageController.message("值'" + val + "'不存在", MessageType.WARNING);
        return false;
    }
}
