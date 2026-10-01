/**
 * 操作成功消息
 */
export const SuccessMessage = {
    GET_SUCCESS: "查找完成",
    SET_SUCCESS: "修改完成",
    INSERT_SUCCESS: "插入完成",
    DELETE_SUCCESS: "删除完成",
    CLEAR_SUCCESS: "清理完成",
} as const;

/**
 * 异常消息
 */
export const ErrorMessage = {
    INDEX_OUT_OF_RANGE: "索引越界",
} as const;

/**
 * 消息种类
 */
export const MessageType = {
    INFO: 0,    // 普通提示信息
    WARNING: 1, // 警告信息
    ERROR: 2,   // 错误信息
    SUCCESS: 3, // 操作成功提示
} as const;

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
    private messageHandler: ((msg: string, type: number) => void) | null = null;
    // 各类消息前缀
    private prefix: string[] = [
        "",         // 普通提示信息
        "[警告] ",  // 警告信息
        "[错误] ",  // 错误信息
        "",         // 操作成功提示
    ];

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
     *                此函数需要接收两个参数msg: string和type: number
     *                前者为用于展示的消息，后者为消息种类
     *                错误信息显示为红色，警告信息显示为橙色，普通信息显示为黑色
     */
    public setMessageHandler(handler: (msg: string, type: number) => void) {
        this.messageHandler = handler;
    }

    /**
     * 推送消息（由算法层调用）
     * @param msg 消息内容
     */
    public message(msg: string, type: number): void {
        if (this.messageHandler !== null) {
            this.messageHandler(this.prefix[type] + msg, type);
        } else {
            // 输出日志
            console.log("[log] " + msg);
        }
    }
}