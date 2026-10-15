import { TreapTree } from "../../../../datastucture/Tree/BinarySearchTree/TreapTree";
import { create } from "../../../../node/factory";
import { checkBSTModel, initTest } from "../../../TestUtils";

/**
 * Treap树测试
 */
export async function testTreapTree(): Promise<string> {
    initTest();
    return await checkBSTModel(create(TreapTree), "Treap树");
}
