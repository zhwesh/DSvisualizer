import { KMP } from "../../../algorithm/List/KMP";
import { assert, initTest, randomInt } from "../../TestUtils";

/**
 * KMP算法测试
 */
export async function testKMP(): Promise<string> {
    initTest();

    // 基本匹配
    assert(await new KMP("abcabcabd", "abcabd").search() === 3, "应匹配到位置3");
    assert(await new KMP("aaaaaa", "aaa").search() === 0, "应匹配到位置0");
    assert(await new KMP("abcdef", "def").search() === 3, "应匹配到位置3");
    assert(await new KMP("abcdef", "xyz").search() === null, "失配应返回null");

    // 空模式串
    assert(await new KMP("abc", "").search() === 0, "空模式串应返回0");

    // 模式串比主串长
    assert(await new KMP("ab", "abc").search() === null, "模式串更长应返回null");

    // 空待匹配字符串校验
    let thrown = false;
    try {
        new KMP("", "a");
    } catch {
        thrown = true;
    }
    assert(thrown, "空待匹配字符串应抛出异常");

    // 随机对拍
    const alphabet = "ab";
    let maxStr = 0, maxTemplate = 0, chars = 0;
    for (let t = 0; t < 100; ++t) {
        const n = randomInt(1, 20), m = randomInt(0, 6);
        let str = "", template = "";
        for (let i = 0; i < n; ++i) {
            str += alphabet.charAt(randomInt(0, alphabet.length - 1));
        }
        for (let i = 0; i < m; ++i) {
            template += alphabet.charAt(randomInt(0, alphabet.length - 1));
        }
        const index = str.indexOf(template);
        const expected = template === "" ? 0 : (index === -1 ? null : index);
        const result = await new KMP(str, template).search();
        assert(result === expected, "KMP应返回" + expected + "，实际返回" + result);
        chars += n + m;
        if (n > maxStr) {
            maxStr = n;
        }
        if (m > maxTemplate) {
            maxTemplate = m;
        }
    }

    return "静态用例7项，随机对拍100组（最长主串" + maxStr + "、最长模式串" + maxTemplate + "，共" + chars + "个字符）";
}
