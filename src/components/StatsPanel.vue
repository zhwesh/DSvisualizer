<script setup lang="ts">
defineProps<{
    isBinarySearch: boolean;
    bsVars: { left: number; right: number; mid: number; target: number };
    size: number;
    currentOp: string;
    result: string | null;
    running: boolean;
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
        </template>
    </div>

    <div
        v-if="result !== null || running"
        class="operation-panel"
        :class="{ 'is-result': result !== null }"
    >
        <span class="operation-label">{{ result !== null ? '结果' : '当前操作' }}：</span>
        <span class="operation-value">{{ result !== null ? result : currentOp }}</span>
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
    font-family: 'JetBrains Mono', SimHei, monospace;
    font-size: 14px;
    line-height: 1.65;
    color: #2d3748;
    pointer-events: none;
    z-index: 2;
}

.operation-panel {
    position: absolute;
    left: 12px;
    bottom: 12px;
    display: flex;
    align-items: baseline;
    gap: 2px;
    max-width: min(420px, calc(100% - 24px));
    padding: 7px 12px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid #e0e4ea;
    border-radius: 6px;
    font-family: 'JetBrains Mono', SimHei, monospace;
    font-size: 13px;
    line-height: 1.5;
    pointer-events: none;
    z-index: 2;
}

.operation-label {
    flex: none;
    color: #4a5568;
}

.operation-value {
    color: #1f2937;
    word-break: break-word;
}

.operation-panel.is-result .operation-label {
    color: #15803d;
}

.operation-panel.is-result .operation-value {
    color: #15803d;
    font-weight: 700;
}
</style>
