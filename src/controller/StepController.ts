// 播放模式下的时间间隔（秒）
export const PLAY_TIME_INTERVAL : number = 1;
// 快进模式下的时间间隔（秒）
export const FAST_TIME_INTERVAL : number = 0;

/*
 * 复合操作的当前状态
 * 0：暂停/空闲
 * 1：用户点击单步执行
 * 2：正在播放
 */
export const StepStatus = {
    PAUSE_OR_FREE: 0,
    STEP_EXECUTION: 1,
    PLAYING: 2,
} as const;

/**
 * 单步流程控制器
 * 
 * 图形界面层/可视化层只需调用setTimeInterval与setStatus两个接口：
 *      1.可视化层调用算法层接口前，将status设为0
 *      2.用户点击“下一步”，将status设为1
 *      3.用户点击“播放”，将status设为2，并将timeInterval设为PLAY_TIME_INTERVAL
 *      4.用户点击“快进”，将status设为2，并将timeInterval设为FAST_TIME_INTERVAL
 *      5.其余特殊情况（用户中断当前复合操作），同4——强制将当前复合操作执行完毕再进行跳转
 */
export class StepController {
    // 状态
    private status: number = 0;
    // 动画播放的时间间隔（秒）
    private timeInterval: number = 1;
    // 单例对象
    static stepController: StepController | null = null;

    /**
     * 获取StepController单例
     * @returns 单例对象
     */
    public static getStepController(): StepController {
        if (StepController.stepController === null) {
            StepController.stepController = new StepController();
        }
        return StepController.stepController;
    }

    /**
     * 设置时间间隔（由图形界面层调用）
     * @param timeInterval 时间间隔
     */
    public setTimeInterval(timeInterval: number): void {
        this.timeInterval = timeInterval;
    }

    /**
     * 设置状态（由图形界面层调用）
     * @param status 新状态
     */
    public setStatus(status: number): void {
        if (status === StepStatus.STEP_EXECUTION) {
            // 单步执行：只唤醒最早等待的复合操作，令其执行一个原子操作
            if (this.waitQueue.length > 0) {
                this.status = StepStatus.PAUSE_OR_FREE;
                const resolve = this.waitQueue.shift()!;
                resolve();
            } else {
                this.status = status;
            }
        } else if (status === StepStatus.PLAYING) {
            // 播放：唤醒所有等待中的复合操作，之后由wait()内的定时器控制节奏
            this.status = status;
            const queue = this.waitQueue;
            this.waitQueue = [];
            for (const resolve of queue) {
                resolve();
            }
        } else {
            this.status = status;
        }
    }

    // 等待被唤醒的wait()回调队列（FIFO，避免并发wait相互覆盖）
    private waitQueue: (() => void)[] = [];

    /**
     * 提供给算法层的复合操作
     * 算法层调用await wait();等待下一步执行
     */
    public wait(): Promise<void> {
        if (this.status === StepStatus.STEP_EXECUTION) {    // 单步执行：直接放行，并把状态重置回暂停，等待下一次单步执行
            this.status = StepStatus.PAUSE_OR_FREE;    
            return Promise.resolve();
        } else if (this.status === StepStatus.PLAYING) {    // 正在播放：阻塞timeInterval秒后放行
            return new Promise<void>((resolve) => {
                setTimeout(
                    () => {
                        // 延时结束后，再次检查当前的状态
                        if (this.status === StepStatus.PLAYING) {
                            resolve();
                        } else if (this.status === StepStatus.STEP_EXECUTION) {
                            // 播放中途点击单步执行，重置为暂停
                            this.status = StepStatus.PAUSE_OR_FREE;
                            resolve();
                        } else {
                            this.waitQueue.push(resolve);
                        }
                    },
                    this.timeInterval * 1000
                );
            });
        } else {                                            // 暂停状态：直接挂起，等待用户操作唤醒
            return new Promise<void>((resolve) => {
                this.waitQueue.push(resolve);
            });
        }
    }
}