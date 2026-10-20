/**
 * 动画调度器
 *
 * 可视化层所有原子操作对应的动画都必须通过这里排队执行：
 * 同一时刻只执行一个 effect，effect 完成后才启动下一个。
 *
 * 这样算法层即使在一个步骤内连续调用多个原子操作，画面也不会并行乱跳。
 */
export class AnimationScheduler {
    // 待执行的动画任务
    private queue: (() => Promise<void> | void)[] = [];
    // 当前是否有一个动画正在执行
    private running: boolean = false;
    // 等待动画队列空闲的回调（StepController 的动画屏障使用）
    private idleResolvers: (() => void)[] = [];

    /**
     * 将动画加入队列。
     * @param effect 动画函数，返回 Promise 时应等待动画真正结束
     */
    public enqueue(effect: () => Promise<void> | void): void {
        this.queue.push(effect);
        this.pump();
    }

    /**
     * 等待当前以及队列中所有动画完成。
     * @returns 空闲时 resolve
     */
    public waitForIdle(): Promise<void> {
        if (!this.running && this.queue.length === 0) {
            return Promise.resolve();
        }
        return new Promise<void>(resolve => {
            this.idleResolvers.push(resolve);
        });
    }

    /**
     * 当前是否空闲。
     */
    public isIdle(): boolean {
        return !this.running && this.queue.length === 0;
    }

    /**
     * 当前待执行的任务数量（包含正在执行的任务）。
     */
    public pending(): number {
        return this.queue.length + (this.running ? 1 : 0);
    }

    /**
     * 停止后续动画。
     * 正在执行的 effect 无法强行中断，但队列会被清空，
     * 当前 effect 结束后所有空闲等待者会被唤醒。
     */
    public clear(): void {
        this.queue = [];
        if (!this.running) {
            this.notifyIdle();
        }
    }

    /**
     * 启动队首动画。
     */
    private pump(): void {
        if (this.running) {
            return;
        }
        const effect = this.queue.shift();
        if (!effect) {
            this.notifyIdle();
            return;
        }

        this.running = true;
        Promise.resolve()
            .then(effect)
            .catch(error => {
                console.error('动画执行失败', error);
            })
            .finally(() => {
                this.running = false;
                this.pump();
            });
    }

    /**
     * 唤醒所有等待空闲的回调。
     */
    private notifyIdle(): void {
        if (this.running || this.queue.length > 0) {
            return;
        }
        const resolvers = this.idleResolvers;
        this.idleResolvers = [];
        resolvers.forEach(resolve => resolve());
    }
}
