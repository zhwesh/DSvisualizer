import { RedBlackTree } from "../../../../datastucture/Tree/BinarySearchTree/RedBlackTree";
import { create } from "../../../../node/factory";
import { checkBSTModel, initTest } from "../../../TestUtils";

/**
 * 红黑树测试
 */
export async function testRedBlackTree(): Promise<string> {
    initTest();
    return await checkBSTModel(create(RedBlackTree), "红黑树");
}
