import { CircularLinkedList } from "../../../datastucture/List/CircularLinkedList";
import { create } from "../../../node/factory";
import { assert, checkListModel, initTest } from "../../TestUtils";

/**
 * 线性表（循环链表实现）测试
 */
export async function testCircularLinkedList(): Promise<string> {
    initTest();
    const summary = await checkListModel(create(CircularLinkedList));

    // 头部反复插入/删除（哨兵节点处理）
    const list = create(CircularLinkedList);
    for (let i = 0; i < 20; ++i) {
        await list.insert(0, i);
    }
    for (let i = 19; i >= 0; --i) {
        assert(await list.get(0) === i, "头部插入后顺序错误");
        await list.delete(0);
    }
    assert(list.isEmpty(), "头部删除后应为空");

    return summary + "；哨兵头插/头删20个元素";
}
