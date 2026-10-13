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
    // 是否已取消当前复合操作（菜单切换时置真，用于中止挂起的异步操作）
    private cancelled: boolean = false;
    // 操作世代号：每次 begin 递增，旧世代的操作（含播放中）的 wait 到期后一律拒绝
    private epoch: number = 0;
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
    public setTimeInterval(timeInterval: number) {
        this.timeInterval = timeInterval;
    }

    /**
     * 设置状态（由图形界面层调用）
     * @param status 新状态
     */
    public setStatus(status: number) {
        // 若状态变为1或2，且当前算法层代码正在等待wait()，则立刻唤醒
        if (status === 1 || status === 2) {
            while (this.resolveWaits.length > 0) {
                const resolve = this.resolveWaits.shift()!;
                resolve();
            }
            this.status = status === StepStatus.STEP_EXECUTION ?
                StepStatus.PAUSE_OR_FREE : StepStatus.PLAYING;
        } else {
            this.status = status;
        }
    }

    /**
     * 挂起的wait()解析器队列（支持多个复合操作排队，避免互相覆盖）
     */
    private resolveWaits: (() => void)[] = [];

    /**
     * 开始一个新的复合操作：清除取消标记，并复位为暂停/空闲状态
     * （由图形界面层在每次调用算法层复合操作前调用）
     */
    public begin(): void {
        // 先终止前一个尚未完成的操作（其挂起的 wait 会以"操作已取消"拒绝），
        // 并递增世代号，使前一个操作仍在播放中的 wait 到期后也被拒绝，
        // 避免多个操作并发修改数据结构导致节点丢失
        this.abort();
        this.epoch++;
        this.cancelled = false;
        this.status = StepStatus.PAUSE_OR_FREE;
    }

    /**
     * 中止所有挂起的复合操作（由图形界面层在切换菜单/重设数据时调用）
     * 唤醒所有挂起的wait()，算法层在下一次wait()处抛出CancelledError终止操作
     */
    public abort(): void {
        this.cancelled = true;
        while (this.resolveWaits.length > 0) {
            const resolve = this.resolveWaits.shift()!;
            resolve();
        }
        this.status = StepStatus.PAUSE_OR_FREE;
    }

    /**
     * 提供给算法层的复合操作
     * 算法层调用await wait();等待下一步执行
     */
    public wait(): Promise<void> {
        // 记录进入本 wait 时的世代号；begin 开启新操作后世代号变化，本 wait 到期即失效
        const myEpoch = this.epoch;
        if (this.cancelled) {
            return Promise.reject(new Error('操作已取消'));
        }
        if (this.status === StepStatus.STEP_EXECUTION) {    // 单步执行：直接放行，并把状态重置回暂停，等待下一次单步执行
            this.status = StepStatus.PAUSE_OR_FREE;    
            return Promise.resolve();
        } else if (this.status === StepStatus.PLAYING) {    // 正在播放：阻塞timeInterval秒后放行
            return new Promise<void>((resolve, reject) => {
                setTimeout(
                    () => {
                        // 延时结束后，再次检查当前的状态
                        if (this.epoch !== myEpoch) {
                            reject(new Error('操作已取消'));
                        } else if (this.cancelled) {
                            reject(new Error('操作已取消'));
                        } else if (this.status === StepStatus.PLAYING) {
                            resolve();
                        } else if (this.status === StepStatus.STEP_EXECUTION) {
                            // 播放中途点击单步执行，重置为暂停
                            this.status = StepStatus.PAUSE_OR_FREE;
                            resolve();
                        } else {
                            this.resolveWaits.push(resolve);
                        }
                    },
                    this.timeInterval * 1000
                );
            });
        } else {                        // 暂停状态：直接挂起，等待用户操作唤醒
            return new Promise<void>((resolve, reject) => {
                this.resolveWaits.push(() => {
                    if (this.epoch !== myEpoch) {
                        reject(new Error('操作已取消'));
                    } else if (this.cancelled) {
                        reject(new Error('操作已取消'));
                    } else {
                        resolve();
                    }
                });
            });
        }
    }
}