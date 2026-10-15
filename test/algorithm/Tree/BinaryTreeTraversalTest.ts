import { BinaryTreeTraversal } from "../../../algorithm/Tree/BinaryTreeTraversal";
import { BinaryTreeTraversalNode } from "../../../node/BinaryTreeNode/impl/BinaryTreeTraversalNode";
import { create } from "../../../node/factory";
import { assert, assertArrayEqual, initTest, randomInt, registerOpHook } from "../../TestUtils";

/**
 * 将val插入二叉搜索树
 * @param root 子树根节点
 * @param val 待插入的值
 * @returns 插入后的子树根节点
 */
function insertNode(root: BinaryTreeTraversalNode | null, val: number): BinaryTreeTraversalNode {
    if (root === null) {
        return create(BinaryTreeTraversalNode, null, null, val);
    }
    if (val < root.val) {
        root.left = insertNode(root.left, val);
    } else {
        root.right = insertNode(root.right, val);
    }
    return root;
}

/**
 * 参考实现：前序遍历
 * @param node 子树根节点
 * @param order 遍历结果
 */
function collectPreOrder(node: BinaryTreeTraversalNode | null, order: number[]): void {
    if (node === null) {
        return;
    }
    order.push(node.val);
    collectPreOrder(node.left, order);
    collectPreOrder(node.right, order);
}

/**
 * 参考实现：中序遍历
 * @param node 子树根节点
 * @param order 遍历结果
 */
function collectInOrder(node: BinaryTreeTraversalNode | null, order: number[]): void {
    if (node === null) {
        return;
    }
    collectInOrder(node.left, order);
    order.push(node.val);
    collectInOrder(node.right, order);
}

/**
 * 参考实现：后序遍历
 * @param node 子树根节点
 * @param order 遍历结果
 */
function collectPostOrder(node: BinaryTreeTraversalNode | null, order: number[]): void {
    if (node === null) {
        return;
    }
    collectPostOrder(node.left, order);
    collectPostOrder(node.right, order);
    order.push(node.val);
}

/**
 * 二叉树遍历算法测试
 */
export async function testBinaryTreeTraversal(): Promise<string> {
    initTest();

    // 收集遍历结果（answer数组的_add_value调用）
    const answer: number[] = [];
    registerOpHook((_target, method, args) => {
        if (method === "_add_value") {
            answer.push(args[0]);
        }
    });

    // 静态用例：
    //       1
    //      / \
    //     2   3
    //    / \   \
    //   4   5   6
    const node4 = create(BinaryTreeTraversalNode, null, null, 4);
    const node5 = create(BinaryTreeTraversalNode, null, null, 5);
    const node6 = create(BinaryTreeTraversalNode, null, null, 6);
    const node2 = create(BinaryTreeTraversalNode, node4, node5, 2);
    const node3 = create(BinaryTreeTraversalNode, null, node6, 3);
    const root = create(BinaryTreeTraversalNode, node2, node3, 1);
    const traversal = new BinaryTreeTraversal(root);
    answer.length = 0;
    await traversal.preOrderTraversal();
    assertArrayEqual(answer, [1, 2, 4, 5, 3, 6], "前序遍历结果错误");
    answer.length = 0;
    await traversal.inOrderTraversal();
    assertArrayEqual(answer, [4, 2, 5, 1, 3, 6], "中序遍历结果错误");
    answer.length = 0;
    await traversal.postOrderTraversal();
    assertArrayEqual(answer, [4, 5, 2, 6, 3, 1], "后序遍历结果错误");

    // 随机树对拍
    let treeCount = 0, totalNodes = 0, maxNodes = 0, traversalCount = 3;
    for (let t = 0; t < 20; ++t) {
        const n = randomInt(1, 30);
        const values: number[] = [];
        for (let i = 0; i < n; ++i) {
            values.push(i);
        }
        for (let i = n - 1; i > 0; --i) {
            const j = randomInt(0, i);
            const tmp = values[i];
            values[i] = values[j];
            values[j] = tmp;
        }
        let randomRoot: BinaryTreeTraversalNode | null = null;
        for (const val of values) {
            randomRoot = insertNode(randomRoot, val);
        }
        assert(randomRoot !== null, "随机树不应为空");

        const preOrder: number[] = [], inOrder: number[] = [], postOrder: number[] = [];
        collectPreOrder(randomRoot, preOrder);
        collectInOrder(randomRoot, inOrder);
        collectPostOrder(randomRoot, postOrder);

        const randomTraversal = new BinaryTreeTraversal(randomRoot!);
        answer.length = 0;
        await randomTraversal.preOrderTraversal();
        assertArrayEqual(answer, preOrder, "随机树前序遍历结果错误");
        answer.length = 0;
        await randomTraversal.inOrderTraversal();
        assertArrayEqual(answer, inOrder, "随机树中序遍历结果错误");
        answer.length = 0;
        await randomTraversal.postOrderTraversal();
        assertArrayEqual(answer, postOrder, "随机树后序遍历结果错误");

        traversalCount += 3;
        ++treeCount;
        totalNodes += n;
        if (n > maxNodes) {
            maxNodes = n;
        }
    }
    registerOpHook(null);

    return "静态用例1棵（6个节点）；随机树" + treeCount + "棵（最大" + maxNodes + "个节点，共" + totalNodes +
        "个节点），三种遍历共" + traversalCount + "次";
}
