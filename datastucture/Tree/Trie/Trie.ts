import { TrieNode } from "../../../node/TreeNode/impl/TrieNode";
import { create } from "../../../node/factory";
import { MessageController, MessageType, SuccessMessage } from "../../../controller/MessageController";
import { StepController } from "../../../controller/StepController";

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 前缀树（字典树，仅存储小写字母）
 * 
 * pass为经过当前节点的字符串数量，end为以当前节点为结尾的字符串数量
 */
export class Trie {
    /**
     * 设置根节点
     * @param root 要设置的根节点
     */
    public _set_root(root: TrieNode): void {
        this.root = root;
    }

    /**
     * 动画效果：清空前缀树
     */
    public _clear(): void {
        this._set_root(create(TrieNode, 0, 0));
    }

    /************************************************** */

    private root!: TrieNode;    // 根节点

    constructor() {
        this._set_root(create(TrieNode, 0, 0));
    }

    /**
     * 检查字符串是否合法（非空且仅含小写字母）
     * @param str 待检查字符串
     * @returns 字符串是否合法
     */
    private check(str: string): boolean {
        if (str.length === 0) {
            messageController.message("字符串不能为空", MessageType.WARNING);
            return false;
        }
        for (let i = 0; i < str.length; ++i) {
            const c = str.charCodeAt(i);
            if (c < 97 || c > 122) {
                messageController.message("字符串只能包含小写字母a-z", MessageType.ERROR);
                return false;
            }
        }
        return true;
    }

    // 清除所有字符串
    public clear(): void {
        if (this.isEmpty()) {
            messageController.message("前缀树已经为空", MessageType.WARNING);
            return;
        }

        this._clear();

        messageController.message(SuccessMessage.CLEAR_SUCCESS, MessageType.SUCCESS);
    }

    // 是否为空
    public isEmpty(): boolean {
        return this.root.pass === 0;
    }

    // 字符串个数
    public size(): number {
        return this.root.pass;
    }

    /**
     * 向树中添加字符串str
     * @param str 要添加的字符串
     */
    public async insert(str: string): Promise<void> {
        if (!this.check(str)) {
            return;
        }

        await stepController.wait();
        messageController.message("从根节点开始插入'" + str + "'", MessageType.INFO);
        let node = this.root;
        for (let i = 0; i < str.length; ++i) {
            const ch = str.charCodeAt(i) - 97;

            await stepController.wait();
            messageController.message("节点pass值增加1", MessageType.INFO);
            node._set_pass(node.pass + 1);

            let next = node.sons[ch];
            if (next === null) {
                await stepController.wait();
                messageController.message(
                    "字符'" + str[i] + "'的边不存在，创建新节点",
                    MessageType.INFO
                );
                next = create(TrieNode, 0, 0);
                node._set_son(ch, next);
            } else {
                await stepController.wait();
                messageController.message(
                    "沿字符'" + str[i] + "'的边向下",
                    MessageType.INFO
                );
            }
            node = next;
        }

        await stepController.wait();
        messageController.message("末尾节点的pass值与end值各增加1", MessageType.INFO);
        node._set_pass(node.pass + 1);
        node._set_end(node.end + 1);

        messageController.message(SuccessMessage.INSERT_SUCCESS, MessageType.SUCCESS);
    }

    /**
     * 返回树中str的数量
     * @param str 要查找的字符串
     * @returns str的数量（不存在时返回0）
     */
    public async find(str: string): Promise<number> {
        if (!this.check(str)) {
            return 0;
        }

        await stepController.wait();
        messageController.message("从根节点开始查找'" + str + "'", MessageType.INFO);
        let node = this.root;
        for (let i = 0; i < str.length; ++i) {
            const ch = str.charCodeAt(i) - 97;

            await stepController.wait();
            const next = node.sons[ch];
            if (next === null) {
                messageController.message(
                    "字符'" + str[i] + "'的边不存在，字符串'" + str + "'不存在",
                    MessageType.WARNING
                );
                return 0;
            }
            messageController.message("沿字符'" + str[i] + "'的边向下", MessageType.INFO);
            node = next;
        }

        await stepController.wait();
        messageController.message("字符串'" + str + "'出现次数为" + node.end, MessageType.INFO);
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return node.end;
    }

    /**
     * 返回以str为前缀的字符串数量
     * @param str 前缀
     * @returns 以str为前缀的字符串数量（不存在时返回0）
     */
    public async prefix(str: string): Promise<number> {
        if (!this.check(str)) {
            return 0;
        }

        await stepController.wait();
        messageController.message("从根节点开始查找前缀'" + str + "'", MessageType.INFO);
        let node = this.root;
        for (let i = 0; i < str.length; ++i) {
            const ch = str.charCodeAt(i) - 97;

            await stepController.wait();
            const next = node.sons[ch];
            if (next === null) {
                messageController.message(
                    "字符'" + str[i] + "'的边不存在，不存在以'" + str + "'为前缀的字符串",
                    MessageType.WARNING
                );
                return 0;
            }
            messageController.message("沿字符'" + str[i] + "'的边向下", MessageType.INFO);
            node = next;
        }

        await stepController.wait();
        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return node.pass;
    }

    /**
     * 删除一个str
     * @param str 要删除的字符串
     */
    public async delete(str: string): Promise<void> {
        if (!this.check(str)) {
            return;
        }

        await stepController.wait();
        messageController.message("查找字符串'" + str + "'是否存在", MessageType.INFO);
        const cnt = await this.find(str);
        if (cnt === 0) {
            return;
        }

        let node = this.root;
        let parent: TrieNode | null = null;
        let parentCh = 0;
        for (let i = 0; i < str.length; ++i) {
            const ch = str.charCodeAt(i) - 97;

            await stepController.wait();
            messageController.message("节点pass值减少1", MessageType.INFO);
            node._set_pass(node.pass - 1);

            if (parent !== null && node.pass === 0 && node.end === 0) {
                await stepController.wait();
                messageController.message(
                    "节点已无字符串经过且不是结尾，删除该节点及其子树",
                    MessageType.INFO
                );
                parent._set_son(parentCh, null);
                node._delete();
                messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
                return;
            }

            parent = node;
            parentCh = ch;
            node = node.sons[ch]!;
        }

        await stepController.wait();
        messageController.message("末尾节点的pass值与end值各减少1", MessageType.INFO);
        node._set_pass(node.pass - 1);
        node._set_end(node.end - 1);

        if (node.pass === 0 && node.end === 0) {
            await stepController.wait();
            messageController.message(
                "末尾节点已无字符串经过且不是结尾，删除该节点",
                MessageType.INFO
            );
            parent!._set_son(parentCh, null);
            node._delete();
        }

        messageController.message(SuccessMessage.DELETE_SUCCESS, MessageType.SUCCESS);
    }
}
