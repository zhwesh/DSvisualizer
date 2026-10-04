import { RedBlackTreeNode, _RB_tree_red, _RB_tree_black } from "../../../node/BinaryTreeNode/impl/BinarySearchTreeNode/impl/RedBlackTreeNode"
import { create } from "../../../node/factory";
import { MessageController, MessageType, SuccessMessage } from "../../../controller/MessageController";
import { StepController } from "../../../controller/StepController";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 红黑树（无父指针，递归返回新的子树根节点）
 */
export class RedBlackTree {
    /**
     * 设置根节点
     * @param root 要设置的根节点
     */
    public _set_root(root: RedBlackTreeNode | null): void {
        this.root = root;
    }

    /************************************************** */

    /**
     * 动画效果：清空红黑树
     */
    public _clear(): void {
        this._set_root(null);
        this.sz = 0;
    }

    // 获取节点颜色
    public getColor(x: RedBlackTreeNode | null): boolean {
        return (x === null) ? _RB_tree_black : x.color;
    }

    private root!: RedBlackTreeNode | null;                     // 根节点
    private sz: number;                                         // 节点数量

    constructor() {
        this._set_root(null);
        this.sz = 0;
    }

    // 清除所有元素
    public clear(): void {
        if (this.root === null) {
            messageController.message("红黑树已经为空", MessageType.WARNING);
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

    // 插入后调整平衡，返回调整后的子树根节点
    private async insertBalance(x: RedBlackTreeNode): Promise<RedBlackTreeNode> {
        if (this.getColor(x.left) === _RB_tree_red &&
            (this.getColor(x.left!.left) === _RB_tree_red ||
             this.getColor(x.left!.right) === _RB_tree_red)) {
            if (this.getColor(x.right) === _RB_tree_red) {
                await stepController.wait();
                messageController.message(
                    "节点" + x.val + "的左右孩子均为红色，交换颜色",
                    MessageType.INFO
                );
                x.left!._set_color(_RB_tree_black);
                x.right!._set_color(_RB_tree_black);
                x._set_color(_RB_tree_red);
                return x;
            }
            if (this.getColor(x.left!.left) === _RB_tree_red) {
                await stepController.wait();
                messageController.message(
                    "节点" + x.val + "出现连续两个红色左孩子，右旋",
                    MessageType.INFO
                );
                x.left!._set_color(_RB_tree_black);
                x._set_color(_RB_tree_red);
                return x._rotate_right();
            }
            await stepController.wait();
            messageController.message(
                "节点" + x.val + "的左孩子的右孩子为红色，先左旋节点" + x.left!.val + "，再右旋节点" + x.val,
                MessageType.INFO
            );
            x._set_left(x.left!._rotate_left());
            x.left!._set_color(_RB_tree_black);
            x._set_color(_RB_tree_red);
            return x._rotate_right();
        }
        if (this.getColor(x.right) === _RB_tree_red &&
            (this.getColor(x.right!.left) === _RB_tree_red ||
             this.getColor(x.right!.right) === _RB_tree_red)) {
            if (this.getColor(x.left) === _RB_tree_red) {
                await stepController.wait();
                messageController.message(
                    "节点" + x.val + "的左右孩子均为红色，交换颜色",
                    MessageType.INFO
                );
                x.left!._set_color(_RB_tree_black);
                x.right!._set_color(_RB_tree_black);
                x._set_color(_RB_tree_red);
                return x;
            }
            if (this.getColor(x.right!.right) === _RB_tree_red) {
                await stepController.wait();
                messageController.message(
                    "节点" + x.val + "出现连续两个红色右孩子，左旋节点" + x.val,
                    MessageType.INFO
                );
                x.right!._set_color(_RB_tree_black);
                x._set_color(_RB_tree_red);
                return x._rotate_left();
            }
            await stepController.wait();
            messageController.message(
                "节点" + x.val + "的右孩子的左孩子为红色，先右旋节点" + x.right!.val + "，再左旋节点" + x.val,
                MessageType.INFO
            );
            x._set_right(x.right!._rotate_right());
            x.right!._set_color(_RB_tree_black);
            x._set_color(_RB_tree_red);
            return x._rotate_left();
        }
        return x;
    }

    // 递归插入，返回新的子树根节点和是否插入成功
    private async insertNode(x: RedBlackTreeNode, val: number):
        Promise<[RedBlackTreeNode, boolean]> {
        if (x.val === val) {
            messageController.message("值'" + val + "'已存在", MessageType.WARNING);
            return [x, false];
        }
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

        const next = toLeft ? x.left : x.right;
        if (next === null) {
            await stepController.wait();
            messageController.message("创建新节点", MessageType.INFO);
            const node = create(RedBlackTreeNode, val, null, null, _RB_tree_red);

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

        return [await this.insertBalance(x), true];
    }

    /**
     * 插入val
     * @param val 要插入的值
     */
    public async insert(val: number): Promise<void> {
        if (this.root === null) {
            await stepController.wait();
            messageController.message("创建根节点", MessageType.INFO);
            this._set_root(create(RedBlackTreeNode, val, null, null, _RB_tree_red));
            this.root!._set_color(_RB_tree_black);
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
        if (this.getColor(this.root) === _RB_tree_red) {
            await stepController.wait();
            messageController.message("将根节点设为黑色", MessageType.INFO);
            this.root!._set_color(_RB_tree_black);
        }
        ++this.sz;

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    // 处理孩子子树缺一个黑的情况，返回新的子树根节点和是否还需向上修复
    private async fixDeficit(x: RedBlackTreeNode, toLeft: boolean):
        Promise<[RedBlackTreeNode, boolean]> {
        const child = toLeft ? x.left : x.right;
        if (child !== null && this.getColor(child) === _RB_tree_red) {
            await stepController.wait();
            messageController.message(
                "将节点" + child.val + "设为黑色，修复结束",
                MessageType.INFO
            );
            child._set_color(_RB_tree_black);
            return [x, false];
        }
        return toLeft ? await this.fixLeft(x) : await this.fixRight(x);
    }

    // 修复左子树缺一个黑色节点，返回新的子树根节点和是否还需向上修复
    private async fixLeft(x: RedBlackTreeNode):
        Promise<[RedBlackTreeNode, boolean]> {
        const s = x.right!;
        if (this.getColor(s) === _RB_tree_red) {
            await stepController.wait();
            messageController.message(
                "兄弟节点为红色，左旋节点" + x.val,
                MessageType.INFO
            );
            s._set_color(_RB_tree_black);
            x._set_color(_RB_tree_red);
            const nx = x._rotate_left();
            const [fixed, deficit] = await this.fixLeft(x);
            nx._set_left(fixed);
            return [nx, deficit];
        }
        if (this.getColor(s.left) === _RB_tree_black &&
            this.getColor(s.right) === _RB_tree_black) {
            await stepController.wait();
            messageController.message(
                "兄弟节点为黑色且两个孩子均为黑色，将兄弟节点设为红色",
                MessageType.INFO
            );
            s._set_color(_RB_tree_red);
            if (this.getColor(x) === _RB_tree_red) {
                await stepController.wait();
                messageController.message(
                    "将节点" + x.val + "设为黑色，修复结束",
                    MessageType.INFO
                );
                x._set_color(_RB_tree_black);
                return [x, false];
            }
            return [x, true];
        }
        if (this.getColor(s.right) === _RB_tree_red) {
            await stepController.wait();
            messageController.message(
                "兄弟节点的右孩子为红色，调整颜色并左旋节点" + x.val,
                MessageType.INFO
            );
            s._set_color(this.getColor(x));
            x._set_color(_RB_tree_black);
            s.right!._set_color(_RB_tree_black);
            return [x._rotate_left(), false];
        }

        await stepController.wait();
        messageController.message(
            "兄弟节点的左孩子为红色，先右旋兄弟节点，再左旋节点" + x.val,
            MessageType.INFO
        );
        s._set_color(_RB_tree_red);
        s.left!._set_color(_RB_tree_black);
        const z = s._rotate_right();
        x._set_right(z);
        z._set_color(this.getColor(x));
        x._set_color(_RB_tree_black);
        z.right!._set_color(_RB_tree_black);
        return [x._rotate_left(), false];
    }

    // 修复右子树缺一个黑色节点，返回新的子树根节点和是否还需向上修复
    private async fixRight(x: RedBlackTreeNode):
        Promise<[RedBlackTreeNode, boolean]> {
        const s = x.left!;
        if (this.getColor(s) === _RB_tree_red) {
            await stepController.wait();
            messageController.message(
                "兄弟节点为红色，右旋节点" + x.val,
                MessageType.INFO
            );
            s._set_color(_RB_tree_black);
            x._set_color(_RB_tree_red);
            const nx = x._rotate_right();
            const [fixed, deficit] = await this.fixRight(x);
            nx._set_right(fixed);
            return [nx, deficit];
        }
        if (this.getColor(s.left) === _RB_tree_black &&
            this.getColor(s.right) === _RB_tree_black) {
            await stepController.wait();
            messageController.message(
                "兄弟节点为黑色且两个孩子均为黑色，将兄弟节点设为红色",
                MessageType.INFO
            );
            s._set_color(_RB_tree_red);
            if (this.getColor(x) === _RB_tree_red) {
                await stepController.wait();
                messageController.message(
                    "将节点" + x.val + "设为黑色，修复结束",
                    MessageType.INFO
                );
                x._set_color(_RB_tree_black);
                return [x, false];
            }
            return [x, true];
        }
        if (this.getColor(s.left) === _RB_tree_red) {
            await stepController.wait();
            messageController.message(
                "兄弟节点的左孩子为红色，调整颜色并右旋节点" + x.val,
                MessageType.INFO
            );
            s._set_color(this.getColor(x));
            x._set_color(_RB_tree_black);
            s.left!._set_color(_RB_tree_black);
            return [x._rotate_right(), false];
        }
        await stepController.wait();
        messageController.message(
            "兄弟节点的右孩子为红色，先左旋兄弟节点，再右旋节点" + x.val,
            MessageType.INFO
        );
        s._set_color(_RB_tree_red);
        s.right!._set_color(_RB_tree_black);
        const z = s._rotate_left();
        x._set_left(z);
        z._set_color(this.getColor(x));
        x._set_color(_RB_tree_black);
        z.left!._set_color(_RB_tree_black);
        return [x._rotate_right(), false];
    }

    // 递归删除子树中的最小节点，返回新的子树根节点和是否缺一个黑
    private async eraseMin(x: RedBlackTreeNode):
        Promise<[RedBlackTreeNode | null, boolean]> {
        if (x.left === null) {
            const child = x.right;
            await stepController.wait();
            messageController.message(
                "删除后继节点，并将其孩子链接到父节点",
                MessageType.INFO
            );

            await stepController.wait();
            messageController.message("删除节点", MessageType.INFO);
            const black = this.getColor(x) === _RB_tree_black;
            x._delete();
            return [child, black];
        }

        const [newLeft, deficit] = await this.eraseMin(x.left);
        if (newLeft !== x.left) {
            x._set_left(newLeft);
        }
        if (deficit) {
            return await this.fixDeficit(x, true);
        }
        return [x, false];
    }

    // 递归删除，返回新的子树根节点、是否删除成功和是否缺一个黑
    private async eraseNode(x: RedBlackTreeNode, val: number):
        Promise<[RedBlackTreeNode | null, boolean, boolean]> {
        if (val < x.val!) {
            if (x.left === null) {
                return [x, false, false];
            }
            await stepController.wait();
            messageController.message(
                val + " < " + x.val + "，向左查找",
                MessageType.INFO
            );
            const [child, deleted, deficit] = await this.eraseNode(x.left, val);
            if (!deleted) {
                return [x, false, false];
            }
            if (child !== x.left) {
                x._set_left(child);
            }
            if (deficit) {
                const [newRoot, d] = await this.fixDeficit(x, true);
                return [newRoot, true, d];
            }
            return [x, true, false];
        } else if (val > x.val!) {
            if (x.right === null) {
                return [x, false, false];
            }
            await stepController.wait();
            messageController.message(
                val + " > " + x.val + "，向右查找",
                MessageType.INFO
            );
            const [child, deleted, deficit] = await this.eraseNode(x.right, val);
            if (!deleted) {
                return [x, false, false];
            }
            if (child !== x.right) {
                x._set_right(child);
            }
            if (deficit) {
                const [newRoot, d] = await this.fixDeficit(x, false);
                return [newRoot, true, d];
            }
            return [x, true, false];
        } else {
            if (x.left !== null && x.right !== null) {
                await stepController.wait();
                messageController.message(
                    "待删除节点有两个孩子，查找中序后继节点",
                    MessageType.INFO
                );
                let succ = x.right;
                while (succ.left !== null) {
                    succ = succ.left;
                }

                await stepController.wait();
                messageController.message(
                    "将后继节点的值复制到待删除节点",
                    MessageType.INFO
                );
                x._set_value(succ.val);

                const [newRight, deficit] = await this.eraseMin(x.right);
                if (newRight !== x.right) {
                    x._set_right(newRight);
                }
                if (deficit) {
                    const [newRoot, d] = await this.fixDeficit(x, false);
                    return [newRoot, true, d];
                }
                return [x, true, false];
            }

            const child = (x.left !== null) ? x.left : x.right;
            await stepController.wait();
            messageController.message(
                "删除节点，并将其孩子链接到父节点",
                MessageType.INFO
            );

            await stepController.wait();
            messageController.message("删除节点", MessageType.INFO);
            const black = this.getColor(x) === _RB_tree_black;
            x._delete();
            return [child, true, black];
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
        const [newRoot, deleted, deficit] = await this.eraseNode(this.root, val);
        if (!deleted) {
            messageController.message("值'" + val + "'不存在", MessageType.WARNING);
            return;
        }
        this._set_root(newRoot);
        if (deficit && this.root !== null) {
            await stepController.wait();
            messageController.message("将根节点设为黑色，修复结束", MessageType.INFO);
            this.root._set_color(_RB_tree_black);
        }
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
}
