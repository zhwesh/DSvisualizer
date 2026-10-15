import { LinkedStack } from "../../../datastucture/Stack/LinkedStack";
import { SinglyLinkedNode } from "../../../node/LinkedNode/impl/SinglyLinkedNode";
import { create } from "../../../node/factory";
import { assert, checkStackModel, initTest, registerOpHook } from "../../TestUtils";

/**
 * 栈（单链表实现）测试
 */
export async function testLinkedStack(): Promise<string> {
    initTest();
    const summary = await checkStackModel(create(LinkedStack));

    // 弹出的节点应清空val/next
    const deleted: SinglyLinkedNode[] = [];
    registerOpHook((target, method) => {
        if (method === "_delete") {
            deleted.push(target as SinglyLinkedNode);
        }
    });
    const stack = create(LinkedStack);
    await stack.push(1);
    await stack.push(2);
    await stack.pop();
    await stack.pop();
    assert(deleted.length === 2, "应删除2个节点，实际为" + deleted.length);
    for (const node of deleted) {
        assert(node.val === null && node.next === null, "已删除节点应清空val/next");
    }
    assert(stack.isEmpty(), "全部弹出后应为空");

    return summary + "；弹出节点清空回归2项";
}
