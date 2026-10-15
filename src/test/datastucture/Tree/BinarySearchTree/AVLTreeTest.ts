import { AVLTree } from "../../../../datastucture/Tree/BinarySearchTree/AVLTree";
import { create } from "../../../../node/factory";
import { checkBSTModel, checkSearchHighlight, initTest } from "../../../TestUtils";

/**
 * AVL树测试
 */
export async function testAVLTree(): Promise<string> {
    initTest();
    const tree = create(AVLTree);
    const summary = await checkBSTModel(tree, "AVL树");
    const highlight = await checkSearchHighlight(tree, "AVL树");
    return summary + "；" + highlight;
}
