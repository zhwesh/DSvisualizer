import { BinarySearch } from "../../../algorithm/List/BinarySearch";
import { assert, initTest, randomInt } from "../../TestUtils";

/**
 * 二分查找算法测试
 */
export async function testBinarySearch(): Promise<string> {
    initTest();

    // 空数组
    assert(await new BinarySearch([]).find(0) === -1, "空数组查找应返回-1");

    // 随机对拍：找到小于等于target的最后一个元素
    let maxLength = 0, elements = 0;
    for (let t = 0; t < 100; ++t) {
        const data: number[] = [];
        const n = randomInt(0, 30);
        for (let i = 0; i < n; ++i) {
            data.push(randomInt(-20, 20));
        }
        data.sort((a, b) => a - b);
        const target = randomInt(-25, 25);
        let expected = -1;
        for (let i = 0; i < data.length; ++i) {
            if (data[i] <= target) {
                expected = i;
            }
        }
        const result = await new BinarySearch(data).find(target);
        assert(result === expected, "二分查找应返回" + expected + "，实际返回" + result);
        elements += n;
        if (n > maxLength) {
            maxLength = n;
        }
    }

    // 非降序校验
    let thrown = false;
    try {
        new BinarySearch([3, 1, 2]);
    } catch {
        thrown = true;
    }
    assert(thrown, "乱序数组应抛出异常");

    return "随机查找100次（最大长度" + maxLength + "，共" + elements + "个元素）；空数组、乱序校验各1项";
}
