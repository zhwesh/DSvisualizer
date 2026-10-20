import * as d3 from 'd3';
import { StepController } from '../controller/StepController';
import { AnimationScheduler } from './AnimationScheduler';

/**
 * 可视化器基类
 * 每个数据结构对应一个具体的Visualizer
 */
export abstract class BaseVisualizer {
    protected svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    protected mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
    // 所有动画的唯一串行调度器
    protected animations: AnimationScheduler = new AnimationScheduler();

    constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
        this.svg = svg;
        this.mainGroup = svg.append('g').attr('class', 'main-group');
    }

    /**
     * 处理原子操作回调
     * @param node 触发操作的节点
     * @param method 方法名
     * @param args 参数
     */
    abstract onOp(node: object, method: string, args: unknown[]): void;

    /**
     * 等待当前可视化器的动画队列空闲。
     */
    public waitForAnimations(): Promise<void> {
        return this.animations.waitForIdle();
    }

    /**
     * 根据当前播放模式缩放动画时长；快进模式下动画时长归零。
     * @param ms 正常时长（毫秒）
     */
    protected duration(ms: number): number {
        return StepController.getStepController().isFastMode() ? 0 : ms;
    }

    /**
     * 延时辅助函数。
     * @param ms 毫秒
     */
    protected delay(ms: number): Promise<void> {
        const duration = this.duration(ms);
        return duration <= 0
            ? Promise.resolve()
            : new Promise<void>(resolve => setTimeout(resolve, duration));
    }

    /**
     * 清空画布
     */
    clear(): void {
        this.animations.clear();
        this.mainGroup.interrupt();
        this.mainGroup.selectAll('*').interrupt();
        this.mainGroup.selectAll('*').remove();
    }

    /**
     * 销毁可视化器，释放资源
     */
    destroy(): void {
        this.clear();
        this.mainGroup.remove();
    }
}
