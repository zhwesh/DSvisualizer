<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

type CommandLineType = 'input' | 'output' | 'error' | 'info';

interface CommandLine {
    text: string;
    type: CommandLineType;
}

interface CommandHelpItem {
    command: string;
    description: string;
}

interface CommandHelp {
    title: string;
    commands: CommandHelpItem[];
    notes: string[];
}

const props = defineProps<{
    lines: CommandLine[];
    help: CommandHelp;
    running: boolean;
}>();

const emit = defineEmits<{
    (e: 'submit', line: string): void;
    (e: 'clear'): void;
}>();

const input = ref('');
const helpOpen = ref(false);
// 只有鼠标按在遮罩本身时，释放后才允许关闭帮助弹窗
const helpBackdropPressed = ref(false);
const inputEl = ref<HTMLTextAreaElement | null>(null);
const historyEl = ref<HTMLElement | null>(null);
const history: string[] = [];
let historyIndex = 0;

const scrollToBottom = (): void => {
    nextTick(() => {
        if (historyEl.value) {
            historyEl.value.scrollTop = historyEl.value.scrollHeight;
        }
    });
};

const resizeInput = (): void => {
    const el = inputEl.value;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(72, el.scrollHeight) + 'px';
};

watch(() => props.lines.length, scrollToBottom);

const submit = (): void => {
    const line = input.value.trim();
    if (line === '') return;
    history.push(line);
    historyIndex = history.length;
    input.value = '';
    emit('submit', line);
    nextTick(() => {
        resizeInput();
        scrollToBottom();
    });
};

const onKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing || event.keyCode === 229) return;
    const hasText = input.value.trim() !== '';
    if (event.key === 'Enter' && !event.shiftKey) {
        if (!hasText) {
            if (!props.running) {
                event.preventDefault();
            }
            return;
        }
        event.preventDefault();
        submit();
        return;
    }
    if (input.value !== '') return;
    if (event.key === 'ArrowUp') {
        if (history.length === 0) return;
        event.preventDefault();
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = history[historyIndex];
        nextTick(resizeInput);
    } else if (event.key === 'ArrowDown') {
        if (history.length === 0) return;
        event.preventDefault();
        historyIndex = Math.min(history.length, historyIndex + 1);
        input.value = history[historyIndex] ?? '';
        nextTick(resizeInput);
    }
};

const focusInput = (): void => {
    inputEl.value?.focus();
};

const onPanelClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.command-history')) return;
    focusInput();
};

const openHelp = (): void => {
    helpBackdropPressed.value = false;
    helpOpen.value = true;
};

const onHelpPointerDown = (event: PointerEvent): void => {
    helpBackdropPressed.value = event.target === event.currentTarget;
};

const onHelpClick = (event: MouseEvent): void => {
    if (helpBackdropPressed.value && event.target === event.currentTarget) {
        helpOpen.value = false;
    }
    helpBackdropPressed.value = false;
};
</script>

<template>
    <aside class="command-panel" @click="onPanelClick">
        <div class="command-header">
            <div class="command-heading">
                <span class="command-title">命令行</span>
                <button
                    type="button"
                    class="command-help-btn"
                    title="查看当前数据结构支持的命令"
                    aria-label="查看命令帮助"
                    @click.stop="openHelp"
                >i</button>
            </div>
            <button type="button" class="command-clear" @click.stop="emit('clear')">清空</button>
        </div>

        <div ref="historyEl" class="command-history">
            <div
                v-for="(line, index) in lines"
                :key="index"
                class="command-line"
                :class="line.type === 'input' ? 'command-echo' : 'command-' + line.type"
            >
                <span>{{ line.text }}</span>
            </div>
        </div>

        <form class="command-input-row" @submit.prevent="submit">
            <span class="command-prompt">&gt;</span>
            <textarea
                ref="inputEl"
                v-model="input"
                class="command-input"
                rows="1"
                spellcheck="false"
                autocomplete="off"
                @input="resizeInput"
                @keydown="onKeydown"
            ></textarea>
        </form>

        <Teleport to="body">
            <div
                v-if="helpOpen"
                class="command-help-overlay"
                @pointerdown="onHelpPointerDown"
                @click="onHelpClick"
            >
                <div class="command-help-dialog">
                    <h3 class="command-help-title">命令行帮助</h3>
                    <div class="command-help-body">
                        <div class="command-help-content">
                            <div class="command-help-subtitle">{{ help.title }}</div>
                            <div v-if="help.commands.length > 0" class="command-help-grid">
                                <template v-for="item in help.commands" :key="item.command">
                                    <code class="command-help-code">{{ item.command }}</code>
                                    <span class="command-help-desc">{{ item.description }}</span>
                                </template>
                            </div>
                        </div>
                        <div v-if="help.notes.length > 0" class="command-help-notes">
                            <p v-for="note in help.notes" :key="note" class="command-help-note">{{ note }}</p>
                        </div>
                    </div>
                    <div class="command-help-actions">
                        <button type="button" class="command-help-close" @click="helpOpen = false">关闭</button>
                    </div>
                </div>
            </div>
        </Teleport>
    </aside>
</template>

<style scoped>
.command-panel {
    display: flex;
    flex: 0 0 220px;
    flex-direction: column;
    min-height: 0;
    border-top: 1px solid #dfe6ee;
    background: #f7f9fc;
    font-family: "JetBrains Mono", Consolas, monospace;
}

.command-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 12px 7px;
    font-size: 13px;
    color: #374151;
}

.command-heading {
    display: flex;
    align-items: center;
    gap: 6px;
}

.command-title {
    font-weight: 600;
}

.command-help-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 17px;
    height: 17px;
    padding: 0;
    border: 1px solid #cfd8e3;
    border-radius: 50%;
    background: #fff;
    color: #64748b;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 12px;
    font-style: italic;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
}

.command-help-btn:hover {
    border-color: #2b6cb0;
    color: #2b6cb0;
    background: #eaf2fb;
}

.command-clear {
    border: none;
    background: transparent;
    color: #64748b;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
}

.command-clear:hover {
    color: #2b6cb0;
}

.command-history {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0 12px 8px;
    font-size: 12px;
    line-height: 1.55;
    cursor: text;
    user-select: text;
}

.command-line {
    white-space: pre-wrap;
    word-break: break-word;
}

.command-echo {
    color: #1f2937;
}

.command-output {
    color: #1f2937;
}

.command-info {
    color: #64748b;
}

.command-error {
    color: #dc2626;
}

.command-prompt {
    flex: none;
    margin-right: 6px;
    color: #2b6cb0;
}


.command-input-row {
    display: flex;
    align-items: flex-start;
    padding: 7px 12px 9px;
    border-top: 1px solid #e5ebf2;
    background: #fff;
}

.command-input-row .command-prompt {
    margin-top: 5px;
}

.command-input {
    flex: 1;
    min-width: 0;
    max-height: 72px;
    padding: 5px 0;
    border: none;
    outline: none;
    resize: none;
    overflow-y: auto;
    background: transparent;
    font-size: 13px;
    line-height: 1.5;
    font-family: inherit;
    color: #1f2937;
}

.command-input::placeholder {
    color: #a8b3c2;
}

.command-help-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.35);
}

.command-help-dialog {
    display: flex;
    flex-direction: column;
    width: min(540px, calc(100vw - 32px));
    max-height: min(620px, calc(100vh - 48px));
    padding: 20px;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.24);
    font-family: 'JetBrains Mono', Consolas, 'Microsoft YaHei', monospace;
}

.command-help-title {
    margin-bottom: 14px;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
}

.command-help-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.command-help-content {
    padding: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #f8fafc;
    color: #334155;
    font-size: 16px;
    line-height: 1.7;
}

.command-help-subtitle {
    margin-bottom: 12px;
    color: #1f2937;
    font-size: 16px;
    font-weight: 600;
}

.command-help-grid {
    display: grid;
    grid-template-columns: minmax(210px, max-content) 1fr;
    align-items: baseline;
    column-gap: 28px;
    row-gap: 9px;
}

.command-help-code {
    color: #1f2937;
    font-family: "JetBrains Mono", Consolas, monospace;
    font-size: 16px;
    white-space: pre;
}

.command-help-desc {
    color: #475569;
}

.command-help-notes {
    padding: 14px 2px 0;
}

.command-help-note {
    margin: 0 0 12px;
    color: #4a5568;
    font-size: 16px;
    line-height: 1.7;
}

.command-help-note:last-child {
    margin-bottom: 0;
}

.command-help-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
}

.command-help-close {
    padding: 7px 18px;
    border: 1px solid #2b6cb0;
    border-radius: 5px;
    background: #2b6cb0;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
}

.command-help-close:hover {
    background: #24598f;
}
</style>
