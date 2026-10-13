import { MessageController, MessageType } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { KMPNode } from "../../node/ArrayNode/impl/KMPNode";
import { create } from "../../node/factory";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * KMP算法
 */
export class KMP {
    private node: KMPNode;

    constructor(str: string, template: string) {
        this.node = create(KMPNode, str, template);
    }

    /**
     * 计算模式串的next数组，并显示到data数组上
     * 
     * 动画效果：当前公共前后缀的前缀部分染蓝色、后缀部分染绿色
     */
    public async getNext(): Promise<void> {
        const p = this.node.template;
        const m = p.length;

        if (m === 0) {
            return;
        }

        this.node._clear_color();
        await stepController.wait();
        messageController.message("规定next[0] = -1", MessageType.INFO);
        this.node._set_value(0, -1);

        let j = -1;
        for (let i = 0; i < m - 1; ++i) {
            while (true) {
                await stepController.wait();
                if (j === -1) {
                    messageController.message(
                        "没有可用的公共前后缀，next[" + (i + 1) + "] = 0",
                        MessageType.INFO
                    );
                    this.node._set_value(i + 1, 0);
                    j = 0;
                    break;
                }
                if (p[i] === p[j]) {
                    messageController.message(
                        "template[" + i + "] = template[" + j + "]" +
                            "，公共前后缀延长一位，next[" + (i + 1) + "] = " + (j + 1),
                        MessageType.INFO
                    );
                    this.node._set_prefix_color(j, true);
                    this.node._set_suffix_color(i, true);
                    this.node._set_value(i + 1, j + 1);
                    ++j;
                    break;
                }
                const k = this.node.data[j]!;
                messageController.message(
                    "template[" + i + "] ≠ template[" + j + "]" +
                        "，当前公共前后缀回退到next[" + j + "] = " + k,
                    MessageType.INFO
                );
                if (k >= 0) {
                    // 新候选前后缀一定是旧候选的前缀/后缀子段，把多出来的部分清色
                    for (let t = k; t < j; ++t) {
                        this.node._set_prefix_color(t, false);
                    }
                    for (let t = i - j; t < i - k; ++t) {
                        this.node._set_suffix_color(t, false);
                    }
                }
                j = k;
            }
        }
    }

    /**
     * 在主串中查找模式串第一次出现的位置
     * @returns 匹配的起始下标，匹配失败则返回null
     */
    public async search(): Promise<number | null> {
        messageController.message("计算next数组", MessageType.INFO);
        await this.getNext();
        this.node._clear_color();

        const n = this.node.str.length, m = this.node.template.length;

        if (m === 0) {
            return 0;
        }

        if (n > 0) {
            this.node._align(0, 0);
        }

        let i = 0, j = 0;
        this.node._set_str_ptr(0);
        this.node._set_template_ptr(0);
        while (i < n && j < m) {
            await stepController.wait();
            if (j === -1) {
                messageController.message(
                    "匹配下一个字符",
                    MessageType.INFO
                );
                this.node._set_str_ptr(++i);
                this.node._set_template_ptr(++j);
                if (i < n) {
                    this.node._align(i, 0);
                }
                continue;
            }

            messageController.message(
                "比较str[" + i + "]与template[" + j + "]",
                MessageType.INFO
            );
            await stepController.wait();
            if (this.node.str[i] === this.node.template[j]) {
                messageController.message(
                    "'" + this.node.str[i] + "' = '" + this.node.template[j] +
                        "'，匹配下一个字符",
                    MessageType.INFO
                );
                this.node._set_str_ptr(++i);
                this.node._set_template_ptr(++j);
            } else {
                messageController.message(
                    "失配，模式串右移，从template[" + this.node.data[j] + "]处开始比较",
                    MessageType.INFO
                );
                this.node._set_template_ptr(j = this.node.data[j]!);
                if (j >= 0) {
                    this.node._align(i, j);
                }
            }
        }

        messageController.message("匹配结束", MessageType.SUCCESS);
        return j === m ? i - m : null;
    }
}
