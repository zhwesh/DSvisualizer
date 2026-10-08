import { AVLTree } from "../../../../datastucture/Tree/BinarySearchTree/AVLTree";
import { create } from "../../../../node/factory";
import { checkBSTModel, initTest } from "../../../TestUtils";

/**
 * AVL树测试
 */
export async function testAVLTree(): Promise<string> {
    initTest();
    return await checkBSTModel(create(AVLTree), "AVL树");
}
