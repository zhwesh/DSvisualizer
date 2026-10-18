import type { Selection } from 'd3';
import type { BaseVisualizer } from './BaseVisualizer';
import { VisualizerType } from './VisualizerType';
import type { VisualizerType as VisualizerTypeValue } from './VisualizerType';

import { create } from '../node/factory';
import { BinaryTreeTraversalNode } from '../node/BinaryTreeNode/impl/BinaryTreeTraversalNode';

import { ArrayList } from '../datastructure/List/ArrayList';
import { LinkedList as SinglyLinkedList } from '../datastructure/List/SinglyLinkedList';
import { CircularLinkedList } from '../datastructure/List/CircularLinkedList';
import { DoubleLinkedList } from '../datastructure/List/DoubleLinkedList';
import { ArrayStack } from '../datastructure/Stack/ArrayStack';
import { LinkedStack } from '../datastructure/Stack/LinkedStack';
import { ArrayQueue } from '../datastructure/Queue/ArrayQueue';
import { LinkedQueue } from '../datastructure/Queue/LinkedQueue';
import { ArrayDeque } from '../datastructure/Queue/ArrayDeque';
import { LinkedDeque } from '../datastructure/Queue/LinkedDeque';
import { BinarySearchTree } from '../datastructure/Tree/BinarySearchTree/BinarySearchTree';
import { AVLTree } from '../datastructure/Tree/BinarySearchTree/AVLTree';
import { RedBlackTree } from '../datastructure/Tree/BinarySearchTree/RedBlackTree';
import { SegmentTree } from '../datastructure/Tree/SegmentTree/SegmentTree';
import { Trie } from '../datastructure/Tree/Trie/Trie';

import { BinarySearch } from '../algorithm/List/BinarySearch';
import { BinaryTreeTraversal } from '../algorithm/Tree/BinaryTreeTraversal';
import { dijkstra } from '../algorithm/Graph/Dijkstra';
import { floyd } from '../algorithm/Graph/Floyd';
import { prim } from '../algorithm/Graph/Prim';
import { kruskal } from '../algorithm/Graph/Kruskal';
import { BubbleSort } from '../algorithm/List/BubbleSort';
import { InsertionSort } from '../algorithm/List/InsertionSort';
import { MergeSort } from '../algorithm/List/MergeSort';
import { QuickSort } from '../algorithm/List/QuickSort';
import { KMP } from '../algorithm/List/KMP';

import { ArrayVisualizer } from './ArrayVisualizer';
import { LinkedListVisualizer } from './LinkedListVisualizer';
import { TreeVisualizer } from './TreeVisualizer';
import { BinarySearchVisualizer } from './BinarySearchVisualizer';
import { GraphVisualizer } from './GraphVisualizer';
import { SortVisualizer } from './SortVisualizer';
import { KMPVisualizer } from './KMPVisualizer';

export type DSInstance =
    | ArrayList | SinglyLinkedList | CircularLinkedList | DoubleLinkedList
    | BinarySearchTree | AVLTree | RedBlackTree
    | BinarySearch | BinaryTreeTraversal | SegmentTree
    | ArrayQueue | LinkedQueue | ArrayDeque | LinkedDeque | ArrayStack | LinkedStack | Trie
    | dijkstra | floyd | prim | kruskal
    | BubbleSort | InsertionSort | MergeSort | QuickSort | KMP;

type SvgSelection = Selection<SVGSVGElement, unknown, null, undefined>;

export interface RegistryEntry {
    title: string;
    visualizer: new (svg: SvgSelection) => BaseVisualizer;
    create: () => DSInstance;
}

const GRAPH_EDGES: Record<string, number[][]> = {
    [VisualizerType.DIJKSTRA]: [[0, 1, 2], [0, 2, 5], [1, 2, 1], [1, 3, 4], [2, 3, 2], [3, 4, 3], [2, 4, 6]],
    [VisualizerType.FLOYD]: [[0, 1, 3], [0, 2, 8], [1, 2, 2], [1, 3, 5], [2, 3, 1], [2, 4, 6], [3, 4, 4]],
    [VisualizerType.PRIM]: [[0, 1, 4], [0, 2, 3], [1, 2, 1], [1, 3, 6], [2, 3, 5], [2, 4, 2], [3, 4, 7]],
    [VisualizerType.KRUSKAL]: [[0, 1, 2], [0, 2, 5], [1, 2, 1], [1, 3, 4], [2, 3, 3], [3, 4, 2], [2, 4, 6]],
};

/**
 * 构建二叉树遍历示例树
 */
export const buildTraversalTree = (): BinaryTreeTraversalNode => {
    const n4 = create(BinaryTreeTraversalNode, null, null, 4);
    const n5 = create(BinaryTreeTraversalNode, null, null, 5);
    const n6 = create(BinaryTreeTraversalNode, null, null, 6);
    const n7 = create(BinaryTreeTraversalNode, null, null, 7);
    const n2 = create(BinaryTreeTraversalNode, n4, n5, 2);
    const n3 = create(BinaryTreeTraversalNode, n6, n7, 3);
    return create(BinaryTreeTraversalNode, n2, n3, 1);
};

/**
 * 数据结构/算法实例创建与可视化器映射的单一注册表
 */
export const REGISTRY: Record<VisualizerTypeValue, RegistryEntry> = {
    [VisualizerType.ARRAY_LIST]: {
        title: '顺序表',
        visualizer: ArrayVisualizer,
        create: () => create(ArrayList),
    },
    [VisualizerType.SINGLY_LINKED_LIST]: {
        title: '单链表',
        visualizer: LinkedListVisualizer,
        create: () => create(SinglyLinkedList),
    },
    [VisualizerType.CIRCULAR_LINKED_LIST]: {
        title: '循环链表',
        visualizer: LinkedListVisualizer,
        create: () => create(CircularLinkedList),
    },
    [VisualizerType.DOUBLE_LINKED_LIST]: {
        title: '双向链表',
        visualizer: LinkedListVisualizer,
        create: () => create(DoubleLinkedList),
    },
    [VisualizerType.ARRAY_STACK]: {
        title: '顺序栈',
        visualizer: ArrayVisualizer,
        create: () => create(ArrayStack),
    },
    [VisualizerType.LINKED_STACK]: {
        title: '链式栈',
        visualizer: LinkedListVisualizer,
        create: () => create(LinkedStack),
    },
    [VisualizerType.ARRAY_QUEUE]: {
        title: '顺序队列',
        visualizer: ArrayVisualizer,
        create: () => create(ArrayQueue),
    },
    [VisualizerType.LINKED_QUEUE]: {
        title: '链式队列',
        visualizer: LinkedListVisualizer,
        create: () => create(LinkedQueue),
    },
    [VisualizerType.ARRAY_DEQUE]: {
        title: '双端队列',
        visualizer: ArrayVisualizer,
        create: () => create(ArrayDeque),
    },
    [VisualizerType.LINKED_DEQUE]: {
        title: '链式双端队列',
        visualizer: LinkedListVisualizer,
        create: () => create(LinkedDeque),
    },
    [VisualizerType.BST]: {
        title: '二叉搜索树',
        visualizer: TreeVisualizer,
        create: () => create(BinarySearchTree),
    },
    [VisualizerType.AVL]: {
        title: 'AVL树',
        visualizer: TreeVisualizer,
        create: () => create(AVLTree),
    },
    [VisualizerType.RED_BLACK]: {
        title: '红黑树',
        visualizer: TreeVisualizer,
        create: () => create(RedBlackTree),
    },
    [VisualizerType.SEGMENT_TREE]: {
        title: '线段树',
        visualizer: TreeVisualizer,
        create: () => create(SegmentTree, [1, 2, 3, 4, 5, 6, 7, 8]),
    },
    [VisualizerType.TRIE]: {
        title: 'Trie树',
        visualizer: TreeVisualizer,
        create: () => create(Trie),
    },
    [VisualizerType.BINARY_SEARCH]: {
        title: '二分查找',
        visualizer: BinarySearchVisualizer,
        create: () => create(BinarySearch, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    },
    [VisualizerType.BINARY_TREE_TRAVERSAL]: {
        title: '二叉树遍历',
        visualizer: TreeVisualizer,
        create: () => create(BinaryTreeTraversal, buildTraversalTree()),
    },
    [VisualizerType.DIJKSTRA]: {
        title: 'Dijkstra',
        visualizer: GraphVisualizer,
        create: () => create(dijkstra, GRAPH_EDGES[VisualizerType.DIJKSTRA]),
    },
    [VisualizerType.FLOYD]: {
        title: 'Floyd',
        visualizer: GraphVisualizer,
        create: () => create(floyd, GRAPH_EDGES[VisualizerType.FLOYD]),
    },
    [VisualizerType.PRIM]: {
        title: 'Prim',
        visualizer: GraphVisualizer,
        create: () => create(prim, GRAPH_EDGES[VisualizerType.PRIM]),
    },
    [VisualizerType.KRUSKAL]: {
        title: 'Kruskal',
        visualizer: GraphVisualizer,
        create: () => create(kruskal, GRAPH_EDGES[VisualizerType.KRUSKAL]),
    },
    [VisualizerType.BUBBLE_SORT]: {
        title: '冒泡排序',
        visualizer: SortVisualizer,
        create: () => create(BubbleSort),
    },
    [VisualizerType.INSERTION_SORT]: {
        title: '插入排序',
        visualizer: SortVisualizer,
        create: () => create(InsertionSort),
    },
    [VisualizerType.MERGE_SORT]: {
        title: '归并排序',
        visualizer: SortVisualizer,
        create: () => create(MergeSort),
    },
    [VisualizerType.QUICK_SORT]: {
        title: '快速排序',
        visualizer: SortVisualizer,
        create: () => create(QuickSort),
    },
    [VisualizerType.KMP]: {
        title: 'KMP算法',
        visualizer: KMPVisualizer,
        create: () => create(KMP, 'ababcabab', 'abab'),
    },
};

export function getStructureTitle(type: VisualizerTypeValue): string {
    return REGISTRY[type].title;
}

export function createStructure(type: VisualizerTypeValue): DSInstance {
    return REGISTRY[type].create();
}

export function getGraphEdges(type: VisualizerTypeValue): number[][] | null {
    return GRAPH_EDGES[type] ?? null;
}
