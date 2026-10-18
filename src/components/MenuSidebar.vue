<script setup lang="ts">
import { computed } from 'vue';
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
}

const props = defineProps<{
    nodes: MenuNode[];
    currentKey: VisualizerType | null;
}>();

const emit = defineEmits<{
    (e: 'select', key: VisualizerType): void;
}>();

const rows = computed<Row[]>(() => {
    const result: Row[] = [];
    const walk = (nodes: MenuNode[], depth: number): void => {
        for (let i = 0; i < nodes.length; ++i) {
            const node = nodes[i];
            result.push({
                id: node.key ?? node.label + '-' + depth + '-' + i,
                label: node.label,
                key: node.key,
                depth,
            });
            if (node.children) {
                walk(node.children, depth + 1);
            }
        }
    };
    walk(props.nodes, 0);
    return result;
});
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
            <div v-else class="menu-group" :style="{ paddingLeft: 14 + row.depth * 14 + 'px' }">
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
    padding-top: 12px;
    padding-bottom: 4px;
    font-size: 13px;
    font-weight: 600;
    color: #7b8794;
    letter-spacing: 0.5px;
    user-select: none;
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
