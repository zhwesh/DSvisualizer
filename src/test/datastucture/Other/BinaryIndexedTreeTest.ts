import { BinaryIndexedTree } from "../../../datastucture/Other/BinaryIndexedTree";
import { create } from "../../../node/factory";
import { checkBinaryIndexedTreeModel, initTest, randomInt } from "../../TestUtils";

/**
 * 树状数组测试
 */
export async function testBinaryIndexedTree(): Promise<string> {
    initTest();
    const n = randomInt(10, 30);
    return await checkBinaryIndexedTreeModel(create(BinaryIndexedTree, n), n);
}
