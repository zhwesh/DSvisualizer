import { MessageController, MessageType } from "../controller/MessageController";
import { StepController, StepStatus } from "../controller/StepController";
import { DataNode } from "../node/DataNode";
import { setOpHook } from "../node/factory";

// 测试期间收到的消息
let messages: { msg: string; type: number }[] = [];
// 伪随机数种子
let seed: number = 123456789;
// 原子操作调用次数（不含创建实例）
let atomicOps: number = 0;
// 创建实例次数
let nodeCreations: number = 0;
// 各类消息条数（下标为MessageType）
let messageCount: number[] = [0, 0, 0, 0];
// 测试注册的原子操作回调
let testOpHook: ((target: object, method: string, args: any[]) => void) | null = null;

/**
 * 测试统计信息
 */
export interface TestStats {
    // 原子操作调用次数
    atomicOps: number;
    // 创建实例次数
    nodeCreations: number;
    // 消息总条数
    messages: number;
    // 普通消息条数
    infoMessages: number;
    // 警告消息条数
    warningMessages: number;
    // 错误消息条数
    errorMessages: number;
    // 成功消息条数
    successMessages: number;
}

/**
 * 断言条件成立，否则抛出异常
 * @param condition 断言条件
 * @param message 断言失败时的提示信息
 */
export function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error("断言失败：" + message);
    }
}

/**
 * 断言数组与期望数组一致
 * @param actual 实际数组
 * @param expected 期望数组
 * @param message 断言失败时的提示信息
 */
export function assertArrayEqual(actual: number[], expected: number[], message: string): void {
    assert(
        actual.length === expected.length && actual.every((val, idx) => val === expected[idx]),
        message + "，实际为[" + actual.join(", ") + "]，期望为[" + expected.join(", ") + "]"
    );
}

/**
 * 初始化测试环境
 * 同步化定时器并进入自动播放（间隔0），同时重置节点id、随机种子、统计信息与原子操作回调，接管消息
 */
export function initTest(): void {
    // 同步执行定时器回调，避免等待真实时间
    (globalThis as any).setTimeout = (handler: () => void): number => {
        handler();
        return 0;
    };

    const stepController = StepController.getStepController();
    stepController.setTimeInterval(0);
    stepController.setStatus(StepStatus.PLAYING);

    DataNode.restart();
    resetRandom();

    // 重置统计信息，并装上统计回调（测试自己注册的回调会被转发）
    atomicOps = 0;
    nodeCreations = 0;
    messageCount = [0, 0, 0, 0];
    testOpHook = null;
    setOpHook((target, method, args) => {
        if (method === "_create") {
            ++nodeCreations;
        } else {
            ++atomicOps;
        }
        testOpHook?.(target, method, args);
    });

    messages = [];
    MessageController.getMessageController().setMessageHandler((msg: string, type: number) => {
        messages.push({ msg: msg, type: type });
        ++messageCount[type];
    });
}

/**
 * 注册原子操作回调（与用于统计的回调叠加生效）
 * @param hook 原子操作回调
 */
export function registerOpHook(hook: ((target: object, method: string, args: any[]) => void) | null): void {
    testOpHook = hook;
}

/**
 * 获取本次测试的统计信息
 * @returns 统计信息
 */
export function getStats(): TestStats {
    return {
        atomicOps: atomicOps,
        nodeCreations: nodeCreations,
        messages: messageCount[MessageType.INFO] + messageCount[MessageType.WARNING] +
            messageCount[MessageType.ERROR] + messageCount[MessageType.SUCCESS],
        infoMessages: messageCount[MessageType.INFO],
        warningMessages: messageCount[MessageType.WARNING],
        errorMessages: messageCount[MessageType.ERROR],
        successMessages: messageCount[MessageType.SUCCESS],
    };
}

/**
 * 格式化统计信息
 * @param stats 统计信息
 * @returns 统计信息文本
 */
export function formatStats(stats: TestStats): string {
    return "原子操作" + stats.atomicOps + "次，创建实例" + stats.nodeCreations + "个，消息" +
        stats.messages + "条（普通" + stats.infoMessages + "、警告" + stats.warningMessages +
        "、错误" + stats.errorMessages + "、成功" + stats.successMessages + "）";
}

/**
 * 清空已记录的消息
 */
export function clearMessages(): void {
    messages = [];
}

/**
 * 获取已记录的消息
 * @returns 消息列表
 */
export function getMessages(): { msg: string; type: number }[] {
    return messages;
}

/**
 * 重置随机种子
 */
export function resetRandom(): void {
    seed = 123456789;
}

/**
 * 生成[0, 1)内的伪随机数（结果可复现）
 * @returns 伪随机数
 */
export function random(): number {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed / 4294967296;
}

/**
 * 生成[min, max]内的随机整数
 * @param min 最小值
 * @param max 最大值
 * @returns 随机整数
 */
export function randomInt(min: number, max: number): number {
    return min + Math.floor(random() * (max - min + 1));
}

/**
 * 生成随机数组集合
 * @param count 数组个数
 * @param maxLength 最大长度
 * @param minVal 元素最小值
 * @param maxVal 元素最大值
 * @returns 随机数组集合
 */
export function randomArrays(count: number, maxLength: number, minVal: number, maxVal: number): number[][] {
    const arrays: number[][] = [];
    for (let t = 0; t < count; ++t) {
        const data: number[] = [];
        const n = randomInt(0, maxLength);
        for (let i = 0; i < n; ++i) {
            data.push(randomInt(minVal, maxVal));
        }
        arrays.push(data);
    }
    return arrays;
}

/**
 * 可测试的线性表接口
 */
export interface TestableList {
    isEmpty(): boolean;
    size(): number;
    get(idx: number): Promise<number | null>;
    set(idx: number, val: number): Promise<void>;
    insert(idx: number, val: number): Promise<void>;
    delete(idx: number): Promise<void>;
    clear(): void;
}

/**
 * 可测试的排序算法接口
 */
export interface TestableSorter {
    sort(data: number[]): Promise<void>;
}

/**
 * 读取线性表中的全部元素
 * @param list 线性表
 * @returns 元素数组
 */
async function collect(list: TestableList): Promise<number[]> {
    const data: number[] = [];
    for (let i = 0; i < list.size(); ++i) {
        data.push((await list.get(i))!);
    }
    return data;
}

/**
 * 线性表通用测试：基本增删改查、越界操作、随机对拍、清空
 * @param list 待测试的线性表
 * @returns 数据量描述
 */
export async function checkListModel(list: TestableList): Promise<string> {
    // 初始状态
    assert(list.isEmpty(), "初始表应为空");
    assert(list.size() === 0, "初始表大小应为0");
    assert(await list.get(0) === null, "空表查询应返回null");

    // 基本增删改查
    await list.insert(0, 1);
    await list.insert(1, 2);
    await list.insert(1, 3);
    assertArrayEqual(await collect(list), [1, 3, 2], "基本插入");
    await list.set(1, 4);
    assert(await list.get(1) === 4, "基本修改");
    await list.delete(1);
    assertArrayEqual(await collect(list), [1, 2], "基本删除");
    assert(list.size() === 2 && !list.isEmpty(), "基本操作后大小错误");

    // 越界操作
    const before = await collect(list);
    clearMessages();
    await list.insert(-1, 9);
    await list.insert(list.size() + 1, 9);
    await list.delete(-1);
    await list.delete(list.size());
    assert(await list.get(-1) === null, "越界查询应返回null");
    assert(await list.get(list.size()) === null, "越界查询应返回null");
    await list.set(list.size(), 9);
    const errors = getMessages().slice();
    assertArrayEqual(await collect(list), before, "越界操作不应改变数据");
    assert(errors.length === 7, "越界操作应提示7条错误，实际为" + errors.length);
    assert(errors.every((message) => message.type === MessageType.ERROR), "越界操作应提示错误信息");

    // 随机对拍
    const model = await collect(list);
    let insertCount = 0, deleteCount = 0, setCount = 0, getCount = 0;
    let maxLength = model.length;
    for (let step = 0; step < 200; ++step) {
        const op = randomInt(0, 3);
        if (op === 0 || model.length === 0) {
            const idx = randomInt(0, model.length);
            const val = randomInt(-100, 100);
            await list.insert(idx, val);
            model.splice(idx, 0, val);
            ++insertCount;
        } else if (op === 1) {
            const idx = randomInt(0, model.length - 1);
            await list.delete(idx);
            model.splice(idx, 1);
            ++deleteCount;
        } else if (op === 2) {
            const idx = randomInt(0, model.length - 1);
            const val = randomInt(-100, 100);
            await list.set(idx, val);
            model[idx] = val;
            ++setCount;
        } else {
            const idx = randomInt(0, model.length - 1);
            assert(await list.get(idx) === model[idx], "随机对拍：查询下标" + idx);
            ++getCount;
        }
        if (model.length > maxLength) {
            maxLength = model.length;
        }
        assert(list.size() === model.length, "随机对拍：第" + step + "步后大小错误");
        if (step % 50 === 0) {
            assertArrayEqual(await collect(list), model, "随机对拍：第" + step + "步后数据");
        }
    }
    assertArrayEqual(await collect(list), model, "随机对拍：最终数据");

    // 清空
    list.clear();
    assert(list.isEmpty() && list.size() === 0, "clear后应为空");
    clearMessages();
    list.clear();
    const warnings = getMessages();
    assert(warnings.length === 1 && warnings[0].type === MessageType.WARNING, "空表clear应提示警告");

    return "随机对拍200次操作（插入" + insertCount + "、删除" + deleteCount + "、修改" + setCount +
        "、查询" + getCount + "），表最大长度" + maxLength + "；越界用例7项，清空用例2项";
}

/**
 * 排序算法通用测试：排序结果应与标准排序一致
 * @param sorter 待测试的排序算法
 * @param data 待排序数组（会被原地排序）
 */
export async function checkSort(sorter: TestableSorter, data: number[]): Promise<void> {
    const expected = data.slice().sort((a, b) => a - b);
    await sorter.sort(data);
    assertArrayEqual(data, expected, "排序结果错误");
}

/**
 * 排序批量测试结果
 */
export interface SortBatchStats {
    // 用例组数
    cases: number;
    // 元素总个数
    elements: number;
    // 最大数组长度
    maxLength: number;
}

/**
 * 排序算法批量测试
 * @param sorterFactory 排序算法工厂
 * @param cases 用例集合
 * @returns 批量测试结果
 */
export async function checkSortBatch(sorterFactory: () => TestableSorter, cases: number[][]): Promise<SortBatchStats> {
    let elements = 0;
    let maxLength = 0;
    for (const data of cases) {
        await checkSort(sorterFactory(), data);
        elements += data.length;
        if (data.length > maxLength) {
            maxLength = data.length;
        }
    }
    return { cases: cases.length, elements: elements, maxLength: maxLength };
}

/**
 * 可测试的栈/队列接口
 */
export interface TestableStackQueue {
    isEmpty(): boolean;
    size(): number;
    top(): Promise<number | null>;
    push(val: number): Promise<void>;
    pop(): Promise<void>;
    clear(): void;
}

/**
 * 可测试的双端队列接口
 */
export interface TestableDeque {
    isEmpty(): boolean;
    size(): number;
    getFirst(): Promise<number | null>;
    getLast(): Promise<number | null>;
    pushFirst(val: number): Promise<void>;
    pushLast(val: number): Promise<void>;
    popFirst(): Promise<void>;
    popLast(): Promise<void>;
    clear(): void;
}

/**
 * 可测试的堆接口
 */
export interface TestableHeap {
    isEmpty(): boolean;
    size(): number;
    top(): Promise<number | null>;
    push(val: number): Promise<void>;
    pop(): Promise<void>;
    clear(): void;
}

/**
 * 栈/队列通用测试：空表操作、随机对拍、清空
 * @param target 待测试的栈或队列
 * @param lifo 是否为栈（后进先出），否则为队列（先进先出）
 * @param name 名称（用于提示信息）
 * @returns 数据量描述
 */
async function checkStackQueueModel(target: TestableStackQueue, lifo: boolean, name: string): Promise<string> {
    // 初始状态
    assert(target.isEmpty(), "初始" + name + "应为空");
    assert(target.size() === 0, "初始" + name + "大小应为0");

    // 空时操作
    clearMessages();
    assert(await target.top() === null, "空" + name + "取顶应返回null");
    await target.pop();
    assert(target.isEmpty() && target.size() === 0, "空" + name + "弹出后仍应为空");
    const errors = getMessages().slice();
    assert(errors.length === 2 && errors.every((message) => message.type === MessageType.ERROR), "空" + name + "操作应提示2条错误");

    // 随机对拍
    const pushName = lifo ? "入栈" : "入队";
    const popName = lifo ? "出栈" : "出队";
    const topName = lifo ? "取栈顶" : "取队首";
    const model: number[] = [];
    let pushCount = 0, popCount = 0, topCount = 0;
    let maxLength = 0;
    for (let step = 0; step < 200; ++step) {
        const op = randomInt(0, 2);
        if (op === 0 || model.length === 0) {
            const val = randomInt(-100, 100);
            await target.push(val);
            model.push(val);
            ++pushCount;
        } else if (op === 1) {
            await target.pop();
            if (lifo) {
                model.pop();
            } else {
                model.shift();
            }
            ++popCount;
        } else {
            const expected = lifo ? model[model.length - 1] : model[0];
            assert(await target.top() === expected, "随机对拍：" + topName + "错误");
            ++topCount;
        }
        if (model.length > maxLength) {
            maxLength = model.length;
        }
        assert(target.size() === model.length, "随机对拍：第" + step + "步后大小错误");
        if (model.length > 0) {
            const expected = lifo ? model[model.length - 1] : model[0];
            assert(await target.top() === expected, "随机对拍：第" + step + "步后" + topName + "错误");
        }
    }

    // 清空
    target.clear();
    assert(target.isEmpty() && target.size() === 0, "clear后" + name + "应为空");
    clearMessages();
    target.clear();
    const warnings = getMessages();
    assert(warnings.length === 1 && warnings[0].type === MessageType.WARNING, "空" + name + "clear应提示警告");

    return "随机对拍200次操作（" + pushName + pushCount + "、" + popName + popCount + "、" + topName +
        topCount + "），最大大小" + maxLength + "；空" + name + "用例2项，清空用例2项";
}

/**
 * 栈通用测试：入栈、出栈、取栈顶、空栈操作、随机对拍、清空
 * @param stack 待测试的栈
 * @returns 数据量描述
 */
export async function checkStackModel(stack: TestableStackQueue): Promise<string> {
    return await checkStackQueueModel(stack, true, "栈");
}

/**
 * 队列通用测试：入队、出队、取队首、空队列操作、随机对拍、清空
 * @param queue 待测试的队列
 * @returns 数据量描述
 */
export async function checkQueueModel(queue: TestableStackQueue): Promise<string> {
    return await checkStackQueueModel(queue, false, "队列");
}

/**
 * 双端队列通用测试：空队列操作、随机对拍、清空
 * @param deque 待测试的双端队列
 * @returns 数据量描述
 */
export async function checkDequeModel(deque: TestableDeque): Promise<string> {
    // 初始状态
    assert(deque.isEmpty(), "初始队列应为空");
    assert(deque.size() === 0, "初始队列大小应为0");

    // 空队列操作
    clearMessages();
    assert(await deque.getFirst() === null, "空队列取队首应返回null");
    assert(await deque.getLast() === null, "空队列取队尾应返回null");
    await deque.popFirst();
    await deque.popLast();
    assert(deque.isEmpty() && deque.size() === 0, "空队列弹出后仍应为空");
    const errors = getMessages().slice();
    assert(errors.length === 4 && errors.every((message) => message.type === MessageType.ERROR), "空队列操作应提示4条错误");

    // 随机对拍
    const model: number[] = [];
    let pushFirstCount = 0, pushLastCount = 0, popFirstCount = 0, popLastCount = 0, getCount = 0;
    let maxLength = 0;
    for (let step = 0; step < 300; ++step) {
        const op = randomInt(0, 5);
        if (op === 0 || model.length === 0) {
            const val = randomInt(-100, 100);
            await deque.pushLast(val);
            model.push(val);
            ++pushLastCount;
        } else if (op === 1) {
            const val = randomInt(-100, 100);
            await deque.pushFirst(val);
            model.unshift(val);
            ++pushFirstCount;
        } else if (op === 2) {
            await deque.popFirst();
            model.shift();
            ++popFirstCount;
        } else if (op === 3) {
            await deque.popLast();
            model.pop();
            ++popLastCount;
        } else if (op === 4) {
            assert(await deque.getFirst() === model[0], "随机对拍：取队首错误");
            ++getCount;
        } else {
            assert(await deque.getLast() === model[model.length - 1], "随机对拍：取队尾错误");
            ++getCount;
        }
        if (model.length > maxLength) {
            maxLength = model.length;
        }
        assert(deque.size() === model.length, "随机对拍：第" + step + "步后大小错误");
        if (model.length > 0) {
            assert(await deque.getFirst() === model[0], "随机对拍：第" + step + "步后队首错误");
            assert(await deque.getLast() === model[model.length - 1], "随机对拍：第" + step + "步后队尾错误");
        }
    }

    // 清空
    deque.clear();
    assert(deque.isEmpty() && deque.size() === 0, "clear后队列应为空");
    clearMessages();
    deque.clear();
    const warnings = getMessages();
    assert(warnings.length === 1 && warnings[0].type === MessageType.WARNING, "空队列clear应提示警告");

    return "随机对拍300次操作（首插" + pushFirstCount + "、尾插" + pushLastCount + "、首弹" + popFirstCount +
        "、尾弹" + popLastCount + "、取首尾" + getCount + "），最大长度" + maxLength + "；空队列用例4项，清空用例2项";
}

/**
 * 堆通用测试：空堆操作、随机对拍（小根堆，堆顶为最小值）、清空
 * @param heap 待测试的堆
 * @returns 数据量描述
 */
export async function checkHeapModel(heap: TestableHeap): Promise<string> {
    // 初始状态
    assert(heap.isEmpty(), "初始堆应为空");
    assert(heap.size() === 0, "初始堆大小应为0");

    // 空堆操作
    clearMessages();
    assert(await heap.top() === null, "空堆取堆顶应返回null");
    await heap.pop();
    assert(heap.isEmpty() && heap.size() === 0, "空堆弹出后仍应为空");
    const errors = getMessages().slice();
    assert(errors.length === 2 && errors.every((message) => message.type === MessageType.ERROR), "空堆操作应提示2条错误");

    // 随机对拍
    const model: number[] = [];
    let pushCount = 0, popCount = 0, topCount = 0;
    let maxLength = 0;
    for (let step = 0; step < 200; ++step) {
        const op = randomInt(0, 1);
        if (op === 0 || model.length === 0) {
            const val = randomInt(-100, 100);
            await heap.push(val);
            model.push(val);
            ++pushCount;
        } else {
            let minIdx = 0;
            for (let i = 1; i < model.length; ++i) {
                if (model[i] < model[minIdx]) {
                    minIdx = i;
                }
            }
            assert(await heap.top() === model[minIdx], "随机对拍：堆顶应为最小值");
            await heap.pop();
            model.splice(minIdx, 1);
            ++popCount;
        }
        if (model.length > maxLength) {
            maxLength = model.length;
        }
        assert(heap.size() === model.length, "随机对拍：第" + step + "步后大小错误");
        if (model.length > 0) {
            let min = model[0];
            for (const val of model) {
                if (val < min) {
                    min = val;
                }
            }
            assert(await heap.top() === min, "随机对拍：第" + step + "步后堆顶错误");
            ++topCount;
        }
    }

    // 清空
    heap.clear();
    assert(heap.isEmpty() && heap.size() === 0, "clear后堆应为空");
    clearMessages();
    heap.clear();
    const warnings = getMessages();
    assert(warnings.length === 1 && warnings[0].type === MessageType.WARNING, "空堆clear应提示警告");

    return "随机对拍200次操作（插入" + pushCount + "、弹出" + popCount + "），最大大小" + maxLength +
        "；堆顶校验" + topCount + "次；空堆用例2项，清空用例2项";
}

/**
 * 可测试的二叉搜索树接口
 */
export interface TestableBST {
    isEmpty(): boolean;
    size(): number;
    contains(val: number): Promise<boolean>;
    insert(val: number): Promise<void>;
    delete(val: number): Promise<void>;
    clear(): void;
}

/**
 * 二叉搜索树通用测试：空树操作、重复插入、随机对拍、清空
 * @param tree 待测试的二叉搜索树
 * @param name 名称（用于提示信息）
 * @returns 数据量描述
 */
export async function checkBSTModel(tree: TestableBST, name: string): Promise<string> {
    // 初始状态
    assert(tree.isEmpty(), "初始" + name + "应为空");
    assert(tree.size() === 0, "初始" + name + "大小应为0");
    assert(await tree.contains(0) === false, "空" + name + "查找应返回false");

    // 重复插入、删除不存在的值
    clearMessages();
    await tree.insert(10);
    assert(tree.size() === 1, "插入后大小应为1");
    await tree.insert(10);
    assert(tree.size() === 1, "重复插入不应改变大小");
    await tree.delete(11);
    assert(tree.size() === 1 && await tree.contains(10), "删除不存在的值不应改变树");
    const warnings = getMessages().slice();
    assert(warnings.filter((message) => message.type === MessageType.WARNING).length === 2, "重复插入与删除不存在应提示2条警告");

    // 随机对拍
    const model: number[] = [10];
    let insertCount = 0, deleteCount = 0, containsCount = 0;
    let maxSize = model.length;
    for (let step = 0; step < 400; ++step) {
        const val = randomInt(0, 60);
        const op = randomInt(0, 2);
        const idx = model.indexOf(val);
        if (op === 0) {
            if (idx === -1) {
                await tree.insert(val);
                let i = 0;
                while (i < model.length && model[i] < val) {
                    ++i;
                }
                model.splice(i, 0, val);
                ++insertCount;
            }
        } else if (op === 1) {
            if (idx !== -1) {
                await tree.delete(val);
                model.splice(idx, 1);
                ++deleteCount;
            }
        } else {
            assert(await tree.contains(val) === (idx !== -1), "随机对拍：查找结果错误");
            ++containsCount;
        }
        if (model.length > maxSize) {
            maxSize = model.length;
        }
        assert(tree.size() === model.length, "随机对拍：第" + step + "步后大小错误");
    }

    // 清空
    tree.clear();
    assert(tree.isEmpty() && tree.size() === 0, "clear后" + name + "应为空");
    clearMessages();
    tree.clear();
    const emptyWarnings = getMessages();
    assert(emptyWarnings.length === 1 && emptyWarnings[0].type === MessageType.WARNING, "空" + name + "clear应提示警告");

    return "重复插入、删除不存在各1项；随机对拍400次操作（插入" + insertCount + "、删除" + deleteCount +
        "、查找" + containsCount + "），最大大小" + maxSize + "；清空用例2项";
}

/**
 * 可测试的替罪羊树接口
 */
export interface TestableScapegoat extends TestableBST {
    small(val: number): Promise<number>;
    rank(val: number): Promise<number | null>;
    index(k: number): Promise<number | null>;
    predecessor(val: number): Promise<number | null>;
    successor(val: number): Promise<number | null>;
}

/**
 * 替罪羊树排名查询测试：small、rank、index、predecessor、successor
 * @param tree 待测试的替罪羊树（应为空树）
 * @returns 数据量描述
 */
export async function checkScapegoatQueries(tree: TestableScapegoat): Promise<string> {
    // 空树查询
    clearMessages();
    assert(await tree.small(0) === 0, "空树small应返回0");
    assert(await tree.rank(0) === null, "空树rank应返回null");
    assert(await tree.index(1) === null, "空树index应返回null");
    assert(await tree.predecessor(0) === null, "空树predecessor应返回null");
    assert(await tree.successor(0) === null, "空树successor应返回null");

    // 建树
    const model: number[] = [];
    for (let val = 0; val < 30; ++val) {
        await tree.insert(val);
        model.push(val);
    }

    // 随机查询对拍
    let queryCount = 0;
    for (let t = 0; t < 200; ++t) {
        const val = randomInt(-5, 35);
        const op = randomInt(0, 4);
        if (op === 0) {
            let small = 0;
            while (small < model.length && model[small] < val) {
                ++small;
            }
            assert(await tree.small(val) === small, "small(" + val + ")错误");
        } else if (op === 1) {
            const idx = model.indexOf(val);
            assert(await tree.rank(val) === (idx === -1 ? null : idx + 1), "rank(" + val + ")错误");
        } else if (op === 2) {
            const k = randomInt(-2, model.length + 2);
            assert(await tree.index(k) === (k < 1 || k > model.length ? null : model[k - 1]), "index(" + k + ")错误");
        } else if (op === 3) {
            let expected: number | null = null;
            for (const value of model) {
                if (value < val) {
                    expected = value;
                }
            }
            assert(await tree.predecessor(val) === expected, "predecessor(" + val + ")错误");
        } else {
            let expected: number | null = null;
            for (let i = model.length - 1; i >= 0; --i) {
                if (model[i] > val) {
                    expected = model[i];
                }
            }
            assert(await tree.successor(val) === expected, "successor(" + val + ")错误");
        }
        ++queryCount;
    }
    tree.clear();

    return "空树查询5项；排名查询对拍" + queryCount + "次（small、rank、index、predecessor、successor）";
}

/**
 * 可测试的哈希表接口
 */
export interface TestableHashTable {
    isEmpty(): boolean;
    size(): number;
    contains(key: number): Promise<boolean>;
    add(key: number): Promise<boolean>;
    remove(key: number): Promise<boolean>;
    clear(): void;
}

/**
 * 哈希表通用测试：空表操作、重复键、随机对拍（覆盖扩容与重散列）、清空
 * @param table 待测试的哈希表
 * @returns 数据量描述
 */
export async function checkHashTableModel(table: TestableHashTable): Promise<string> {
    // 初始状态
    assert(table.isEmpty(), "初始哈希表应为空");
    assert(table.size() === 0, "初始哈希表大小应为0");

    // 空表操作
    clearMessages();
    assert(await table.contains(0) === false, "空表查找应返回false");
    assert(await table.remove(0) === false, "空表删除应返回false");
    const emptyWarnings = getMessages().slice();
    assert(emptyWarnings.filter((message) => message.type === MessageType.WARNING).length === 2, "空表操作应提示2条警告");

    // 重复添加、重复删除
    clearMessages();
    assert(await table.add(5) === true, "添加新键应返回true");
    assert(await table.add(5) === false, "重复添加应返回false");
    assert(table.size() === 1, "重复添加不应改变大小");
    assert(await table.contains(5) === true, "查找已添加的键应返回true");
    assert(await table.remove(5) === true, "删除已存在的键应返回true");
    assert(await table.remove(5) === false, "删除不存在的键应返回false");
    assert(table.isEmpty(), "删除后应为空");
    const keyWarnings = getMessages().slice();
    assert(keyWarnings.filter((message) => message.type === MessageType.WARNING).length === 2, "重复添加与重复删除应提示2条警告");

    // 随机对拍
    const model = new Set<number>();
    let addCount = 0, removeCount = 0, containsCount = 0;
    let maxSize = 0;
    for (let step = 0; step < 400; ++step) {
        const key = randomInt(0, 300);
        const op = randomInt(0, 2);
        if (op === 0) {
            assert(await table.add(key) === !model.has(key), "随机对拍：添加返回值错误");
            model.add(key);
            ++addCount;
        } else if (op === 1) {
            assert(await table.remove(key) === model.has(key), "随机对拍：删除返回值错误");
            model.delete(key);
            ++removeCount;
        } else {
            assert(await table.contains(key) === model.has(key), "随机对拍：查找结果错误");
            ++containsCount;
        }
        if (model.size > maxSize) {
            maxSize = model.size;
        }
        assert(table.size() === model.size, "随机对拍：第" + step + "步后大小错误");
    }

    // 清空
    table.clear();
    assert(table.isEmpty() && table.size() === 0, "clear后哈希表应为空");
    clearMessages();
    table.clear();
    const clearWarnings = getMessages();
    assert(clearWarnings.length === 1 && clearWarnings[0].type === MessageType.WARNING, "空表clear应提示警告");

    return "空表、重复添加、重复删除用例各1项；随机对拍400次操作（添加" + addCount + "、删除" + removeCount +
        "、查找" + containsCount + "），最大键数" + maxSize + "；清空用例2项";
}

/**
 * 可测试的前缀树接口
 */
export interface TestableTrie {
    isEmpty(): boolean;
    size(): number;
    insert(str: string): Promise<void>;
    find(str: string): Promise<number>;
    prefix(str: string): Promise<number>;
    delete(str: string): Promise<void>;
    clear(): void;
}

/**
 * 前缀树通用测试：空串/非法字符、重复字符串、随机对拍、清空
 * @param trie 待测试的前缀树
 * @returns 数据量描述
 */
export async function checkTrieModel(trie: TestableTrie): Promise<string> {
    // 初始状态
    assert(trie.isEmpty(), "初始前缀树应为空");
    assert(trie.size() === 0, "初始前缀树大小应为0");

    // 空串
    clearMessages();
    await trie.insert("");
    assert(await trie.find("") === 0, "空串查找应返回0");
    assert(await trie.prefix("") === 0, "空串前缀查询应返回0");
    await trie.delete("");
    assert(trie.size() === 0, "空串操作不应改变大小");
    const emptyMessages = getMessages().slice();
    assert(emptyMessages.filter((message) => message.type === MessageType.WARNING).length === 4, "空串操作应提示4条警告");

    // 非法字符
    clearMessages();
    await trie.insert("A1");
    await trie.find("a1B");
    await trie.prefix("A");
    await trie.delete("Z");
    assert(trie.size() === 0, "非法字符串不应改变大小");
    const invalidMessages = getMessages().slice();
    assert(invalidMessages.filter((message) => message.type === MessageType.ERROR).length === 4, "非法字符串应提示4条错误");

    // 随机对拍
    const alphabet = "abc";
    const model = new Map<string, number>();
    const randomString = (): string => {
        const len = randomInt(1, 4);
        let str = "";
        for (let i = 0; i < len; ++i) {
            str += alphabet.charAt(randomInt(0, alphabet.length - 1));
        }
        return str;
    };
    let insertCount = 0, deleteCount = 0, findCount = 0, prefixCount = 0;
    let maxSize = 0, total = 0;
    for (let step = 0; step < 300; ++step) {
        const str = randomString();
        const op = randomInt(0, 3);
        if (op === 0) {
            await trie.insert(str);
            model.set(str, (model.get(str) ?? 0) + 1);
            ++insertCount;
            ++total;
        } else if (op === 1) {
            await trie.delete(str);
            const count = model.get(str) ?? 0;
            if (count > 0) {
                if (count === 1) {
                    model.delete(str);
                } else {
                    model.set(str, count - 1);
                }
                --total;
            }
            ++deleteCount;
        } else if (op === 2) {
            assert(await trie.find(str) === (model.get(str) ?? 0), "随机对拍：find('" + str + "')错误");
            ++findCount;
        } else {
            let expected = 0;
            for (const [key, count] of model) {
                if (key.startsWith(str)) {
                    expected += count;
                }
            }
            assert(await trie.prefix(str) === expected, "随机对拍：prefix('" + str + "')错误");
            ++prefixCount;
        }
        if (total > maxSize) {
            maxSize = total;
        }
        assert(trie.size() === total, "随机对拍：第" + step + "步后大小错误");
    }

    // 清空
    trie.clear();
    assert(trie.isEmpty() && trie.size() === 0, "clear后前缀树应为空");
    clearMessages();
    trie.clear();
    const clearWarnings = getMessages();
    assert(clearWarnings.length === 1 && clearWarnings[0].type === MessageType.WARNING, "空前缀树clear应提示警告");

    return "空串用例4项、非法字符用例4项；随机对拍300次操作（插入" + insertCount + "、删除" + deleteCount +
        "、查找" + findCount + "、前缀" + prefixCount + "），最大字符串数" + maxSize + "；清空用例2项";
}

/**
 * 可测试的线段树接口
 */
export interface TestableSegmentTree {
    add(l: number, r: number, val: number): Promise<void>;
    query(l: number, r: number): Promise<number | null>;
}

/**
 * 线段树通用测试：区间越界、随机对拍（区间加 + 区间求和）
 * @param tree 待测试的线段树
 * @param nums 初始数组
 * @returns 数据量描述
 */
export async function checkSegmentTreeModel(tree: TestableSegmentTree, nums: number[]): Promise<string> {
    const model = nums.slice();
    const n = model.length;

    // 区间越界
    clearMessages();
    await tree.add(-1, 0, 1);
    await tree.add(0, n, 1);
    await tree.add(2, 1, 1);
    assert(await tree.query(-1, 0) === null, "越界查询应返回null");
    assert(await tree.query(0, n) === null, "越界查询应返回null");
    assert(await tree.query(2, 1) === null, "左端点大于右端点应返回null");
    const errors = getMessages().slice();
    assert(errors.filter((message) => message.type === MessageType.ERROR).length === 6, "越界操作应提示6条错误");

    // 随机对拍：区间加 + 区间求和
    let addCount = 0, queryCount = 0, addElements = 0;
    for (let step = 0; step < 150; ++step) {
        if (randomInt(0, 2) === 0) {
            const l = randomInt(0, n - 1), r = randomInt(l, n - 1);
            const val = randomInt(-10, 10);
            await tree.add(l, r, val);
            for (let i = l; i <= r; ++i) {
                model[i] += val;
            }
            ++addCount;
            addElements += r - l + 1;
        } else {
            const l = randomInt(0, n - 1), r = randomInt(l, n - 1);
            let expected = 0;
            for (let i = l; i <= r; ++i) {
                expected += model[i];
            }
            assert(await tree.query(l, r) === expected, "随机对拍：区间[" + l + "," + r + "]求和不等于" + expected);
            ++queryCount;
        }
    }
    let total = 0;
    for (let i = 0; i < n; ++i) {
        total += model[i];
    }
    assert(await tree.query(0, n - 1) === total, "全区间求和错误");

    return "初始数组" + n + "个元素；越界用例6项；随机对拍150次操作（区间加" + addCount + "次共" + addElements +
        "个元素、区间查询" + queryCount + "次）";
}

/**
 * 可测试的并查集接口
 */
export interface TestableUnionFindSet {
    find(x: number): Promise<number | null>;
    union(u: number, v: number): Promise<void>;
    getSize(x: number): Promise<number>;
    inSameSet(u: number, v: number): Promise<boolean>;
}

/**
 * 并查集通用测试：初始集合、越界操作、随机对拍、find性质
 * @param uf 待测试的并查集
 * @param n 元素个数
 * @returns 数据量描述
 */
export async function checkUnionFindSetModel(uf: TestableUnionFindSet, n: number): Promise<string> {
    // 初始状态：每个元素各成一个集合
    for (let i = 0; i < n; ++i) {
        assert(await uf.getSize(i) === 1, "初始每个集合大小应为1");
    }

    // 越界操作
    clearMessages();
    assert(await uf.find(-1) === null, "越界查找应返回null");
    assert(await uf.find(n) === null, "越界查找应返回null");
    await uf.union(-1, 0);
    await uf.union(0, n);
    assert(await uf.getSize(-1) === 0, "越界查询大小应返回0");
    assert(await uf.inSameSet(0, n) === false, "越界判断应返回false");
    const errors = getMessages().slice();
    const errorCount = errors.filter((message) => message.type === MessageType.ERROR).length;
    assert(errorCount === 6, "越界操作应提示6条错误，实际为" + errorCount);

    // 随机对拍
    const group: number[] = [];
    for (let i = 0; i < n; ++i) {
        group.push(i);
    }
    let unionCount = 0, queryCount = 0;
    for (let step = 0; step < 300; ++step) {
        const op = randomInt(0, 2);
        if (op === 0) {
            const u = randomInt(0, n - 1), v = randomInt(0, n - 1);
            const from = group[v], to = group[u];
            await uf.union(u, v);
            if (from !== to) {
                for (let i = 0; i < n; ++i) {
                    if (group[i] === from) {
                        group[i] = to;
                    }
                }
            }
            ++unionCount;
        } else if (op === 1) {
            const u = randomInt(0, n - 1), v = randomInt(0, n - 1);
            assert(await uf.inSameSet(u, v) === (group[u] === group[v]), "随机对拍：inSameSet错误");
            ++queryCount;
        } else {
            const x = randomInt(0, n - 1);
            let expected = 0;
            for (let i = 0; i < n; ++i) {
                if (group[i] === group[x]) {
                    ++expected;
                }
            }
            assert(await uf.getSize(x) === expected, "随机对拍：getSize错误");
            ++queryCount;
        }
    }

    // find性质
    let findCount = 0;
    for (let t = 0; t < 100; ++t) {
        const x = randomInt(0, n - 1);
        const root = await uf.find(x);
        assert(root !== null, "find不应返回null");
        assert(await uf.find(root!) === root, "find(根节点)应等于根节点");
        assert(group[root!] === group[x], "根节点与x应在同一集合");
        ++findCount;
    }

    return "初始集合" + n + "个；越界操作6项；随机对拍300次操作（合并" + unionCount + "、查询" + queryCount +
        "），find性质校验" + findCount + "次";
}

/**
 * 可测试的树状数组接口
 */
export interface TestableBinaryIndexedTree {
    add(idx: number, val: number): Promise<void>;
    query(l: number, r: number): Promise<number | null>;
}

/**
 * 树状数组通用测试：越界操作、随机对拍（单点加 + 区间求和）
 * @param tree 待测试的树状数组
 * @param n 元素个数
 * @returns 数据量描述
 */
export async function checkBinaryIndexedTreeModel(tree: TestableBinaryIndexedTree, n: number): Promise<string> {
    const model: number[] = new Array(n + 1).fill(0);

    // 越界操作
    clearMessages();
    await tree.add(0, 1);
    await tree.add(n + 1, 1);
    assert(await tree.query(0, 1) === null, "越界查询应返回null");
    assert(await tree.query(1, n + 1) === null, "越界查询应返回null");
    assert(await tree.query(2, 1) === null, "左端点大于右端点应返回null");
    const errors = getMessages().slice();
    assert(errors.filter((message) => message.type === MessageType.ERROR).length === 5, "越界操作应提示5条错误");

    // 随机对拍：单点加 + 区间求和
    let addCount = 0, queryCount = 0;
    for (let step = 0; step < 300; ++step) {
        if (randomInt(0, 1) === 0) {
            const idx = randomInt(1, n), val = randomInt(-10, 10);
            await tree.add(idx, val);
            model[idx] += val;
            ++addCount;
        } else {
            const l = randomInt(1, n), r = randomInt(l, n);
            let expected = 0;
            for (let i = l; i <= r; ++i) {
                expected += model[i];
            }
            assert(await tree.query(l, r) === expected, "随机对拍：区间[" + l + "," + r + "]求和不等于" + expected);
            ++queryCount;
        }
    }

    // 全区间与单点查询
    let total = 0;
    for (let i = 1; i <= n; ++i) {
        total += model[i];
    }
    assert(await tree.query(1, n) === total, "全区间求和错误");
    for (let i = 1; i <= n; ++i) {
        assert(await tree.query(i, i) === model[i], "单点查询下标" + i + "错误");
    }

    return "元素个数" + n + "；越界用例5项；随机对拍300次操作（单点加" + addCount + "、区间查询" + queryCount +
        "）；全区间与单点查询" + (n + 1) + "次";
}

/**
 * 生成连通的无向简单图（随机生成树 + 随机加边）
 * @param n 节点个数（编号0...n-1）
 * @param extraEdges 额外随机边个数
 * @param minWeight 最小边权
 * @param maxWeight 最大边权
 * @returns 边集
 */
export function randomConnectedGraph(n: number, extraEdges: number, minWeight: number, maxWeight: number): number[][] {
    const edges: number[][] = [];
    const used = new Set<string>();
    const addEdge = (u: number, v: number): void => {
        const a = Math.min(u, v), b = Math.max(u, v);
        if (a === b) {
            return;
        }
        const key = a + "," + b;
        if (used.has(key)) {
            return;
        }
        used.add(key);
        edges.push([a, b, randomInt(minWeight, maxWeight)]);
    };
    for (let i = 1; i < n; ++i) {
        addEdge(i, randomInt(0, i - 1));
    }
    for (let t = 0; t < extraEdges; ++t) {
        addEdge(randomInt(0, n - 1), randomInt(0, n - 1));
    }
    return edges;
}

/**
 * 生成随机的有向简单图（不保证连通）
 * @param n 节点个数（编号0...n-1）
 * @param edgeCount 边个数上限
 * @param minWeight 最小边权
 * @param maxWeight 最大边权
 * @returns 边集
 */
export function randomDirectedGraph(n: number, edgeCount: number, minWeight: number, maxWeight: number): number[][] {
    const edges: number[][] = [];
    const used = new Set<string>();
    for (let t = 0; t < edgeCount; ++t) {
        const u = randomInt(0, n - 1), v = randomInt(0, n - 1);
        if (u === v) {
            continue;
        }
        const key = u + "," + v;
        if (used.has(key)) {
            continue;
        }
        used.add(key);
        edges.push([u, v, randomInt(minWeight, maxWeight)]);
    }
    return edges;
}

/**
 * 参考实现：最小生成树总权值（不连通时返回null）
 * @param edges 无向边集
 * @returns 最小生成树总权值
 */
export function mstWeight(edges: number[][]): number | null {
    let n = 0;
    for (const [u, v] of edges) {
        n = Math.max(n, u + 1, v + 1);
    }
    const father: number[] = [];
    for (let i = 0; i < n; ++i) {
        father.push(i);
    }
    const find = (x: number): number => x === father[x] ? x : (father[x] = find(father[x]));
    const sorted = edges.slice().sort((a, b) => a[2] - b[2]);
    let total = 0, count = 0;
    for (const [u, v, w] of sorted) {
        const fu = find(u), fv = find(v);
        if (fu !== fv) {
            father[fu] = fv;
            total += w;
            ++count;
        }
    }
    return count === n - 1 ? total : null;
}

/**
 * 参考实现：单源最短路径（有向图，不可达为Infinity）
 * @param edges 有向边集
 * @param start 起点
 * @returns 各节点最短距离
 */
export function dijkstraDistances(edges: number[][], start: number): number[] {
    let n = 0;
    for (const [u, v] of edges) {
        n = Math.max(n, u + 1, v + 1);
    }
    const to: number[][][] = Array.from({ length: n }, () => []);
    for (const [u, v, w] of edges) {
        to[u].push([v, w]);
    }
    const dis = new Array(n).fill(Infinity);
    const vis = new Array(n).fill(false);
    dis[start] = 0;
    for (let t = 0; t < n; ++t) {
        let u = -1;
        for (let i = 0; i < n; ++i) {
            if (!vis[i] && (u === -1 || dis[i] < dis[u])) {
                u = i;
            }
        }
        if (u === -1 || dis[u] === Infinity) {
            break;
        }
        vis[u] = true;
        for (const [v, w] of to[u]) {
            if (dis[u] + w < dis[v]) {
                dis[v] = dis[u] + w;
            }
        }
    }
    return dis;
}

/**
 * 参考实现：全源最短路径（有向图，不可达为Infinity）
 * @param edges 有向边集
 * @returns 距离矩阵
 */
export function floydDistances(edges: number[][]): number[][] {
    let n = 0;
    for (const [u, v] of edges) {
        n = Math.max(n, u + 1, v + 1);
    }
    const dis: number[][] = Array.from(
        { length: n },
        (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity))
    );
    for (const [u, v, w] of edges) {
        dis[u][v] = w;
    }
    for (let k = 0; k < n; ++k) {
        for (let i = 0; i < n; ++i) {
            for (let j = 0; j < n; ++j) {
                if (dis[i][k] + dis[k][j] < dis[i][j]) {
                    dis[i][j] = dis[i][k] + dis[k][j];
                }
            }
        }
    }
    return dis;
}
