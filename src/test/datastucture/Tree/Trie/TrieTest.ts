import { Trie } from "../../../../datastucture/Tree/Trie/Trie";
import { create } from "../../../../node/factory";
import { checkTrieModel, initTest } from "../../../TestUtils";

/**
 * 前缀树（字典树）测试
 */
export async function testTrie(): Promise<string> {
    initTest();
    return await checkTrieModel(create(Trie));
}
