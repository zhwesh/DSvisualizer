import { DoubleLinkedList } from "../../../datastucture/List/DoubleLinkedList";
import { DoublyLinkedListNode } from "../../../node/LinkedNode/impl/DoublyLinkedNode";
import { create } from "../../../node/factory";
import { assert, checkListModel, initTest, registerOpHook } from "../../TestUtils";

/**
 * 线性表（双向链表实现）测试
 */
export async function testDoubleLinkedList(): Promise<string> {
    initTest();
    const summary = await checkListModel(create(DoubleLinkedList));

    // 删除的节点应清空val/next/last
    const deleted: DoublyLinkedListNode[] = [];
    registerOpHook((target, method) => {
        if (method === "_delete") {
            deleted.push(target as DoublyLinkedListNode);
        }
    });
    const list = create(DoubleLinkedList);
    await list.insert(0, 1);
    await list.insert(1, 2);
    await list.insert(2, 3);
    await list.delete(0);
    await list.delete(1);
    await list.delete(0);
    assert(deleted.length === 3, "应删除3个节点，实际为" + deleted.length);
    for (const node of deleted) {
        assert(node.val === null && node.next === null && node.last === null, "已删除节点应清空val/next/last");
    }
    assert(list.isEmpty(), "全部删除后应为空");

    return summary + "；删除节点清空回归3项";
}
