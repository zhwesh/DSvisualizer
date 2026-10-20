import * as d3 from 'd3';
import { BaseVisualizer } from './BaseVisualizer';
import { KMPNode } from '../node/ArrayNode/impl/KMPNode';

const COLOR_BG = '#ffffff';
const COLOR_PREFIX = '#3498db';   // 公共前缀（蓝）
const COLOR_SUFFIX = '#2ecc71';   // 公共后缀（绿）
const COLOR_TEXT = '#2c3e50';
const COLOR_BORDER = '#95a5a6';
const COLOR_PTR = '#e67e22';      // 指针（橙）

/**
 * KMP 可视化器
 * - 三行：主串 str / 模式串 template / next 数组（data）
 * - 模式串行可整体平移与主串对齐（_align），指针高亮当前格（_set_str_ptr / _set_template_ptr）
 * - 求 next 时公共前缀染蓝、公共后缀染绿（_set_prefix_color / _set_suffix_color）
 */
export class KMPVisualizer extends BaseVisualizer {
    private ds: KMPNode | null = null;
    private alignOffset = 0;   // 模式串相对主串的格子偏移（格数）

    constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
        super(svg);
    }

    onOp(node: object, method: string, args: unknown[]): void {
        if (method === '_create') {
            if (node instanceof KMPNode) {
                this.ds = node;
                this.alignOffset = 0;
            }
            this.enqueueRender();
            return;
        }
        if (!this.ds) return;
        switch (method) {
            case '_set_str_ptr':
            case '_set_template_ptr':
                this.enqueueRender();
                break;
            case '_align':
                this.alignOffset = (args[0] as number) - (args[1] as number);
                this.enqueueRender();
                break;
            case '_set_prefix_color':
            case '_set_suffix_color':
                this.enqueueRender();
                break;
            case '_set_value':
            case '_clear_color':
                this.enqueueRender();
                break;
            default:
                break;
        }
    }

    /**
     * 将一次重绘加入动画队列。
     */
    private enqueueRender(): void {
        this.animations.enqueue(async () => {
            this.render();
            await this.delay(120);
        });
    }

    private render(): void {
        if (!this.ds) {
            this.mainGroup.selectAll('*').remove();
            return;
        }
        this.mainGroup.selectAll('*').remove();
        const ds = this.ds;
        const str = ds.str || '';
        const tpl = ds.template || '';
        const next = ds.data || [];
        const offset = this.alignOffset || 0;
        // str / template / next 共用同一个左起点；template 通过 offset 在 str 上滑动
        const maxLen = Math.max(str.length, tpl.length, next.length, 1);
        const baseX0 = (SortCanvasW - maxLen * SortCellW) / 2;
        const strX0 = baseX0;
        const tplX0 = baseX0 + offset * SortCellW;
        const nextX0 = tplX0;

        // 1. 主串
        this.renderRow(str, strX0, SortRowStrY, 0, ds.strPtr, 'str');
        // 2. 模式串（前后缀染色 + 指针）
        this.renderRow(tpl, tplX0, SortRowTplY, 0, ds.templatePtr, 'tpl');
        this.applyColors(tpl, ds.prefixColor, ds.suffixColor);
        // 3. next 数组（只渲染模式串长度），与模式串保持同步平移
        this.renderNext(next, nextX0, Math.max(1, tpl.length));

        // 行标题：贴在各自数组左侧，避免被 viewBox 裁掉
        const addLabel = (x: number, y: number, text: string): void => {
            this.mainGroup.append('text')
                .attr('x', x)
                .attr('y', y + SortCellH / 2 + 5)
                .attr('text-anchor', 'end')
                .style('font-size', '14px')
                .style('font-family', '"JetBrains Mono", SimHei, monospace')
                .style('fill', '#555')
                .text(text);
        };
        addLabel(strX0 - 14, SortRowStrY, 'str');
        addLabel(tplX0 - 14, SortRowTplY, 'template');
        addLabel(nextX0 - 14, SortRowNextY, 'next');
        this.fitViewBox();
    }

    private renderRow(
        s: string,
        x0: number,
        y: number,
        _base: number,
        ptr: number,
        cls: string
    ): void {
        for (let i = 0; i < s.length; ++i) {
            const x = x0 + i * SortCellW;
            const isPtr = i === ptr;
            this.mainGroup.append('rect')
                .attr('class', `kmp-cell ${cls}`)
                .attr('data-i', i)
                .attr('x', x).attr('y', y)
                .attr('width', SortCellW - 4).attr('height', SortCellH - 4)
                .attr('fill', COLOR_BG)
                .attr('stroke', isPtr ? COLOR_PTR : COLOR_BORDER)
                .attr('stroke-width', isPtr ? 3 : 1.5)
                .attr('rx', 4);
            this.mainGroup.append('text')
                .attr('class', `kmp-char ${cls}`)
                .attr('data-i', i)
                .attr('x', x + (SortCellW - 4) / 2)
                .attr('y', y + (SortCellH - 4) / 2 + 5)
                .attr('text-anchor', 'middle')
                .style('font-size', '18px')
                .style('font-family', '"JetBrains Mono", SimHei, monospace')
                .style('font-weight', 'bold')
                .style('fill', isPtr ? COLOR_PTR : COLOR_TEXT)
                .text(s[i]);
        }
    }

    /**
     * 前后缀染色（模式串格背景）
     */
    private applyColors(tpl: string, prefix: boolean[], suffix: boolean[]): void {
        for (let i = 0; i < tpl.length; ++i) {
            const cell = this.mainGroup.select(`rect.kmp-cell.tpl[data-i="${i}"]`);
            if (cell.empty()) continue;
            if (prefix?.[i]) {
                cell.attr('fill', COLOR_PREFIX);
            } else if (suffix?.[i]) {
                cell.attr('fill', COLOR_SUFFIX);
            }
        }
    }

    private renderNext(next: (number | null)[], x0: number, count: number): void {
        for (let i = 0; i < count; ++i) {
            const x = x0 + i * SortCellW;
            this.mainGroup.append('rect')
                .attr('class', 'kmp-cell next')
                .attr('data-i', i)
                .attr('x', x).attr('y', SortRowNextY)
                .attr('width', SortCellW - 4).attr('height', SortCellH - 4)
                .attr('fill', '#f8f9fa')
                .attr('stroke', COLOR_BORDER)
                .attr('rx', 4);
            this.mainGroup.append('text')
                .attr('class', 'kmp-char next')
                .attr('data-i', i)
                .attr('x', x + (SortCellW - 4) / 2)
                .attr('y', SortRowNextY + (SortCellH - 4) / 2 + 5)
                .attr('text-anchor', 'middle')
                .style('font-size', '16px')
                .style('font-family', '"JetBrains Mono", SimHei, monospace')
                .style('font-weight', 'bold')
                .style('fill', COLOR_TEXT)
                .text(next[i] === null || next[i] === undefined ? '' : String(next[i]));
        }
    }

    private fitViewBox(): void {
        if (!this.ds) {
            this.svg.attr('viewBox', '0 0 400 200');
            return;
        }
        const maxLen = Math.max(
            this.ds.str.length,
            this.ds.template.length,
            this.ds.data.length,
            1,
        );
        const offset = this.alignOffset || 0;
        const baseX0 = (SortCanvasW - maxLen * SortCellW) / 2;
        const tplX0 = baseX0 + offset * SortCellW;
        const left = Math.max(0, Math.min(baseX0, tplX0) - 120);
        const right = Math.max(
            baseX0 + maxLen * SortCellW,
            tplX0 + Math.max(1, this.ds.template.length) * SortCellW,
        ) + 40;
        this.svg.attr('viewBox', `${left} 30 ${right - left} 360`);
    }

    clear(): void {
        super.clear();
        this.ds = null;
        this.alignOffset = 0;
    }
}

// 与 SortVisualizer 同尺寸常量
const SortCanvasW = 1200;
const SortCellW = 44;
const SortCellH = 44;
const SortRowStrY = 110;
const SortRowTplY = 210;
const SortRowNextY = 310;
