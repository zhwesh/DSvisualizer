import { BinarySearchTree } from "../../../../datastucture/Tree/BinarySearchTree/BinarySearchTree";
import { create } from "../../../../node/factory";
import { checkBSTModel, initTest } from "../../../TestUtils";

/**
 * 二叉搜索树测试
 */
export async function testBinarySearchTree(): Promise<string> {
    initTest();
    return await checkBSTModel(create(BinarySearchTree), "二叉搜索树");
}
