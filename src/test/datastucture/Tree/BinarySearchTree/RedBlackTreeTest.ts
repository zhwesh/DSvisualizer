import { RedBlackTree } from "../../../../datastucture/Tree/BinarySearchTree/RedBlackTree";
import { create } from "../../../../node/factory";
import { checkBSTModel, checkSearchHighlight, initTest } from "../../../TestUtils";

/**
 * 红黑树测试
 */
export async function testRedBlackTree(): Promise<string> {
    initTest();
    const tree = create(RedBlackTree);
    const summary = await checkBSTModel(tree, "红黑树");
    const highlight = await checkSearchHighlight(tree, "红黑树");
    return summary + "；" + highlight;
}
