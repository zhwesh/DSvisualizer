import { ArrayList } from "../../../datastucture/List/ArrayList";
import { create } from "../../../node/factory";
import { checkListModel, initTest } from "../../TestUtils";

/**
 * 线性表（数组实现）测试
 */
export async function testArrayList(): Promise<string> {
    initTest();
    return await checkListModel(create(ArrayList));
}
