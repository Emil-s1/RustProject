<!-- MessageList.vue -->
<script setup lang="ts">
import {
  nextTick,
  onMounted,
  useTemplateRef,
  watch,
} from "vue";

import MessageBubble from "./MessageBubble.vue";
import type { Message } from "../types/message.ts";

const props = defineProps<{
  messages: Message[];
  currentUserId: number;
}>();

const emit = defineEmits<{
  deleteMessage: [messageId: number];
}>();

const bottomAnchor =
    useTemplateRef<HTMLDivElement>("bottom-anchor");

async function scrollToBottom() {
  await nextTick();

  bottomAnchor.value?.scrollIntoView({
    behavior: "smooth",
    block: "end",
  });
}

watch(
    () => props.messages,
    scrollToBottom,
    { flush: "post" }
);

watch(
    () => props.messages.length,
    scrollToBottom
);

onMounted(scrollToBottom);
</script>

<template>
  <div class="messages">
    <div class="conversation-glow conversation-glow--one" />
    <div class="conversation-glow conversation-glow--two" />

    <div class="messages-inner">
      <div v-if="messages.length === 0" class="empty">
        <div class="empty__icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path
                d="M7.25 18.25 5.4 21l4.05-1.55c.8.2 1.65.3 2.55.3 4.88 0 8.85-3.1 8.85-6.93S16.88 6 12 6s-8.85 6-8.85 6.82c0 2.17 1.4 4.15 3.6 5.43l.5.27Z"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
            />
          </svg>
        </div>

        <strong>Здесь пока пусто</strong>

        <span>
          Напишите первое сообщение,
          чтобы начать разговор
        </span>
      </div>

      <div v-else class="date-divider">
        <span>Сегодня</span>
      </div>

      <MessageBubble
          v-for="message in messages"
          :key="message.id"
          :message="message"
          :is-own="message.author_id === currentUserId"
          @delete="emit('deleteMessage', Number(message.id))"
      />

      <div
          ref="bottom-anchor"
          class="bottom-anchor"
      />
    </div>
  </div>
</template>

<style scoped>
.messages {
  position: relative;

  flex: 1;
  min-height: 0;

  overflow-y: auto;

  padding: 24px 28px;

  background:
      radial-gradient(
          circle at 50% 8%,
          rgba(82, 71, 216, 0.08),
          transparent 35%
      ),
      #0a101a;

  scrollbar-width: thin;
}

.conversation-glow {
  position: absolute;

  width: 240px;
  height: 240px;

  border-radius: 50%;

  filter: blur(80px);

  pointer-events: none;
}

.conversation-glow--one {
  top: 5%;
  left: 6%;
  background: rgba(79, 70, 229, 0.06);
}

.conversation-glow--two {
  top: 25%;
  right: 5%;
  background: rgba(37, 99, 235, 0.05);
}

.messages-inner {
  position: relative;
  z-index: 1;

  min-height: 100%;

  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  gap: 11px;

  max-width: 980px;
  margin: 0 auto;
}

.date-divider {
  display: flex;
  align-items: center;
  gap: 12px;

  margin: 3px 0 5px;

  color: #6d768d;

  font-size: 10px;
  font-weight: 750;
}

.date-divider::before,
.date-divider::after {
  content: "";

  height: 1px;
  flex: 1;

  background:
      linear-gradient(
          90deg,
          transparent,
          rgba(148, 163, 184, 0.12)
      );
}

.date-divider span {
  padding: 6px 10px;

  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 999px;

  background: rgba(18, 25, 38, 0.7);
}

.empty {
  width: min(340px, 100%);
  margin: auto;

  display: flex;
  flex-direction: column;
  align-items: center;

  gap: 8px;

  text-align: center;

  color: #77829a;
}

.empty__icon {
  width: 56px;
  height: 56px;

  display: grid;
  place-items: center;

  margin-bottom: 4px;

  border: 1px solid rgba(129, 140, 248, 0.14);
  border-radius: 18px;

  color: #8b8ff6;
  background: rgba(99, 102, 241, 0.08);
}

.empty__icon svg {
  width: 25px;
  height: 25px;
}

.empty strong {
  color: #dce2ed;
  font-size: 14px;
}

.empty span {
  font-size: 11px;
  line-height: 1.55;
}

.bottom-anchor {
  height: 1px;
  flex-shrink: 0;
}

@media (max-width: 920px) {
  .messages {
    padding-inline: 18px;
  }
}

:global(html[data-theme="light"]) .messages { background:radial-gradient(circle at 50% 8%,rgba(82,71,216,.05),transparent 35%),#f7f9fc; }
:global(html[data-theme="light"]) .date-divider span { background:rgba(255,255,255,.8); border-color:rgba(15,23,42,.08); }
:global(html[data-theme="light"]) .empty strong { color:#253047; }
:global(html[data-theme="light"]) .empty { color:#7a869b; }

</style>