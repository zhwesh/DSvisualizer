<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { VisualizerType } from '../visualizer/VisualizerManager';

export interface ControlInputDef {
    key: string;
    placeholder?: string;
    type?: 'number' | 'text';
}

export interface ControlButtonDef {
    label: string;
    icon?: string;
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
</script>

<template>
    <aside class="control-panel">
        <h2 class="panel-title">操作台</h2>

        <div v-for="(group, gi) in groups" :key="gi" class="control-group-wrap">
            <p v-if="group.hint" class="control-hint">{{ group.hint }}</p>

            <div v-for="input in group.inputs" :key="input.key" class="control-row">
                <input
                    v-model="values[input.key]"
                    :type="input.type ?? 'number'"
                    :placeholder="input.placeholder"
                    class="input-field"
                />
            </div>

            <button
                v-for="(button, bi) in group.buttons"
                :key="bi"
                class="action-btn"
                @click="button.onClick({ ...values })"
            >
                <span v-if="button.icon" class="btn-icon">{{ button.icon }}</span>
                {{ button.label }}
            </button>
        </div>
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
    font-size: 14px;
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
    font-size: 12px;
    line-height: 1.5;
    color: #7b8794;
}

.control-row {
    display: flex;
}

.input-field {
    flex: 1;
    min-width: 0;
    padding: 7px 9px;
    border: 1px solid #d5dde7;
    border-radius: 5px;
    background: #fff;
    font-size: 13px;
    color: #374151;
    outline: none;
}

.input-field:focus {
    border-color: #2b6cb0;
    box-shadow: 0 0 0 2px rgba(43, 108, 176, 0.12);
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
    font-size: 13px;
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
    font-size: 13px;
}
</style>
