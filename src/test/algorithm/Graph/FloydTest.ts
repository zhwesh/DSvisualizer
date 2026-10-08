import { floyd } from "../../../algorithm/Graph/Floyd";
import { floydNode } from "../../../node/GraphNode/impl/FloydNode";
import { MessageType } from "../../../controller/MessageController";
import { assert, clearMessages, floydDistances, getMessages, initTest, randomDirectedGraph, randomInt, registerOpHook } from "../../TestUtils";

/**
 * floyd算法测试
 */
export async function testFloyd(): Promise<string> {
    initTest();

    // 负边权
    let thrown = false;
    try {
        new floyd([[0, 1, -1]]);
    } catch {
        thrown = true;
    }
    assert(thrown, "负边权应抛出异常");

    // 空图
    clearMessages();
    await new floyd([]).execute();
    const messages = getMessages().slice();
    assert(messages.length === 1 && messages[0].type === MessageType.WARNING, "空图应提示警告");

    // 随机有向图对拍
    const graphs: floydNode[] = [];
    registerOpHook((target, method) => {
        if (graphs.length === 0 && method === "_set_dis") {
            graphs.push(target as floydNode);
        }
    });
    let caseCount = 0, totalNodes = 0, totalEdges = 0, maxNodes = 0;
    for (let t = 0; t < 20; ++t) {
        const n = randomInt(2, 9);
        const edges = randomDirectedGraph(n, randomInt(n - 1, n * 2), 0, 20);
        if (edges.length === 0) {
            continue;
        }
        graphs.length = 0;
        await new floyd(edges).execute();
        assert(graphs.length === 1, "未捕获到图节点");
        const node = graphs[0];

        const expected = floydDistances(edges);
        assert(node.dis.length === expected.length, "dis长度错误");
        for (let i = 0; i < expected.length; ++i) {
            for (let j = 0; j < expected.length; ++j) {
                assert(
                    node.dis[i][j] === expected[i][j],
                    "dis[" + i + "][" + j + "]错误，实际为" + node.dis[i][j] + "，期望为" + expected[i][j]
                );
            }
        }

        ++caseCount;
        totalNodes += expected.length;
        totalEdges += edges.length;
        if (expected.length > maxNodes) {
            maxNodes = expected.length;
        }
    }
    registerOpHook(null);

    return "负边权、空图用例各1项；随机有向图" + caseCount + "张（最大" + maxNodes + "个节点，共" +
        totalNodes + "个节点、" + totalEdges + "条边）";
}
