import { prim } from "../../../algorithm/Graph/Prim";
import { prim_GREEN } from "../../../node/GraphNode/impl/PrimNode";
import { MessageType } from "../../../controller/MessageController";
import { assert, clearMessages, getMessages, initTest, mstWeight, randomConnectedGraph, randomInt, registerOpHook } from "../../TestUtils";

/**
 * 最小生成树（prim算法）测试
 */
export async function testPrim(): Promise<string> {
    initTest();

    // 空图
    clearMessages();
    await new prim([]).execute();
    let messages = getMessages().slice();
    assert(messages.length === 1 && messages[0].type === MessageType.WARNING, "空图应提示警告");

    // 不连通图
    clearMessages();
    await new prim([[0, 1, 1], [2, 3, 1]]).execute();
    messages = getMessages().slice();
    assert(messages.some((message) => message.type === MessageType.ERROR), "不连通图应提示错误");

    // 随机连通图对拍
    let selected: number[][] = [];
    registerOpHook((_target, method, args) => {
        if (method === "_set_edge_color" && args[2] === prim_GREEN) {
            selected.push([args[0], args[1]]);
        }
    });
    let caseCount = 0, totalNodes = 0, totalEdges = 0, maxNodes = 0;
    for (let t = 0; t < 30; ++t) {
        const n = randomInt(2, 12);
        const edges = randomConnectedGraph(n, randomInt(0, 8), -10, 10);
        const weights = new Map<string, number>();
        for (const [u, v, w] of edges) {
            weights.set(Math.min(u, v) + "," + Math.max(u, v), w);
        }
        const expected = mstWeight(edges);
        assert(expected !== null, "参考最小生成树不应为null");

        selected = [];
        await new prim(edges).execute();
        assert(selected.length === n - 1, "生成树边数应为" + (n - 1) + "，实际为" + selected.length);
        let total = 0;
        for (const [u, v] of selected) {
            total += weights.get(Math.min(u, v) + "," + Math.max(u, v))!;
        }
        assert(total === expected, "最小生成树总权值错误，实际为" + total + "，期望为" + expected);

        ++caseCount;
        totalNodes += n;
        totalEdges += edges.length;
        if (n > maxNodes) {
            maxNodes = n;
        }
    }
    registerOpHook(null);

    return "空图、不连通图用例各1项；随机连通图" + caseCount + "张（最大" + maxNodes + "个节点，共" +
        totalNodes + "个节点、" + totalEdges + "条边）";
}
