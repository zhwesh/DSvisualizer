import { testDijkstra } from "./algorithm/Graph/DijkstraTest";
import { testFloyd } from "./algorithm/Graph/FloydTest";
import { testKruskal } from "./algorithm/Graph/KruskalTest";
import { testPrim } from "./algorithm/Graph/PrimTest";
import { testBinaryTreeTraversal } from "./algorithm/Tree/BinaryTreeTraversalTest";
import { testBinarySearch } from "./algorithm/List/BinarySearchTest";
import { testBubbleSort } from "./algorithm/List/BubbleSortTest";
import { testInsertionSort } from "./algorithm/List/InsertionSortTest";
import { testKMP } from "./algorithm/List/KMPTest";
import { testMergeSort } from "./algorithm/List/MergeSortTest";
import { testQuickSort } from "./algorithm/List/QuickSortTest";
import { testArrayList } from "./datastucture/List/ArrayListTest";
import { testCircularLinkedList } from "./datastucture/List/CircularLinkedListTest";
import { testDoubleLinkedList } from "./datastucture/List/DoubleLinkedListTest";
import { testSinglyLinkedList } from "./datastucture/List/SinglyLinkedListTest";
import { testArrayDeque } from "./datastucture/Queue/ArrayDequeTest";
import { testArrayQueue } from "./datastucture/Queue/ArrayQueueTest";
import { testLinkedDeque } from "./datastucture/Queue/LinkedDequeTest";
import { testLinkedQueue } from "./datastucture/Queue/LinkedQueueTest";
import { testBinaryHeap } from "./datastucture/Queue/PriorityQueue/BinaryHeapTest";
import { testArrayStack } from "./datastucture/Stack/ArrayStackTest";
import { testLinkedStack } from "./datastucture/Stack/LinkedStackTest";
import { testHashTable } from "./datastucture/HashTable/HashTableTest";
import { testBinaryIndexedTree } from "./datastucture/Other/BinaryIndexedTreeTest";
import { testUnionFindSet } from "./datastucture/Other/UnionFindSetTest";
import { testAVLTree } from "./datastucture/Tree/BinarySearchTree/AVLTreeTest";
import { testBinarySearchTree } from "./datastucture/Tree/BinarySearchTree/BinarySearchTreeTest";
import { testRedBlackTree } from "./datastucture/Tree/BinarySearchTree/RedBlackTreeTest";
import { testScapegoatTree } from "./datastucture/Tree/BinarySearchTree/ScapegoatTreeTest";
import { testTreapTree } from "./datastucture/Tree/BinarySearchTree/TreapTreeTest";
import { testSegmentTree } from "./datastucture/Tree/SegmentTree/SegmentTreeTest";
import { testTrie } from "./datastucture/Tree/Trie/TrieTest";
import { formatStats, getStats } from "./TestUtils";

/**
 * 依次运行全部测试，并输出数据量与统计信息
 * @returns 是否全部通过
 */
export async function runTests(): Promise<boolean> {
    const tests: [string, () => Promise<string>][] = [
        ["ArrayList", testArrayList],
        ["SinglyLinkedList", testSinglyLinkedList],
        ["DoubleLinkedList", testDoubleLinkedList],
        ["CircularLinkedList", testCircularLinkedList],
        ["ArrayStack", testArrayStack],
        ["LinkedStack", testLinkedStack],
        ["ArrayQueue", testArrayQueue],
        ["LinkedQueue", testLinkedQueue],
        ["ArrayDeque", testArrayDeque],
        ["LinkedDeque", testLinkedDeque],
        ["BinaryHeap", testBinaryHeap],
        ["HashTable", testHashTable],
        ["Trie", testTrie],
        ["SegmentTree", testSegmentTree],
        ["BinarySearchTree", testBinarySearchTree],
        ["AVLTree", testAVLTree],
        ["RedBlackTree", testRedBlackTree],
        ["ScapegoatTree", testScapegoatTree],
        ["TreapTree", testTreapTree],
        ["UnionFindSet", testUnionFindSet],
        ["BinaryIndexedTree", testBinaryIndexedTree],
        ["BinarySearch", testBinarySearch],
        ["BubbleSort", testBubbleSort],
        ["InsertionSort", testInsertionSort],
        ["QuickSort", testQuickSort],
        ["MergeSort", testMergeSort],
        ["KMP", testKMP],
        ["BinaryTreeTraversal", testBinaryTreeTraversal],
        ["Kruskal", testKruskal],
        ["Prim", testPrim],
        ["Dijkstra", testDijkstra],
        ["Floyd", testFloyd],
    ];

    const startTime = performance.now();
    let passed = 0, failed = 0;
    let totalAtomicOps = 0, totalCreations = 0, totalMessages = 0;

    for (let i = 0; i < tests.length; ++i) {
        const name = tests[i][0];
        const test = tests[i][1];
        const testStart = performance.now();
        try {
            const summary = await test();
            const stats = getStats();
            ++passed;
            totalAtomicOps += stats.atomicOps;
            totalCreations += stats.nodeCreations;
            totalMessages += stats.messages;
            console.log("[" + (i + 1) + "/" + tests.length + "] " + name +
                " 测试通过（用时" + (performance.now() - testStart).toFixed(1) + "ms）");
            console.log("    数据量：" + summary);
            console.log("    统计：" + formatStats(stats));
        } catch (error) {
            ++failed;
            console.log("[" + (i + 1) + "/" + tests.length + "] " + name +
                " 测试失败（用时" + (performance.now() - testStart).toFixed(1) + "ms）");
            console.error("    " + (error instanceof Error ? error.message : String(error)));
        }
    }

    console.log("----------------------------------------------------------------------");
    console.log("测试结果：" + passed + " 通过 / " + failed + " 失败，总用时" +
        (performance.now() - startTime).toFixed(1) + "ms");
    console.log("累计统计：原子操作" + totalAtomicOps + "次，创建实例" + totalCreations +
        "个，消息" + totalMessages + "条");
    console.log("----------------------------------------------------------------------");

    return failed === 0;
}

runTests().then((success) => {
    if (!success) {
        (globalThis as any).process?.exit(1);
    }
}).catch((error) => {
    console.error(error);
    (globalThis as any).process?.exit(1);
});
