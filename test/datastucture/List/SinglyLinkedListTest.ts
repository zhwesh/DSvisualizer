import { LinkedList } from "../../../datastucture/List/SinglyLinkedList";
import { create } from "../../../node/factory";
import { checkListModel, initTest } from "../../TestUtils";

/**
 * 线性表（单链表实现）测试
 */
export async function testSinglyLinkedList(): Promise<string> {
    initTest();
    return await checkListModel(create(LinkedList));
}
