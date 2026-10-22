import { MessageController, MessageType } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { ArrayNode } from "../../node/ArrayNode/ArrayNode";
import { BinaryTreeTraversalNode } from "../../node/BinaryTreeNode/impl/BinaryTreeTraversalNode";
import { create } from "../../node/factory";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

export class BinaryTreeTraversal {
    private node: BinaryTreeTraversalNode;
    private answer: ArrayNode;
    private idx: number;

    constructor(tree: BinaryTreeTraversalNode) {
        this.node = tree;
        this.idx = 0;
        this.answer = create(ArrayNode, Array(this.getSize(tree)).fill(null));
    }

    private getSize(node: BinaryTreeTraversalNode | null): number {
        if (node === null) {
            return 0;
        }
        return 1 + this.getSize(node.left) + this.getSize(node.right);
    }

    private init(): void {
        this.node._clear_visited();
        this.idx = 0;
        for (let i = 0; i < this.answer.data.length; ++i) {
            this.answer._set_value(i, null);
        }
    }

    /**
     * 前序遍历
     */
    public async preOrderTraversal(): Promise<void> {
        this.init();

        await this.preOrderTraversalImpl(this.node);
        messageController.message("前序遍历完成", MessageType.SUCCESS);
    }

    /**
     * 中序遍历
     */
    public async inOrderTraversal(): Promise<void> {
        this.init();

        await this.inOrderTraversalImpl(this.node);
        messageController.message("中序遍历完成", MessageType.SUCCESS);
    }

    /**
     * 后序遍历
     */
    public async postOrderTraversal(): Promise<void> {
        this.init();

        await this.postOrderTraversalImpl(this.node);
        messageController.message("后序遍历完成", MessageType.SUCCESS);
    }

    /**
     * 前序遍历实现
     * @param node 待遍历子树
     */
    private async preOrderTraversalImpl(node: BinaryTreeTraversalNode): Promise<void> {
        await stepController.wait();
        messageController.message("访问当前节点" + node.val, MessageType.INFO);
        node._set_visited(true);
        this.answer._set_value(this.idx++, node.val);
        
        if (node.left != null) {
            await stepController.wait();
            messageController.message("递归遍历左子树", MessageType.INFO);
            await this.preOrderTraversalImpl(node.left);
        }

        if (node.right != null) {
            await stepController.wait();
            messageController.message("递归遍历右子树", MessageType.INFO);
            await this.preOrderTraversalImpl(node.right);
        }
    }

    /**
     * 中序遍历实现
     * @param node 待遍历子树
     */
    private async inOrderTraversalImpl(node: BinaryTreeTraversalNode): Promise<void> {
        if (node.left !== null) {
            await stepController.wait();
            messageController.message("递归遍历左子树", MessageType.INFO);
            await this.inOrderTraversalImpl(node.left);
        }

        await stepController.wait();
        messageController.message("访问当前节点" + node.val, MessageType.INFO);
        node._set_visited(true);
        this.answer._set_value(this.idx++, node.val);

        if (node.right !== null) {
            await stepController.wait();
            messageController.message("递归遍历右子树", MessageType.INFO);
            await this.inOrderTraversalImpl(node.right);
        }
    }

    /**
     * 后序遍历实现
     * @param node 待遍历子树
     */
    private async postOrderTraversalImpl(node: BinaryTreeTraversalNode): Promise<void> {
        if (node.left !== null) {
            await stepController.wait();
            messageController.message("递归遍历左子树", MessageType.INFO);
            await this.postOrderTraversalImpl(node.left);
        }

        if (node.right !== null) {
            await stepController.wait();
            messageController.message("递归遍历右子树", MessageType.INFO);
            await this.postOrderTraversalImpl(node.right);
        }

        await stepController.wait();
        messageController.message("访问当前节点" + node.val, MessageType.INFO);
        node._set_visited(true);
        this.answer._set_value(this.idx++, node.val);
    }
}