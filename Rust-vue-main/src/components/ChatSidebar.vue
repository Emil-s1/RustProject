<script setup lang="ts">
import type { Chat } from "../types/chats";

const props = defineProps<{
  chats: Chat[];
  activeChatId: number;
  onlineUsers: Record<string, number>;
}>();

const emit = defineEmits<{
  select: [chat: Chat];
  create: [];
}>();

const ONLINE_TIMEOUT = 15000;

function isOnline(userId: number) {
  const lastSeen = props.onlineUsers[String(userId)];

  if (!lastSeen) {
    return false;
  }

  return Date.now() - lastSeen < ONLINE_TIMEOUT;
}
</script>

<template>
  <aside class="chat-sidebar">
    <div class="sidebar-header">
      <h2>Чаты</h2>

      <button
          class="new-chat-button"
          type="button"
          title="Создать чат"
          @click="emit('create')"
      >
        +
      </button>
    </div>

    <div class="chat-list">
      <button
          v-for="chat in chats"
          :key="chat.id"
          class="chat-item"
          :class="{ active: chat.id === activeChatId }"
          type="button"
          @click="emit('select', chat)"
      >
        <div class="chat-avatar">
          {{ chat.title?.charAt(0)?.toUpperCase() || "Ч" }}
        </div>

        <div class="chat-info">
          <div class="chat-name">
            {{ chat.title }}
          </div>

          <div class="chat-subtitle">
            <template v-if="isOnline(chat.id)">
              <span class="online-dot"></span>
              <span class="online-text">
                Онлайн
              </span>
            </template>

            <template v-else>
              <span class="offline-dot"></span>
              <span class="offline-text">
                Оффлайн
              </span>
            </template>
          </div>
        </div>
      </button>

      <div
          v-if="chats.length === 0"
          class="empty-chats"
      >
        Пока нет чатов
      </div>
    </div>
  </aside>
</template>

<style scoped>
.chat-sidebar {
  width: 280px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
}

.sidebar-header {
  height: 60px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.new-chat-button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition: 0.2s;
}

.new-chat-button:hover {
  background: #1d4ed8;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.chat-item {
  width: 100%;
  min-height: 68px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}

.chat-item:hover {
  background: #f3f4f6;
}

.chat-item.active {
  background: #e8f0ff;
}

.chat-avatar {
  width: 44px;
  height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #2563eb;
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
}

.chat-info {
  min-width: 0;
  flex: 1;
}

.chat-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.chat-subtitle {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
}

.online-dot,
.offline-dot {
  width: 8px;
  height: 8px;
  display: inline-block;
  flex-shrink: 0;
  border-radius: 50%;
}

.online-dot {
  background: #22c55e;
}

.offline-dot {
  background: #9ca3af;
}

.online-text {
  color: #16a34a;
}

.offline-text {
  color: #9ca3af;
}

.empty-chats {
  padding: 30px 15px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}
</style>