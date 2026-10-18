<script setup lang="ts">
import { nextTick, reactive, ref, watch } from 'vue';
import type { VisualizerType } from '../visualizer/VisualizerManager';
import AppIcon from './AppIcon.vue';
import type { IconName } from './icons';

export interface ControlInputDef {
    key: string;
    label?: string;
    placeholder?: string;
    type?: 'number' | 'text';
    required?: boolean;
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
        const input = document.querySelector<HTMLInputElement>('.dialog-field input');
        input?.focus();
    });
};

const closeDialog = (): void => {
    activeButton.value = null;
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
        if (param.type !== 'text' && value !== '' && !Number.isFinite(Number(value))) {
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
            <p v-if="group.hint" class="control-hint">{{ group.hint }}</p>

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
                @click.self="closeDialog"
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
                        <input
                            v-model="dialogValues[param.key]"
                            :type="param.type ?? 'number'"
                            :placeholder="param.placeholder"
                            :autofocus="i === 0"
                        />
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
    width: 240px;
    min-width: 240px;
    height: 100%;
    padding: 14px 14px 24px;
    overflow-y: auto;
    background: #f7f9fc;
    border-left: 1px solid #e0e4ea;
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

.control-hint {
    margin: 0 0 4px;
    font-size: 13px;
    line-height: 1.5;
    color: #7b8794;
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

.dialog-field input {
    padding: 8px 10px;
    border: 1px solid #d5dde7;
    border-radius: 5px;
    background: #fff;
    font-size: 14px;
    color: #1f2937;
    outline: none;
}

.dialog-field input:focus {
    border-color: #2b6cb0;
    box-shadow: 0 0 0 2px rgba(43, 108, 176, 0.12);
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
