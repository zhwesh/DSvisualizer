import { LinkedList } from "../../datastucture/List/SinglyLinkedList";
import { CircularLinkedList } from "../../datastucture/List/CircularLinkedList";
import { DoubleLinkedList } from "../../datastucture/List/DoubleLinkedList";
import { LinkedStack } from "../../datastucture/Stack/LinkedStack";
import { LinkedQueue } from "../../datastucture/Queue/LinkedQueue";
import { LinkedDeque } from "../../datastucture/Queue/LinkedDeque";
import { HashTable } from "../../datastucture/HashTable/HashTable";
import { Trie } from "../../datastucture/Tree/Trie/Trie";
import { BinarySearchTree } from "../../datastucture/Tree/BinarySearchTree/BinarySearchTree";
import { AVLTree } from "../../datastucture/Tree/BinarySearchTree/AVLTree";
import { RedBlackTree } from "../../datastucture/Tree/BinarySearchTree/RedBlackTree";
import { ScapegoatTree } from "../../datastucture/Tree/BinarySearchTree/ScapegoatTree";
import { TreapTree } from "../../datastucture/Tree/BinarySearchTree/TreapTree";
import { SegmentTree } from "../../datastucture/Tree/SegmentTree/SegmentTree";
import { create } from "../../node/factory";
import { assert, initTest } from "../TestUtils";

/**
 * 可视化层只读 getter 回归测试
 * 
 * 可视化层需要的数据一律通过数据类的只读 getter 暴露（不使用鸭子类型/as any），
 * 本测试验证各数据结构暴露的 getter 在空结构与插入数据后均返回正确引用。
 */
export async function testReadonlyGetters(): Promise<string> {
    initTest();
    let cases = 0;

    // ---- 线性表 ----
    const list = create(LinkedList);
    assert(list.getHeadNode() === null, "空单链表 getHeadNode 应为null");
    await list.insert(0, 1);
    assert(list.getHeadNode() !== null, "插入后 getHeadNode 应返回头节点");
    ++cases;

    const clist = create(CircularLinkedList);
    assert(clist.getHeaderNode() !== null, "循环链表 getHeaderNode 应返回哨兵头节点");
    await clist.insert(0, 1);
    assert(clist.getHeaderNode() !== null, "插入后 getHeaderNode 仍应返回哨兵头节点");
    ++cases;

    const dlist = create(DoubleLinkedList);
    assert(dlist.getHeadNode() === null, "空双链表 getHeadNode 应为null");
    await dlist.insert(0, 1);
    assert(dlist.getHeadNode() !== null, "插入后双链表 getHeadNode 应返回头节点");
    ++cases;

    // ---- 栈 / 队列 / 双端队列 ----
    const stack = create(LinkedStack);
    assert(stack.getHeadNode() === null, "空链栈 getHeadNode 应为null");
    await stack.push(1);
    assert(stack.getHeadNode() !== null, "入栈后 getHeadNode 应返回栈顶节点");
    ++cases;

    const queue = create(LinkedQueue);
    assert(queue.getHeaderNode() !== null && queue.getTailNode() === queue.getHeaderNode(), "空链队列 header 与 tail 应指向同一哨兵");
    await queue.push(1);
    assert(queue.getHeaderNode() !== null && queue.getTailNode() !== queue.getHeaderNode(), "入队后 getTailNode 应指向队尾节点");
    ++cases;

    const deque = create(LinkedDeque);
    assert(deque.getHeaderNode() !== null, "链式双端队列 getHeaderNode 应返回哨兵头节点");
    await deque.pushFirst(1);
    assert(deque.getHeaderNode() !== null, "插入后 getHeaderNode 仍应返回哨兵头节点");
    ++cases;

    // ---- 哈希表 ----
    const table = create(HashTable);
    assert(table.getArr().length > 0, "哈希表 getArr 应返回桶数组");
    await table.add(5);
    assert(table.getArr().length > 0, "添加后 getArr 仍应返回桶数组");
    ++cases;

    // ---- 前缀树 ----
    const trie = create(Trie);
    assert(trie.getRootNode() !== null, "前缀树 getRootNode 应返回根节点");
    await trie.insert("abc");
    assert(trie.getRootNode() !== null, "插入后前缀树 getRootNode 仍应返回根节点");
    ++cases;

    // ---- 二叉搜索树族 ----
    const treeNames = ["二叉搜索树", "AVL树", "红黑树", "替罪羊树", "Treap树"];
    const trees = [
        create(BinarySearchTree),
        create(AVLTree),
        create(RedBlackTree),
        create(ScapegoatTree),
        create(TreapTree),
    ];
    for (let i = 0; i < trees.length; ++i) {
        const tree = trees[i];
        assert(tree.getRootNode() === null, treeNames[i] + "空树 getRootNode 应为null");
        await tree.insert(5);
        const root = tree.getRootNode();
        assert(root !== null && root.val === 5, treeNames[i] + "插入后 getRootNode 应返回根节点且值为5");
        ++cases;
    }

    // ---- 线段树 ----
    const seg = create(SegmentTree, [1, 2, 3]);
    assert(seg.getSize() === 3, "线段树 getSize 应返回元素个数");
    assert(seg.getRootNode() !== null, "线段树 getRootNode 应返回根节点");
    ++cases;

    return "只读getter验证" + cases + "项（链表/栈/队列/哈希表/前缀树/二叉搜索树族/线段树）";
}
