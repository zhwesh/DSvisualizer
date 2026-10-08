import { dijkstra } from "../../../algorithm/Graph/Dijkstra";
import { dijkstraNode } from "../../../node/GraphNode/impl/DijkstraNode";
import { MessageType } from "../../../controller/MessageController";
import { assert, clearMessages, dijkstraDistances, getMessages, initTest, randomDirectedGraph, randomInt, registerOpHook } from "../../TestUtils";

/**
 * dijkstra算法测试
 */
export async function testDijkstra(): Promise<string> {
    initTest();

    // 负边权
    let thrown = false;
    try {
        new dijkstra([[0, 1, -1]]);
    } catch {
        thrown = true;
    }
    assert(thrown, "负边权应抛出异常");

    // 空图
    clearMessages();
    await new dijkstra([]).execute();
    let messages = getMessages().slice();
    assert(messages.length === 1 && messages[0].type === MessageType.WARNING, "空图应提示警告");

    // 起点不存在
    clearMessages();
    await new dijkstra([[0, 1, 1]]).execute(5);
    messages = getMessages().slice();
    assert(messages.length === 1 && messages[0].type === MessageType.ERROR, "起点不存在应提示错误");
    clearMessages();
    await new dijkstra([[0, 1, 1]]).execute(-1);
    messages = getMessages().slice();
    assert(messages.length === 1 && messages[0].type === MessageType.ERROR, "起点不存在应提示错误");

    // 随机有向图对拍
    const graphs: dijkstraNode[] = [];
    registerOpHook((target, method) => {
        if (graphs.length === 0 && method === "_set_dis") {
            graphs.push(target as dijkstraNode);
        }
    });
    let caseCount = 0, totalNodes = 0, totalEdges = 0, maxNodes = 0;
    for (let t = 0; t < 30; ++t) {
        const n = randomInt(2, 10);
        const edges = randomDirectedGraph(n, randomInt(n - 1, n * 2), 0, 20);
        if (edges.length === 0) {
            continue;
        }
        graphs.length = 0;
        await new dijkstra(edges).execute(0);
        assert(graphs.length === 1, "未捕获到图节点");
        const node = graphs[0];

        const expected = dijkstraDistances(edges, 0);
        assert(node.dis.length === expected.length, "dis长度错误");
        for (let i = 0; i < expected.length; ++i) {
            assert(node.dis[i] === expected[i], "节点" + i + "最短距离错误，实际为" + node.dis[i] + "，期望为" + expected[i]);
        }

        ++caseCount;
        totalNodes += expected.length;
        totalEdges += edges.length;
        if (expected.length > maxNodes) {
            maxNodes = expected.length;
        }
    }
    registerOpHook(null);

    return "负边权、空图、起点不存在用例各1项；随机有向图" + caseCount + "张（最大" + maxNodes + "个节点，共" +
        totalNodes + "个节点、" + totalEdges + "条边）";
}
