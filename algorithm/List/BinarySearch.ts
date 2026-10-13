import { MessageController, MessageType, SuccessMessage } from "../../controller/MessageController";
import { StepController } from "../../controller/StepController";
import { BinarySearchNode } from "../../node/ArrayNode/impl/BinarySearchNode";
import { create } from "../../node/factory"

let messageController = MessageController.getMessageController();
let stepController = StepController.getStepController();

/**
 * 二分查找算法
 */
export class BinarySearch {
    private arr: BinarySearchNode;
    
    /**
     * 初始数组
     * data必须按非降序排序，否则抛出异常
     * @param data 
     */
    constructor(data: number[]) {
        this.arr = create(BinarySearchNode, data);
    }

    /**
     * 找到小于等于target的最后一个元素，返回其索引
     * @param target 
     * @returns 目标元素的索引，不存在则返回-1
     */
    public async find(target: number): Promise<number | null> {
        let l = 0, r = this.arr.data.length - 1, ans = -1, mid: number;
        while (l <= r) {
            await stepController.wait();
            mid = (l + r) >> 1;
            this.arr._set_left(l);
            this.arr._set_right(r);
            this.arr._set_mid(mid);
            messageController.message(
                "比较arr[mid]与target=",
                MessageType.INFO
            );
            if (this.arr.data[mid]! <= target) {
                messageController.message(
                    this.arr.data[mid] + " ≤ " + target + "，令l=mid+1",
                    MessageType.INFO
                );
                ans = mid;
                l = mid + 1;
            } else {
                messageController.message(
                    this.arr.data[mid] + " > " + target + "，令r=mid-1",
                    MessageType.INFO
                );
                r = mid - 1;
            }
        }

        messageController.message(SuccessMessage.GET_SUCCESS, MessageType.SUCCESS);
        return ans;
    }
}