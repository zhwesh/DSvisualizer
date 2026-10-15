import { HashTable } from "../../../datastucture/HashTable/HashTable";
import { create } from "../../../node/factory";
import { checkHashTableModel, initTest } from "../../TestUtils";

/**
 * 哈希表（链地址法实现）测试
 */
export async function testHashTable(): Promise<string> {
    initTest();
    return await checkHashTableModel(create(HashTable));
}
