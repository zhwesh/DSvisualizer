import { ArrayQueue } from "../../../datastucture/Queue/ArrayQueue";
import { create } from "../../../node/factory";
import { checkQueueModel, initTest } from "../../TestUtils";

/**
 * 普通队列（数组实现）测试
 */
export async function testArrayQueue(): Promise<string> {
    initTest();
    return await checkQueueModel(create(ArrayQueue));
}
