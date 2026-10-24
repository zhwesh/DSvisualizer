<script setup lang="ts">
import { computed, ref } from 'vue';
import type { VisualizerType } from '../visualizer/VisualizerManager';

export interface MenuNode {
    label: string;
    key?: VisualizerType;
    children?: MenuNode[];
}

interface Row {
    id: string;
    label: string;
    key?: VisualizerType;
    depth: number;
    hasChildren: boolean;
    expanded: boolean;
}

const props = defineProps<{
    nodes: MenuNode[];
    currentKey: VisualizerType | null;
}>();

const emit = defineEmits<{
    (e: 'select', key: VisualizerType): void;
    (e: 'settings'): void;
}>();

// 折叠状态：默认全部展开，用户收起后按分组 id 记录
const collapsedGroups = ref<Record<string, boolean>>({});

const rows = computed<Row[]>(() => {
    const result: Row[] = [];
    const walk = (nodes: MenuNode[], depth: number, path: string): void => {
        for (let i = 0; i < nodes.length; ++i) {
            const node = nodes[i];
            const id = path === '' ? String(i) : path + '.' + i;
            const hasChildren = !!node.children?.length;
            const expanded = !collapsedGroups.value[id];
            result.push({
                id,
                label: node.label,
                key: node.key,
                depth,
                hasChildren,
                expanded,
            });
            if (hasChildren && expanded) {
                walk(node.children!, depth + 1, id);
            }
        }
    };
    walk(props.nodes, 0, '');
    return result;
});

const toggleGroup = (id: string): void => {
    collapsedGroups.value[id] = !collapsedGroups.value[id];
};

const selectRow = (key: VisualizerType, event: MouseEvent | KeyboardEvent): void => {
    emit('select', key);
    const target = event.currentTarget as HTMLElement | null;
    target?.blur();
};
</script>

<template>
    <div class="menu-shell">
        <div class="menu-header">
            <span class="menu-title">DSvisualizer</span>
            <button
                type="button"
                class="menu-settings"
                title="设置"
                aria-label="设置"
                @click.stop="emit('settings')"
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    focusable="false"
                >
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </button>
        </div>
        <div class="menu-scroll">
            <div class="menu-root">
                <template v-for="row in rows" :key="row.id">
                    <div
                        v-if="row.key"
                        :class="['menu-leaf', { active: row.key === currentKey }]"
                        :style="{ paddingLeft: 14 + row.depth * 14 + 'px' }"
                        role="button"
                        tabindex="0"
                        @click="selectRow(row.key, $event)"
                        @keydown.enter="selectRow(row.key, $event)"
                        @keydown.space.prevent="selectRow(row.key, $event)"
                    >
                        {{ row.label }}
                    </div>
                    <div
                        v-else
                        class="menu-group"
                        :style="{ paddingLeft: 14 + row.depth * 14 + 'px' }"
                        role="button"
                        tabindex="0"
                        :aria-expanded="row.expanded"
                        @click="row.hasChildren && toggleGroup(row.id)"
                        @keydown.enter="row.hasChildren && toggleGroup(row.id)"
                        @keydown.space.prevent="row.hasChildren && toggleGroup(row.id)"
                    >
                        <svg
                            v-if="row.hasChildren"
                            class="menu-chevron"
                            :class="{ expanded: row.expanded }"
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M9 6l6 6-6 6"></path>
                        </svg>
                        <span v-else class="menu-chevron-placeholder"></span>
                        {{ row.label }}
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped>
.menu-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.menu-header {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 16px 12px 8px 16px;
}

.menu-title {
    overflow: hidden;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
    color: #111827;
    letter-spacing: 0.2px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.menu-settings {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    color: #4b5563;
    background: transparent;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
}

.menu-settings:hover {
    color: #1d4ed8;
    background: #eef3fb;
}

.menu-settings:focus-visible {
    outline: 2px solid #2b6cb0;
    outline-offset: 1px;
}

.menu-scroll {
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
}

.menu-root {
    padding: 0 0 6px;
}

.menu-group {
    display: flex;
    align-items: center;
    gap: 5px;
    padding-top: 12px;
    padding-bottom: 4px;
    padding-right: 12px;
    font-size: 15px;
    font-weight: 700;
    color: #000;
    letter-spacing: 0.5px;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s, color 0.15s;
}

.menu-group:hover {
    background: #eef3fb;
    color: #1d4ed8;
}

.menu-chevron {
    flex: none;
    transition: transform 0.15s;
}

.menu-chevron.expanded {
    transform: rotate(90deg);
}

.menu-chevron-placeholder {
    flex: none;
    width: 10px;
}

.menu-leaf {
    padding-top: 7px;
    padding-bottom: 7px;
    padding-right: 12px;
    font-size: 14px;
    color: #374151;
    cursor: pointer;
    border-left: 3px solid transparent;
    transition: background 0.15s, color 0.15s;
}

.menu-leaf:hover {
    background: #eef3fb;
    color: #1d4ed8;
}

.menu-leaf.active {
    background: #eaf2fb;
    border-left-color: #2b6cb0;
    color: #1d4ed8;
    font-weight: 600;
}
</style>
