import { BinaryHeap } from "../../../../datastucture/Queue/PriorityQueue/BinaryHeap";
import { create } from "../../../../node/factory";
import { checkHeapModel, initTest } from "../../../TestUtils";

/**
 * 二叉堆（优先队列，小根堆）测试
 */
export async function testBinaryHeap(): Promise<string> {
    initTest();
    return await checkHeapModel(create(BinaryHeap));
}
