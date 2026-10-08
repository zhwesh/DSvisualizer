import { LinkedDeque } from "../../../datastucture/Queue/LinkedDeque";
import { DoublyLinkedListNode } from "../../../node/LinkedNode/impl/DoublyLinkedNode";
import { create } from "../../../node/factory";
import { assert, checkDequeModel, initTest, registerOpHook } from "../../TestUtils";

/**
 * 双端队列（双向循环链表实现）测试
 */
export async function testLinkedDeque(): Promise<string> {
    initTest();
    const summary = await checkDequeModel(create(LinkedDeque));

    // 弹出的节点应清空val/next/last
    const deleted: DoublyLinkedListNode[] = [];
    registerOpHook((target, method) => {
        if (method === "_delete") {
            deleted.push(target as DoublyLinkedListNode);
        }
    });
    const deque = create(LinkedDeque);
    await deque.pushLast(1);
    await deque.pushFirst(2);
    await deque.popFirst();
    await deque.popLast();
    assert(deleted.length === 2, "应删除2个节点，实际为" + deleted.length);
    for (const node of deleted) {
        assert(node.val === null && node.next === null && node.last === null, "已删除节点应清空val/next/last");
    }
    assert(deque.isEmpty(), "全部弹出后应为空");

    return summary + "；弹出节点清空回归2项";
}
