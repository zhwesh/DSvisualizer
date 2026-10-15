import { SegmentTree } from "../../../../datastucture/Tree/SegmentTree/SegmentTree";
import { MessageType } from "../../../../controller/MessageController";
import { create } from "../../../../node/factory";
import { assert, checkSegmentTreeModel, clearMessages, getMessages, initTest, randomInt } from "../../../TestUtils";

/**
 * 线段树测试
 */
export async function testSegmentTree(): Promise<string> {
    initTest();

    // 空树
    const empty = create(SegmentTree, []);
    clearMessages();
    assert(await empty.query(0, 0) === null, "空树查询应返回null");
    await empty.add(0, 0, 1);
    const emptyErrors = getMessages().slice();
    assert(emptyErrors.length === 2 && emptyErrors.every((message) => message.type === MessageType.ERROR), "空树操作应提示2条错误");

    // 随机初始数组
    const n = randomInt(3, 12);
    const nums: number[] = [];
    for (let i = 0; i < n; ++i) {
        nums.push(randomInt(-20, 20));
    }
    const summary = await checkSegmentTreeModel(create(SegmentTree, nums), nums);

    return "空树用例2项；" + summary;
}
