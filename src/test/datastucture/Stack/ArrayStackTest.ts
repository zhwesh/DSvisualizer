import { ArrayStack } from "../../../datastucture/Stack/ArrayStack";
import { create } from "../../../node/factory";
import { checkStackModel, initTest } from "../../TestUtils";

/**
 * 栈（数组实现）测试
 */
export async function testArrayStack(): Promise<string> {
    initTest();
    return await checkStackModel(create(ArrayStack));
}
