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
</script>

<template>
    <div class="menu-root">
        <template v-for="row in rows" :key="row.id">
            <div
                v-if="row.key"
                :class="['menu-leaf', { active: row.key === currentKey }]"
                :style="{ paddingLeft: 14 + row.depth * 14 + 'px' }"
                role="button"
                tabindex="0"
                @click="emit('select', row.key)"
                @keydown.enter="emit('select', row.key)"
                @keydown.space.prevent="emit('select', row.key)"
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
</template>

<style scoped>
.menu-root {
    padding: 6px 0;
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
