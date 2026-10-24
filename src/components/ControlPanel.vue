<script setup lang="ts">
import { nextTick, reactive, ref, watch } from 'vue';
import type { VisualizerType } from '../visualizer/VisualizerManager';
import AppIcon from './AppIcon.vue';
import type { IconName } from './icons';

export interface ControlInputDef {
    key: string;
    label?: string;
    placeholder?: string;
    type?: 'number' | 'text' | 'textarea';
    required?: boolean;
    random?: () => string;
}

export interface ControlButtonDef {
    label: string;
    icon?: IconName;
    params?: ControlInputDef[];
    getInitial?: () => Record<string, string>;
    validate?: (values: Record<string, string>) => string | null;
    onClick: (values: Record<string, string>) => void;
}

export interface ControlGroupDef {
    hint?: string;
    inputs: ControlInputDef[];
    buttons: ControlButtonDef[];
    init?: () => Record<string, string> | void;
    defaults?: Record<string, string>;
}

const props = defineProps<{
    groups: ControlGroupDef[];
    currentMenu: VisualizerType;
}>();

const values = reactive<Record<string, string>>({});
const activeButton = ref<ControlButtonDef | null>(null);
const dialogValues = reactive<Record<string, string>>({});
const dialogError = ref('');
// 只有按下遮罩本身时才允许点击遮罩关闭；从对话框内拖选文字到外面不应关闭
const backdropPressed = ref(false);

const resetValues = (): void => {
    for (const key of Object.keys(values)) {
        delete values[key];
    }

    const group = props.groups[0];
    if (group?.defaults) {
        Object.assign(values, group.defaults);
    }
    if (group?.init) {
        const initial = group.init();
        if (initial) {
            Object.assign(values, initial);
        }
    }

    for (const g of props.groups) {
        for (const input of g.inputs) {
            if (values[input.key] === undefined) {
                values[input.key] = '';
            }
        }
    }
};

watch(() => props.currentMenu, resetValues, { immediate: true, flush: 'post' });

const openDialog = (button: ControlButtonDef): void => {
    const params = button.params ?? [];
    if (params.length === 0) {
        button.onClick({ ...values });
        return;
    }

    const initial = button.getInitial ? button.getInitial() : {};
    for (const key of Object.keys(dialogValues)) {
        delete dialogValues[key];
    }
    for (const param of params) {
        dialogValues[param.key] = initial[param.key] ?? values[param.key] ?? '';
    }
    dialogError.value = '';
    activeButton.value = button;
    nextTick(() => {
        const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
            '.dialog-field input, .dialog-field textarea',
        );
        input?.focus();
    });
};

const closeDialog = (): void => {
    activeButton.value = null;
    dialogError.value = '';
    backdropPressed.value = false;
};

const onBackdropPointerDown = (event: PointerEvent): void => {
    backdropPressed.value = event.target === event.currentTarget;
};

const onBackdropClick = (event: MouseEvent): void => {
    if (backdropPressed.value && event.target === event.currentTarget) {
        closeDialog();
    }
    backdropPressed.value = false;
};

const fillRandom = (param: ControlInputDef): void => {
    if (!param.random) return;
    dialogValues[param.key] = param.random();
    dialogError.value = '';
};

const submitDialog = (): void => {
    const button = activeButton.value;
    if (!button) return;

    const params = button.params ?? [];
    for (const param of params) {
        const value = String(dialogValues[param.key] ?? '').trim();
        dialogValues[param.key] = value;
        const name = param.label ?? param.placeholder ?? param.key;
        if (param.required !== false && value === '') {
            dialogError.value = `请填写${name}`;
            return;
        }
        const isNumeric = param.type === undefined || param.type === 'number';
        if (isNumeric && value !== '' && !Number.isFinite(Number(value))) {
            dialogError.value = `${name}必须为数字`;
            return;
        }
    }

    const merged = { ...values, ...dialogValues };
    const error = button.validate ? button.validate(merged) : null;
    if (error) {
        dialogError.value = error;
        return;
    }

    Object.assign(values, dialogValues);
    try {
        button.onClick(merged);
    } catch (error) {
        dialogError.value = error instanceof Error ? error.message : String(error);
        return;
    }
    closeDialog();
};
</script>

<template>
    <aside class="control-panel">
        <h2 class="panel-title">操作台</h2>

        <div v-for="(group, gi) in groups" :key="gi" class="control-group-wrap">
            <button
                v-for="(button, bi) in group.buttons"
                :key="bi"
                class="action-btn"
                @click="openDialog(button)"
            >
                <AppIcon v-if="button.icon" :name="button.icon" :size="16" class="btn-icon" />
                {{ button.label }}
            </button>
        </div>

        <Teleport to="body">
            <div
                v-if="activeButton"
                class="dialog-overlay"
                @pointerdown="onBackdropPointerDown"
                @click="onBackdropClick"
                @keydown.esc.stop.prevent="closeDialog"
            >
                <form class="dialog" @submit.prevent="submitDialog">
                    <h3 class="dialog-title">{{ activeButton.label }}</h3>

                    <label
                        v-for="(param, i) in activeButton.params"
                        :key="param.key"
                        class="dialog-field"
                    >
                        <span>{{ param.label ?? param.placeholder ?? param.key }}</span>
                        <div class="dialog-input-row">
                            <textarea
                                v-if="param.type === 'textarea'"
                                v-model="dialogValues[param.key]"
                                :placeholder="param.placeholder"
                                rows="6"
                            ></textarea>
                            <input
                                v-else
                                v-model="dialogValues[param.key]"
                                :type="param.type ?? 'number'"
                                :placeholder="param.placeholder"
                                :autofocus="i === 0"
                            />
                            <button
                                v-if="param.random"
                                type="button"
                                class="dialog-random"
                                title="随机生成"
                                @click="fillRandom(param)"
                            >
                                <AppIcon name="refresh" :size="13" />
                                随机
                            </button>
                        </div>
                    </label>

                    <p v-if="dialogError" class="dialog-error">{{ dialogError }}</p>

                    <div class="dialog-actions">
                        <button type="button" class="dialog-btn secondary" @click="closeDialog">取消</button>
                        <button type="submit" class="dialog-btn primary">确定</button>
                    </div>
                </form>
            </div>
        </Teleport>
    </aside>
</template>

<style scoped>
.control-panel {
    width: 100%;
    min-width: 0;
    min-height: 0;
    flex: 1 1 auto;
    padding: 14px 14px 24px;
    overflow-y: auto;
    background: #f7f9fc;
}

.panel-title {
    margin-bottom: 12px;
    font-size: 15px;
    font-weight: 600;
    color: #374151;
}

.control-group-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #cfd8e3;
    border-radius: 5px;
    background: #fff;
    font-size: 14px;
    color: #2b4a6f;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
}

.action-btn:hover {
    background: #eaf2fb;
    border-color: #2b6cb0;
}

.action-btn:active {
    background: #dbe9f8;
}

.btn-icon {
    opacity: 0.85;
}

.dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.35);
}

.dialog {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: min(340px, calc(100vw - 32px));
    padding: 18px;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.24);
}

.dialog-title {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
}

.dialog-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 14px;
    color: #4a5568;
}

.dialog-input-row {
    display: flex;
    align-items: stretch;
    gap: 6px;
}

.dialog-field input,
.dialog-field textarea {
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    border: 1px solid #d5dde7;
    border-radius: 5px;
    background: #fff;
    font-size: 14px;
    color: #1f2937;
    outline: none;
}

.dialog-field textarea {
    resize: vertical;
    min-height: 110px;
    font-family: inherit;
    line-height: 1.45;
}

.dialog-field input:focus,
.dialog-field textarea:focus {
    border-color: #2b6cb0;
    box-shadow: 0 0 0 2px rgba(43, 108, 176, 0.12);
}

.dialog-random {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 9px;
    border: 1px solid #cfd8e3;
    border-radius: 5px;
    background: #f7f9fc;
    color: #4a5568;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
}

.dialog-random:hover {
    background: #eaf2fb;
    border-color: #2b6cb0;
    color: #2b5f9e;
}

.dialog-error {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: #dc2626;
}

.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 2px;
}

.dialog-btn {
    padding: 7px 16px;
    border-radius: 5px;
    font-size: 14px;
    cursor: pointer;
}

.dialog-btn.secondary {
    border: 1px solid #cfd8e3;
    background: #fff;
    color: #4a5568;
}

.dialog-btn.secondary:hover {
    background: #f2f5f9;
}

.dialog-btn.primary {
    border: 1px solid #2b6cb0;
    background: #2b6cb0;
    color: #fff;
}

.dialog-btn.primary:hover {
    background: #24598f;
}
</style>
