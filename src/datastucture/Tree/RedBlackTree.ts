import { RedBlackTreeNode, _RB_tree_red, _RB_tree_black } from "../../node/BinaryTreeNode/impl/RedBlackTreeNode"
import { create } from "../../node/factory";
import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 红黑树
 */
export class RedBlackTree {
    /**
     * 设置哨兵节点
     * 
     * 动画效果：将哨兵节点设置为header
     * 
     * @param header 要设置的哨兵节点
     */
    public _set_header(header: RedBlackTreeNode): void {
        this.header = header;
    }

    /************************************************** */

    /**
     * 动画效果：清空除哨兵节点外的所有节点，哨兵节点的父指针指向自己
     */
    public _clear(): void {
        this.sz = 0;
        this._set_header(
            create(
                RedBlackTreeNode,
                null, null, null,
                null, _RB_tree_red
            )
        );
        this.header._set_father(this.header);
    }

    // 获取节点颜色
    public getColor(x: RedBlackTreeNode | null): boolean {
        return (x === null) ? _RB_tree_black : x.color;
    }

    // 删除孩子个数小于2的节点
    private removeNonfullNode(x: RedBlackTreeNode): void {
        let y = (x.left === null) ? x.right : x.left;
        let f = x.father!;
        if (x.isLeftSon()) {
            f._set_left(y);
        } else if (x.isRightSon()) {
            f._set_right(y);
        } else {
            f._set_father(y);
        }
        if (y != null) {
            y._set_father(f);
        }
        x._set_father(null);
        x._set_left(null);
        x._set_right(null);
        x._delete();
    }

    // 插入后调整平衡
    private async insertBalance(x: RedBlackTreeNode): Promise<void> {
        if (x === this.root() || this.getColor(x) === _RB_tree_black) {
            if (this.getColor(x) === _RB_tree_red) {
                await stepController.wait();
                messageController.message("将根节点设为黑色", MessageType.INFO);
            }
            x._set_color(_RB_tree_black);
            return;
        }
        let f = x.father!;
        let g = f.father!;
        let s = f.brother();
        if (this.getColor(f) === _RB_tree_red) {
            if (x.isLeftSon() != f.isLeftSon()) {
                await stepController.wait();
                messageController.message(
                    "当前节点与父节点方向不同，旋转父节点",
                    MessageType.INFO
                );
                if (x.isLeftSon()) {
                    f._rotate_right();
                } else {
                    f._rotate_left();
                }
                const tmp = x;
                x = f;
                f = tmp;
            }

            await stepController.wait();
            messageController.message("旋转祖父节点", MessageType.INFO);
            if (x.isLeftSon()) {
                g._rotate_right();
            } else {
                g._rotate_left();
            }

            if (this.getColor(s) === _RB_tree_red) {
                await stepController.wait();
                messageController.message(
                    "叔叔节点为红色，将当前节点设为黑色",
                    MessageType.INFO
                );
                x._set_color(_RB_tree_black);
            } else {
                await stepController.wait();
                messageController.message(
                    "叔叔节点为黑色，交换父节点与祖父节点的颜色",
                    MessageType.INFO
                );
                f._set_color(_RB_tree_black);
                g._set_color(_RB_tree_red);
            }
        }
    }

    // 删除黑色叶子节点后调整平衡
    private async removeBlackLeafBalance(x: RedBlackTreeNode): Promise<void> {
        if (this.getColor(x) === _RB_tree_red || x === this.root()) {
            if (this.getColor(x) === _RB_tree_red) {
                await stepController.wait();
                messageController.message("将节点设为黑色，平衡结束", MessageType.INFO);
            }
            x._set_color(_RB_tree_black);
            return;
        }
        let s = x.brother()!;
        let f = x.father!;
        if (this.getColor(s) === _RB_tree_black) {
            if ((this.getColor(s.left) === _RB_tree_black) &&
                (this.getColor(s.right) === _RB_tree_black)) {
                await stepController.wait();
                messageController.message(
                    "兄弟节点为黑色且两个孩子均为黑色，将兄弟节点设为红色并向上调整",
                    MessageType.INFO
                );
                s._set_color(_RB_tree_red);
                await this.removeBlackLeafBalance(f);
            } else {
                let r = (s.isLeftSon() ?
                    (this.getColor(s.left) === _RB_tree_red ? s.left : s.right) :
                    (this.getColor(s.right) === _RB_tree_red ? s.right : s.left)
                )!;
                if (r.isLeftSon() != s.isLeftSon()) {
                    await stepController.wait();
                    messageController.message(
                        "兄弟节点的红色孩子为内侧，先旋转兄弟节点",
                        MessageType.INFO
                    );
                    if (r.isLeftSon()) {
                        s._rotate_right();
                    } else {
                        s._rotate_left();
                    }
                    s._swap_color(r);
                    const tmp = s;
                    s = r;
                    r = tmp;
                }

                await stepController.wait();
                messageController.message("调整颜色并旋转父节点", MessageType.INFO);
                r._set_color(this.getColor(s));
                s._set_color(this.getColor(f));
                f._set_color(_RB_tree_black);
                if (s.isLeftSon()) {
                    f._rotate_right();
                } else {
                    f._rotate_left();
                }
            }
        } else {
            await stepController.wait();
            messageController.message("兄弟节点为红色，旋转父节点后继续调整", MessageType.INFO);
            s._set_color(_RB_tree_black);
            f._set_color(_RB_tree_red);
            if (s.isLeftSon()) {
                f._rotate_right();
            } else {
                f._rotate_left();
            }
            await this.removeBlackLeafBalance(x);
        }
    }

    // 删除节点
    private async eraseNode(x: RedBlackTreeNode | null): Promise<RedBlackTreeNode | null> {
        if (x == null) {
            return this.header;
        }
        let child_cnt = 0;
        if (x.left != null) {
            ++child_cnt;
        }
        if (x.right != null) {
            ++child_cnt;
        }
        let y: RedBlackTreeNode | null = null;
        if (child_cnt == 0) {
            if (this.getColor(x) == _RB_tree_black) {
                await this.removeBlackLeafBalance(x);
            }
            y = x.father;

            await stepController.wait();
            messageController.message("删除节点", MessageType.INFO);
            this.removeNonfullNode(x);
        } else if (child_cnt == 1) {
            y = (x.left == null ? x.right : x.left)!;

            await stepController.wait();
            messageController.message(
                "待删除节点只有一个孩子，将其孩子设为黑色",
                MessageType.INFO
            );
            y._set_color(_RB_tree_black);
            y = x.father;

            await stepController.wait();
            messageController.message("删除节点并链接其孩子", MessageType.INFO);
            this.removeNonfullNode(x);
        } else if (child_cnt == 2) {
            y = x.right!;

            await stepController.wait();
            messageController.message("查找中序后继节点", MessageType.INFO);
            while (y.left != null) {
                y = y.left!;
            }

            await stepController.wait();
            messageController.message("将后继节点的值复制到待删除节点", MessageType.INFO);
            x._set_value(y.val);
            return await this.eraseNode(y);
        }
        if (this.header.father == null) {
            this.header._set_father(this.header);
        } else {
            if (this.getColor(this.root()) === _RB_tree_red) {
                await stepController.wait();
                messageController.message("将根节点设为黑色", MessageType.INFO);
            }
            this.root()!._set_color(_RB_tree_black);
        }
        return y;
    }

    // 寻找值为val的节点
    private findNode(val: number): RedBlackTreeNode {
        let x = this.root();
        while (x != this.header && x != null) {
            if (x.val! < val) {
                x = x.right;
            } else if (val < x.val!) {
                x = x.left;
            } else {
                return x;
            }
        }
        return this.header;
    }

    // 获取根节点
    private root(): RedBlackTreeNode | null {
        return this.header.father;
    }

    private header!: RedBlackTreeNode;      // 哨兵节点
    private sz: number;                     // 节点数量

    constructor() {
        this.sz = 0;
        this._set_header(
            create(
                RedBlackTreeNode,
                null, null, null,
                null, _RB_tree_red
            )
        );
        this.header._set_father(this.header);
    }

    /**
     * 值val是否已存在
     * @param val 要查找的值
     * @returns 值是否存在
     */
    public contains(val: number): boolean {
        return this.findNode(val) != this.header;
    }

    /**
     * 插入val
     * @param val 要插入的值
     */
    public async insert(val: number): Promise<void> {
        let y = this.header;
        let x = this.root();

        await stepController.wait();
        messageController.message("从根节点开始查找插入位置", MessageType.INFO);
        while (x != this.header && x != null) {
            y = x;
            if (x.val! === val) {
                messageController.message("值'" + val + "'已存在", MessageType.WARNING);
                return;
            }
            if (this.getColor(x.left) == _RB_tree_red &&
                this.getColor(x.right) == _RB_tree_red) {
                await stepController.wait();
                messageController.message(
                    "节点" + x.val + "的左右孩子均为红色，进行分裂",
                    MessageType.INFO
                );
                x.left!._set_color(_RB_tree_black);
                x.right!._set_color(_RB_tree_black);
                x._set_color(_RB_tree_red);
                await this.insertBalance(x);
            }

            if (x.val! < val) {
                await stepController.wait();
                messageController.message(val + " > " + x.val + "，向右查找", MessageType.INFO);
                x = x.right;
            } else {
                await stepController.wait();
                messageController.message(val + " < " + x.val + "，向左查找", MessageType.INFO);
                x = x.left;
            }
        }

        await stepController.wait();
        messageController.message("创建新节点", MessageType.INFO);
        const node = create(
            RedBlackTreeNode,
            val, null, null,
            y, _RB_tree_red
        );

        await stepController.wait();
        messageController.message("将新节点链接到树中", MessageType.INFO);
        if (y == this.header) {
            this.header._set_father(node);
        } else if (y.val! < val) {
            y._set_right(node);
        } else {
            y._set_left(node);
        }
        ++this.sz;

        await this.insertBalance(node);
        this.root()!._set_color(_RB_tree_black);
        this.header._set_color(_RB_tree_red);

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 删除val
     * @param val 要删除的值
     */
    public async delete(val: number): Promise<void> {
        await stepController.wait();
        messageController.message("从根节点开始查找待删除节点", MessageType.INFO);
        const x = this.findNode(val);
        if (x == this.header) {
            messageController.message("值'" + val + "'不存在", MessageType.WARNING);
            return;
        }
        await this.eraseNode(x);
        --this.sz;

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.root() == this.header;
    }

    // 元素个数
    public size(): number {
        return this.sz;
    }

    // 清空红黑树
    public clear(): void {
        if (this.isEmpty()) {
            messageController.message("红黑树已经为空", MessageType.WARNING);
            return;
        }

        messageController.message("清除所有元素", MessageType.INFO);
        this._clear();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }
}
