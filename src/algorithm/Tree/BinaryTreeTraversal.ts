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

    constructor(tree: BinaryTreeTraversalNode) {
        this.node = tree;
        this.answer = create(ArrayNode, []);
    }

    /**
     * 前序遍历
     */
    public async preOrderTraversal(): Promise<void> {
        this.node._clear_visited();
        this.answer._delete();

        await this.preOrderTraversalImpl(this.node);
        messageController.message("前序遍历完成", MessageType.SUCCESS);
    }

    /**
     * 中序遍历
     */
    public async inOrderTraversal(): Promise<void> {
        this.node._clear_visited();
        this.answer._delete();

        await this.inOrderTraversalImpl(this.node);
        messageController.message("中序遍历完成", MessageType.SUCCESS);
    }

    /**
     * 后序遍历
     */
    public async postOrderTraversal(): Promise<void> {
        this.node._clear_visited();
        this.answer._delete();

        await this.postOrderTraversalImpl(this.node);
        messageController.message("后序遍历完成", MessageType.SUCCESS);
    }

    /**
     * 前序遍历实现
     * @param node 待遍历子树
     */
    private async preOrderTraversalImpl(node: BinaryTreeTraversalNode | null): Promise<void> {
        if (node === null) {
            return;
        }

        await stepController.wait();
        messageController.message("访问当前节点" + node.val, MessageType.INFO);
        node._set_visited(true);
        this.answer._add_value(node.val);
        
        await stepController.wait();
        messageController.message("递归遍历左子树" + node.val, MessageType.INFO);
        await this.preOrderTraversalImpl(node.left);

        await stepController.wait();
        messageController.message("递归遍历右子树" + node.val, MessageType.INFO);
        await this.preOrderTraversalImpl(node.right);
    }

    /**
     * 中序遍历实现
     * @param node 待遍历子树
     */
    private async inOrderTraversalImpl(node: BinaryTreeTraversalNode | null): Promise<void> {
        if (node === null) {
            return;
        }

        await stepController.wait();
        messageController.message("递归遍历左子树" + node.val, MessageType.INFO);
        await this.inOrderTraversalImpl(node.left);
        
        await stepController.wait();
        messageController.message("访问当前节点" + node.val, MessageType.INFO);
        node._set_visited(true);
        this.answer._add_value(node.val);

        await stepController.wait();
        messageController.message("递归遍历右子树" + node.val, MessageType.INFO);
        await this.inOrderTraversalImpl(node.right);
    }

    /**
     * 后序遍历实现
     * @param node 待遍历子树
     */
    private async postOrderTraversalImpl(node: BinaryTreeTraversalNode | null): Promise<void> {
        if (node === null) {
            return;
        }
        
        await stepController.wait();
        messageController.message("递归遍历左子树" + node.val, MessageType.INFO);
        await this.postOrderTraversalImpl(node.left);

        await stepController.wait();
        messageController.message("递归遍历右子树" + node.val, MessageType.INFO);
        await this.postOrderTraversalImpl(node.right);

        await stepController.wait();
        messageController.message("访问当前节点" + node.val, MessageType.INFO);
        node._set_visited(true);
        this.answer._add_value(node.val);
    }
}