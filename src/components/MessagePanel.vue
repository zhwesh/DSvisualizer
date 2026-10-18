<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { MessageType } from '../controller/MessageController';
import AppIcon from './AppIcon.vue';

export interface UiMessage {
    text: string;
    type: number;
}

const props = defineProps<{
    messages: UiMessage[];
}>();

const emit = defineEmits<{
    (e: 'clear'): void;
}>();

const bodyRef = ref<HTMLDivElement | null>(null);

watch(() => props.messages[props.messages.length - 1], async (latest) => {
    if (!latest) return;
    await nextTick();
    const body = bodyRef.value;
    if (body) body.scrollTop = body.scrollHeight;
}, { flush: 'post' });

const messageClass = (type: number): string => {
    switch (type) {
        case MessageType.WARNING: return 'is-warning';
        case MessageType.ERROR: return 'is-error';
        case MessageType.SUCCESS: return 'is-success';
        default: return 'is-info';
    }
};

const messageIcon = (type: number): string => {
    switch (type) {
        case MessageType.WARNING: return '!';
        case MessageType.ERROR: return '×';
        case MessageType.SUCCESS: return '✓';
        default: return 'i';
    }
};
</script>

<template>
    <div class="message-panel">
        <div class="message-header">
            <span>提示信息</span>
            <button class="message-clear" aria-label="清空提示信息" @click="emit('clear')">
                <AppIcon name="trash" :size="13" />
                清空
            </button>
        </div>
        <div ref="bodyRef" class="message-body" aria-live="polite">
            <div
                v-for="(msg, idx) in messages"
                :key="idx"
                :class="['message-item', messageClass(msg.type), { 'is-new': idx === messages.length - 1 }]"
            >
                <span class="msg-icon">{{ messageIcon(msg.type) }}</span>
                <span>{{ msg.text }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.message-panel {
    flex: 0 0 180px;
    height: 180px;
    border-top: 1px solid #eef0f3;
    background: #fff;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.message-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 12px;
    font-size: 13px;
    font-weight: 600;
    color: #7b8794;
    border-bottom: 1px solid #f1f3f5;
    flex: none;
}

.message-clear {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #7b8794;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
}

.message-clear:hover {
    background: #eef3fb;
    color: #2b6cb0;
}

.message-body {
    flex: 1;
    overflow-y: auto;
    padding: 6px 12px;
    font-size: 14px;
    line-height: 1.6;
}

.message-item {
    display: flex;
    gap: 6px;
    color: #333;
}

.message-item.is-new {
    animation: message-flash 0.7s ease-out;
}

@keyframes message-flash {
    0% {
        background-color: #fff3bf;
    }
    100% {
        background-color: transparent;
    }
}

.message-item.is-warning {
    color: #b45309;
}

.message-item.is-error {
    color: #dc2626;
}

.message-item.is-success {
    color: #15803d;
}

.msg-icon {
    flex: none;
    width: 16px;
    text-align: center;
    opacity: 0.75;
}
</style>
