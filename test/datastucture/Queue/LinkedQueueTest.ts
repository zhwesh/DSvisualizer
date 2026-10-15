import { LinkedQueue } from "../../../datastucture/Queue/LinkedQueue";
import { SinglyLinkedNode } from "../../../node/LinkedNode/impl/SinglyLinkedNode";
import { create } from "../../../node/factory";
import { assert, checkQueueModel, initTest, registerOpHook } from "../../TestUtils";

/**
 * 普通队列（单链表实现）测试
 */
export async function testLinkedQueue(): Promise<string> {
    initTest();
    const summary = await checkQueueModel(create(LinkedQueue));

    // 弹出的节点应清空val/next
    const deleted: SinglyLinkedNode[] = [];
    registerOpHook((target, method) => {
        if (method === "_delete") {
            deleted.push(target as SinglyLinkedNode);
        }
    });
    const queue = create(LinkedQueue);
    await queue.push(1);
    await queue.push(2);
    await queue.pop();
    await queue.pop();
    assert(deleted.length === 2, "应删除2个节点，实际为" + deleted.length);
    for (const node of deleted) {
        assert(node.val === null && node.next === null, "已删除节点应清空val/next");
    }
    assert(queue.isEmpty(), "全部弹出后应为空");

    return summary + "；弹出节点清空回归2项";
}
