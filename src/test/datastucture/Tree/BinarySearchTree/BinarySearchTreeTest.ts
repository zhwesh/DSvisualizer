import { BinarySearchTree } from "../../../../datastucture/Tree/BinarySearchTree/BinarySearchTree";
import { create } from "../../../../node/factory";
import { checkBSTModel, checkSearchHighlight, initTest } from "../../../TestUtils";

/**
 * 二叉搜索树测试
 */
export async function testBinarySearchTree(): Promise<string> {
    initTest();
    const tree = create(BinarySearchTree);
    const summary = await checkBSTModel(tree, "二叉搜索树");
    const highlight = await checkSearchHighlight(tree, "二叉搜索树");
    return summary + "；" + highlight;
}
