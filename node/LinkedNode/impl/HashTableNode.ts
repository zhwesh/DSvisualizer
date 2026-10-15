import { LinkedNode } from "../LinkedNode";

/**
 * 哈希表节点（链地址法）
 */
export class HashTableNode extends LinkedNode<HashTableNode> {
    // 键的哈希值（扩容重新散列时直接复用，无需重新计算）
    public hash: number;

    constructor(val: number | null, hash: number, next: HashTableNode | null) {
        super(val, next);
        this.hash = hash;
    }
}
