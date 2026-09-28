/**
 * 算法消息控制器
 * 
 * 算法层在执行时调用message(string)向前端页面推送消息
 * 前端将其展示到算法消息框
 */
export class MessageController {

    // 单例对象
    static messageController: MessageController | null = null;
    // 消息处理函数：用于将算法层信息展示到前端页面
    private messageHandler: ((msg: string) => void) | null = null;

    /**
     * 获取单例
     */
    public static getMessageController(): MessageController {
        if (MessageController.messageController === null) {
            MessageController.messageController = new MessageController();
        }
        return MessageController.messageController;
    }

    /**
     * 注册消息处理函数（由图形界面层在页面初始化时调用一次）
     * @param handler 消息处理函数
     */
    public setMessageHandler(handler: (msg: string) => void) {
        this.messageHandler = handler;
    }

    /**
     * 推送消息（由算法层调用）
     * @param msg 消息内容
     */
    public message(msg: string): void {
        if (this.messageHandler !== null) {
            this.messageHandler(msg);
        } else {
            // 输出日志
            console.log("[MessageController] " + msg);
        }
    }
}