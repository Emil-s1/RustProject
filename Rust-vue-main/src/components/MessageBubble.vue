<!-- MessageBubble.vue -->
<script setup lang="ts">
import { ref } from "vue";
import { getFileUrl } from "../types/file.ts";
import type { Message } from "../types/message.ts";

defineProps<{
  message: Message;
  isOwn: boolean;
}>();

const emit = defineEmits<{
  delete: [messageId: number];
}>();

const isImgOpen = ref(false);

function imageSrc(attachment: string) {
  return attachment?.startsWith("data:image/") ? attachment : getFileUrl(attachment);
}
</script>

<template>
  <article
      class="message"
      :class="{
      'message--own': isOwn,
      'message--other': !isOwn,
    }"
  >
    <div v-if="!isOwn" class="message__author">
      <span class="message__author-avatar">
        {{ message.author_name?.charAt(0)?.toUpperCase() || "U" }}
      </span>

      <span>{{ message.author_name }}</span>
    </div>

    <div class="message__content">
      <p v-if="message.type === 'text'">
        {{ message.body }}
      </p>

      <img
          v-if="message.type === 'image' && message.attachment"
          class="message-image"
          :src="imageSrc(message.attachment)"
          alt="Превью изображения"
          @click="isImgOpen = true"
      />

      <footer>
        <span>{{ message.created_at }}</span>
        <span v-if="isOwn" class="message__check">
          ✓✓
        </span>

        <button
            v-if="isOwn"
            type="button"
            class="message__delete"
            aria-label="Удалить сообщение"
            title="Удалить сообщение"
            @click="emit('delete', Number(message.id))"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M4.5 7.5h15M9.5 4.5h5l1 3h-7l1-3ZM7 7.5l.8 12h8.4l.8-12M10 11v5M14 11v5"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
          </svg>
        </button>
      </footer>
    </div>

    <div
        v-if="isImgOpen && message.attachment"
        class="modal-overlay"
        @click.self="isImgOpen = false"
    >
      <button
          type="button"
          class="modal-close"
          @click="isImgOpen = false"
      >
        ×
      </button>

      <div class="modal-content">
        <img
            class="modal-image"
            :src="imageSrc(message.attachment)"
            alt="Увеличенное изображение"
        />
      </div>
    </div>
  </article>
</template>

<style scoped>
.message {
  width: fit-content;
  max-width: min(72%, 680px);

  margin: 0;

  border: 1px solid rgba(148, 163, 184, 0.09);
  border-radius: 18px;

  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.1);
}

.message--own {
  align-self: flex-end;

  border-bottom-right-radius: 6px;
  border-color: rgba(129, 140, 248, 0.25);

  background:
      linear-gradient(
          145deg,
          #5964ee,
          #4a63db
      );
}

.message--other {
  align-self: flex-start;

  border-bottom-left-radius: 6px;

  background:
      linear-gradient(
          145deg,
          #1a2437,
          #162033
      );
}

.message__content {
  padding: 10px 13px 8px;
}

.message p {
  margin: 0;

  color: #f7f8fb;

  font-size: 13px;
  line-height: 1.55;

  overflow-wrap: anywhere;
}

.message__author {
  display: flex;
  align-items: center;
  gap: 7px;

  padding: 9px 11px 0;

  color: #9aa5bc;

  font-size: 10px;
  font-weight: 700;
}

.message__author-avatar {
  width: 19px;
  height: 19px;

  display: grid;
  place-items: center;

  border-radius: 7px;

  color: #fff;
  background: #5664dc;

  font-size: 8px;
}

.message footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;

  margin-top: 6px;

  color: rgba(226, 232, 240, 0.56);

  font-size: 9px;
}

.message__check {
  letter-spacing: -2px;
}

.message__delete {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  margin: -3px -4px -3px 2px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  color: rgba(226, 232, 240, 0.52);
  background: transparent;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.message:hover .message__delete,
.message__delete:focus-visible {
  opacity: 1;
}

.message__delete:hover {
  color: #fff;
  background: rgba(0, 0, 0, 0.14);
}

.message__delete svg {
  width: 14px;
  height: 14px;
}

@media (hover: none) {
  .message__delete {
    opacity: 1;
  }
}

.message-image {
  display: block;

  width: auto;
  max-width: 340px;
  max-height: 340px;

  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 13px;

  object-fit: cover;

  cursor: zoom-in;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 30px;

  background: rgba(3, 7, 18, 0.9);
  backdrop-filter: blur(12px);
}

.modal-content {
  max-width: 92vw;
  max-height: 88vh;
}

.modal-image {
  display: block;

  max-width: 92vw;
  max-height: 88vh;

  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;

  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);

  object-fit: contain;
}

.modal-close {
  position: absolute;
  top: 18px;
  right: 20px;

  width: 38px;
  height: 38px;

  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 11px;

  color: #e8ecf5;
  background: rgba(20, 28, 42, 0.85);

  cursor: pointer;

  font-size: 24px;
}

.modal-close:hover {
  background: rgba(34, 44, 66, 0.95);
}

:global(html[data-theme="light"]) .message { border-color:rgba(15,23,42,.09); box-shadow:0 8px 20px rgba(15,23,42,.08); }
:global(html[data-theme="light"]) .message--other { background:linear-gradient(145deg,#fff,#f2f5fa); }
:global(html[data-theme="light"]) .message p { color:#1b2638; }
:global(html[data-theme="light"]) .message__author { color:#69758b; }
:global(html[data-theme="light"]) .message footer { color:#7b879b; }


:global(html[data-theme="light"]) .message__delete {
  color: rgba(71, 85, 105, .65);
}

:global(html[data-theme="light"]) .message__delete:hover {
  color: #253047;
  background: rgba(15,23,42,.06);
}

</style>