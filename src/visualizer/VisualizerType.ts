/**
 * 可视化器类型（值即类型，兼容 erasableSyntaxOnly）
 */
export const VisualizerType = {
    ARRAY_LIST: 'array_list',
    SINGLY_LINKED_LIST: 'singly_linked_list',
    CIRCULAR_LINKED_LIST: 'circular_linked_list',
    DOUBLE_LINKED_LIST: 'double_linked_list',
    BST: 'bst',
    AVL: 'avl',
    RED_BLACK: 'red_black',
    BINARY_SEARCH: 'binary_search',
    BINARY_TREE_TRAVERSAL: 'binary_tree_traversal',
    SEGMENT_TREE: 'segment_tree',
    ARRAY_QUEUE: 'array_queue',
    LINKED_QUEUE: 'linked_queue',
    ARRAY_DEQUE: 'array_deque',
    LINKED_DEQUE: 'linked_deque',
    ARRAY_STACK: 'array_stack',
    LINKED_STACK: 'linked_stack',
    TRIE: 'trie',
    DIJKSTRA: 'dijkstra',
    FLOYD: 'floyd',
    PRIM: 'prim',
    KRUSKAL: 'kruskal',
    BUBBLE_SORT: 'bubble_sort',
    INSERTION_SORT: 'insertion_sort',
    MERGE_SORT: 'merge_sort',
    QUICK_SORT: 'quick_sort',
    KMP: 'kmp',
} as const;

export type VisualizerType = typeof VisualizerType[keyof typeof VisualizerType];
