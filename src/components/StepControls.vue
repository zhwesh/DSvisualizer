<script setup lang="ts">
const emit = defineEmits<{
    (e: 'play'): void;
    (e: 'fast'): void;
    (e: 'pause'): void;
    (e: 'step'): void;
}>();
</script>

<template>
    <div class="step-controls">
        <button class="control-btn" title="播放" @click="emit('play')">▶</button>
        <button class="control-btn" title="快进" @click="emit('fast')">⏩</button>
        <button class="control-btn" title="暂停" @click="emit('pause')">⏸</button>
        <button class="control-btn" title="单步执行" @click="emit('step')">➜</button>
    </div>
</template>

<style scoped>
.step-controls {
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    gap: 6px;
    z-index: 2;
}

.control-btn {
    width: 34px;
    height: 34px;
    border: 1px solid #cfd8e3;
    border-radius: 6px;
    background: #fff;
    color: #2b4a6f;
    font-size: 15px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, transform 0.1s;
}

.control-btn:hover {
    background: #eaf2fb;
    border-color: #2b6cb0;
}

.control-btn:active {
    transform: scale(0.95);
}
</style>
