import { ScapegoatTree } from "../../../../datastucture/Tree/BinarySearchTree/ScapegoatTree";
import { create } from "../../../../node/factory";
import { checkBSTModel, checkScapegoatQueries, initTest } from "../../../TestUtils";

/**
 * 替罪羊树测试
 */
export async function testScapegoatTree(): Promise<string> {
    initTest();
    const tree = create(ScapegoatTree);
    const summary = await checkBSTModel(tree, "替罪羊树");
    const extra = await checkScapegoatQueries(tree);
    return summary + "；" + extra;
}
