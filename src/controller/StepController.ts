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
 * 动画屏障接口。
 * StepController 只依赖这个抽象，不直接依赖可视化层。
 */
export interface AnimationBarrier {
    waitForIdle(): Promise<void>;
}

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
    // 动画队列屏障（由页面层注入）
    private animationBarrier: AnimationBarrier | null = null;
    // 是否正在等待动画屏障；此期间忽略新的单步请求，避免跳过下一次暂停
    private waitingForAnimation: boolean = false;
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
     * 设置动画屏障（由页面层调用）。
     * @param barrier 动画屏障，传 null 表示清除
     */
    public setAnimationBarrier(barrier: AnimationBarrier | null): void {
        this.animationBarrier = barrier;
    }

    /**
     * 当前是否为快进模式。
     */
    public isFastMode(): boolean {
        return this.timeInterval <= 0;
    }

    /**
     * 设置状态（由图形界面层调用）
     * @param status 新状态
     */
    public setStatus(status: number): void {
        if (status === StepStatus.STEP_EXECUTION) {
            // 动画还没播完时点击单步不生效，等待动画结束后的下一次暂停
            if (this.waitingForAnimation) {
                return;
            }
            // 单步执行：放行当前挂起的复合操作一拍
            if (this.pendingResolve !== null) {
                const resolve = this.pendingResolve;
                this.pendingResolve = null;
                this.status = StepStatus.PAUSE_OR_FREE;
                resolve();
            } else {
                this.status = status;
            }
        } else if (status === StepStatus.PLAYING) {
            // 播放：唤醒挂起的复合操作，后续节奏由wait()内的定时器控制
            this.status = status;
            if (this.pendingResolve !== null) {
                const resolve = this.pendingResolve;
                this.pendingResolve = null;
                resolve();
            }
        } else {
            this.status = status;
        }
    }

    // 当前挂起的wait()回调（复合操作严格串行，同一时刻至多一个）
    private pendingResolve: (() => void) | null = null;

    /**
     * 提供给算法层的复合操作
     * 算法层调用await wait();等待下一步执行
     */
    public async wait(): Promise<void> {
        await this.waitForPermission();

        // 无论播放、单步还是快进，都必须等上一步动画全部播完再执行下一步。
        // 快进模式通过把动画时长压缩为 0 来保证速度，而不是跳过串行屏障。
        if (this.animationBarrier !== null) {
            this.waitingForAnimation = true;
            try {
                await this.animationBarrier.waitForIdle();
            } finally {
                this.waitingForAnimation = false;
            }
        }
    }

    /**
     * 等待算法层获得执行下一步的权限。
     */
    private waitForPermission(): Promise<void> {
        if (this.status === StepStatus.STEP_EXECUTION) {
            this.status = StepStatus.PAUSE_OR_FREE;
            return Promise.resolve();
        } else if (this.status === StepStatus.PLAYING) {
            return new Promise<void>((resolve) => {
                setTimeout(
                    () => {
                        if (this.status === StepStatus.PLAYING) {
                            resolve();
                        } else if (this.status === StepStatus.STEP_EXECUTION) {
                            this.status = StepStatus.PAUSE_OR_FREE;
                            resolve();
                        } else {
                            this.pendingResolve = resolve;
                        }
                    },
                    this.timeInterval * 1000
                );
            });
        } else {
            return new Promise<void>((resolve) => {
                this.pendingResolve = resolve;
            });
        }
    }
}