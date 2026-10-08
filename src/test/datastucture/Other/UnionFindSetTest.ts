import { UnionFindSet } from "../../../datastucture/Other/UnionFindSet";
import { create } from "../../../node/factory";
import { checkUnionFindSetModel, initTest, randomInt } from "../../TestUtils";

/**
 * 并查集测试
 */
export async function testUnionFindSet(): Promise<string> {
    initTest();
    const n = randomInt(10, 50);
    return await checkUnionFindSetModel(create(UnionFindSet, n), n);
}
