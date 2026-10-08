import { ArrayDeque } from "../../../datastucture/Queue/ArrayDeque";
import { create } from "../../../node/factory";
import { checkDequeModel, initTest } from "../../TestUtils";

/**
 * 双端队列（数组实现）测试
 */
export async function testArrayDeque(): Promise<string> {
    initTest();
    return await checkDequeModel(create(ArrayDeque));
}
