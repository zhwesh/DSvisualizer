<script setup lang="ts">
defineProps<{
    isBinarySearch: boolean;
    bsVars: { left: number; right: number; mid: number; target: number };
    size: number;
    currentOp: string;
}>();
</script>

<template>
    <div class="stats-panel">
        <template v-if="isBinarySearch">
            <div class="stat-line">left&nbsp;&nbsp;: {{ bsVars.left }}</div>
            <div class="stat-line">right : {{ bsVars.right }}</div>
            <div class="stat-line">mid&nbsp;&nbsp;&nbsp;: {{ bsVars.mid }}</div>
            <div class="stat-line">target: {{ bsVars.target }}</div>
        </template>
        <template v-else>
            <div class="stat-line">节点数量: {{ size }}</div>
            <div class="stat-line">当前操作: {{ currentOp }}</div>
        </template>
    </div>
</template>

<style scoped>
.stats-panel {
    position: absolute;
    top: 12px;
    left: 12px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid #e0e4ea;
    border-radius: 6px;
    font-family: Consolas, 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.65;
    color: #2d3748;
    pointer-events: none;
    z-index: 2;
}
</style>
