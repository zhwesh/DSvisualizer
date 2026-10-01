import { ArrayNode } from "../ArrayNode";

/**
 * 数组实现的线性表节点
 */
export class ArrayListNode extends ArrayNode {
    constructor(data: (number | null)[]) {
        super(data);
    }
}