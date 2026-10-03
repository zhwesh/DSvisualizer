import { AVLTreeNode } from "../../node/BinaryTreeNode/impl/AVLTreeNode"
import { create } from "../../node/factory";
import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * AVL树
 */
export class AVLTree {
    /**
     * 设置哨兵节点
     * @param header 要设置的哨兵节点
     */
    public _set_header(header: AVLTreeNode): void {
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
                AVLTreeNode,
                null, null, null,
                null, 0
            )
        );
        this.header._set_father(this.header);
    }

    // 获取节点高度
    public getHeight(x: AVLTreeNode | null): number {
        return (x === null) ? 0 : x.height;
    }

    // 获取根节点
    private root(): AVLTreeNode | null {
        return this.header.father;
    }

    private header!: AVLTreeNode;   // 哨兵节点
    private sz: number;             // 节点数量

    constructor() {
        this.sz = 0;
        this._set_header(
            create(
                AVLTreeNode,
                null, null, null,
                null, 0
            )
        );
        this.header._set_father(this.header);
    }

    // 清除所有元素
    public clear(): void {
        if (this.root() === this.header) {
            messageController.message("AVL树已经为空", MessageType.WARNING);
            return;
        }

        this._clear();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.root() === this.header;
    }

    // 元素个数
    public size(): number {
        return this.sz;
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
        let y: AVLTreeNode;
        if (this.getHeight(x.left) > this.getHeight(x.right) + 1) {
            y = x.left!;
            if (this.getHeight(y.left) < this.getHeight(y.right)) {
                await stepController.wait();
                messageController.message("节点" + x.val + "的左孩子的右子树过高，左旋节点" + y.val, MessageType.INFO);
                y._rotate_left();
            }
            await stepController.wait();
            messageController.message("节点" + x.val + "的左子树过高，右旋节点" + x.val, MessageType.INFO);
            x._rotate_right();
            return x.father!;
        } else if (this.getHeight(x.right) > this.getHeight(x.left) + 1) {
            y = x.right!;
            if (this.getHeight(y.right) < this.getHeight(y.left)) {
                await stepController.wait();
                messageController.message("节点" + x.val + "的右孩子的左子树过高，右旋节点" + y.val, MessageType.INFO);
                y._rotate_right();
            }
            await stepController.wait();
            messageController.message("节点" + x.val + "的右子树过高，左旋节点" + x.val, MessageType.INFO);
            x._rotate_left();
            return x.father!;
        } else {
            return x;
        }
    }

    /**
     * 查找val是否存在
     * @param val 要查找的值
     * @returns 是否存在
     */
    public async contains(val: number): Promise<boolean> {
        let x = this.root();

        await stepController.wait();
        messageController.message("从根节点开始查找 " + val, MessageType.INFO);
        while (x != this.header && x !== null) {
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

    /**
     * 插入val
     * @param val 要插入的值
     */
    public async insert(val: number): Promise<void> {
        let y = this.header;
        let x = this.root();

        await stepController.wait();
        messageController.message("从根节点开始查找插入位置", MessageType.INFO);
        while (x != this.header && x !== null) {
            y = x;
            if (x.val === val) {
                messageController.message("值'" + val + "'已存在", MessageType.WARNING);
                return;
            }
            const toLeft = val < x.val!;
            await stepController.wait();
            if (toLeft) {
                messageController.message(val + " 小于 " + x.val + "，向左查找", MessageType.INFO);
                x = x.left;
            } else {
                messageController.message(val + " 大于 " + x.val + "，向右查找", MessageType.INFO);
                x = x.right;
            }
        }

        await stepController.wait();
        messageController.message("创建新节点", MessageType.INFO);
        const node = create(AVLTreeNode, val, null, null, y, 1);

        await stepController.wait();
        messageController.message("将新节点链接到树中", MessageType.INFO);
        if (y === this.header) {
            this.header._set_father(node);
        } else if (val < y.val!) {
            y._set_left(node);
        } else {
            y._set_right(node);
        }
        ++this.sz;

        while (y !== this.header) {
            y = await this.balance(y);
            await this.updateHeight(y);
            y = y.father!;
        }

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 删除val
     * @param val 要删除的值
     */
    public async delete(val: number): Promise<void> {
        await stepController.wait();
        messageController.message("从根节点开始查找待删除节点", MessageType.INFO);

        let x: AVLTreeNode | null = this.root();
        while (x != this.header && x !== null && x.val !== val) {
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
        if (x === null || x === this.header) {
            messageController.message("值'" + val + "'不存在", MessageType.WARNING);
            return;
        }

        let y = x.father!;
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
            x = succ;
            y = x.father!;
        }

        const child = (x.left !== null) ? x.left : x.right;
        await stepController.wait();
        messageController.message("删除节点，并将其孩子链接到父节点", MessageType.INFO);
        if (x.isLeftSon()) {
            y._set_left(child);
        } else if (x.isRightSon()) {
            y._set_right(child);
        } else {
            y._set_father(child);
        }
        if (child !== null) {
            child._set_father(y);
        }

        await stepController.wait();
        messageController.message("删除节点", MessageType.INFO);
        x._set_father(null);
        x._delete();
        --this.sz;

        if (this.header.father === null) {
            this.header._set_father(this.header);
        }

        while (y !== this.header) {
            y = await this.balance(y);
            await this.updateHeight(y);
            y = y.father!;
        }

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }
}
