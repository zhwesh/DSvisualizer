<script setup lang="ts">
import AppIcon from './AppIcon.vue';

const emit = defineEmits<{
    (e: 'play'): void;
    (e: 'fast'): void;
    (e: 'pause'): void;
    (e: 'step'): void;
}>();
</script>

<template>
    <div class="step-controls">
        <div class="control-row">
            <button class="control-btn" title="播放" aria-label="播放" @click="emit('play')">
                <AppIcon name="play" :size="15" />
            </button>
            <button class="control-btn" title="快进" aria-label="快进" @click="emit('fast')">
                <AppIcon name="fastForward" :size="15" />
            </button>
            <button class="control-btn" title="暂停" aria-label="暂停" @click="emit('pause')">
                <AppIcon name="pause" :size="15" />
            </button>
            <button class="control-btn" title="单步执行" aria-label="单步执行" @click="emit('step')">
                <AppIcon name="stepForward" :size="15" />
            </button>
        </div>
    </div>
</template>

<style scoped>
.step-controls {
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 8px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #e0e4ea;
    border-radius: 6px;
    z-index: 3;
}

.control-row {
    display: flex;
    gap: 6px;
}

.control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid #cfd8e3;
    border-radius: 6px;
    background: #fff;
    color: #2b4a6f;
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
