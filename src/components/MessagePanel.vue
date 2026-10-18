<script setup lang="ts">
import { MessageType } from '../controller/MessageController';

export interface UiMessage {
    text: string;
    type: number;
}

defineProps<{
    messages: UiMessage[];
}>();

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
        <div class="message-header">提示信息</div>
        <div class="message-body">
            <div v-for="(msg, idx) in messages" :key="idx" :class="['message-item', messageClass(msg.type)]">
                <span class="msg-icon">{{ messageIcon(msg.type) }}</span>
                <span>{{ msg.text }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.message-panel {
    flex: 0 0 120px;
    height: 120px;
    border-top: 1px solid #eef0f3;
    background: #fff;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.message-header {
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #7b8794;
    border-bottom: 1px solid #f1f3f5;
    flex: none;
}

.message-body {
    flex: 1;
    overflow-y: auto;
    padding: 6px 12px;
    font-size: 13px;
    line-height: 1.6;
}

.message-item {
    display: flex;
    gap: 6px;
    color: #333;
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
    width: 14px;
    text-align: center;
    opacity: 0.75;
}
</style>
