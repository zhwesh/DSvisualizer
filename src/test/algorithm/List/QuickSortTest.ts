import { QuickSort } from "../../../algorithm/List/QuickSort";
import { checkSortBatch, initTest, randomArrays } from "../../TestUtils";

/**
 * 快速排序算法测试
 */
export async function testQuickSort(): Promise<string> {
    initTest();

    const fixed: number[][] = [[], [1], [1, 1], [2, 1], [5, 4, 3, 2, 1], [1, 2, 3, 4, 5]];
    const random = randomArrays(100, 20, -50, 50);
    const fixedStats = await checkSortBatch(() => new QuickSort(), fixed);
    const randomStats = await checkSortBatch(() => new QuickSort(), random);

    return "边界用例" + fixedStats.cases + "组，随机用例" + randomStats.cases + "组（最大长度" +
        randomStats.maxLength + "，共" + (fixedStats.elements + randomStats.elements) + "个元素）";
}
