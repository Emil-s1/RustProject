<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  send: [body: string];
  sendImage: [image: string];
}>();

const draft = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const imagePreview = ref<string | null>(null);

function submitMessage() {
  const text = draft.value.trim();

  if (!text) {
    return;
  }

  emit("send", text);
  draft.value = "";
}

function sendSelectedImage() {
  if (!imagePreview.value) return;
  emit("sendImage", imagePreview.value);
  imagePreview.value = null;
}

function removeSelectedImage() {
  imagePreview.value = null;
}

function openImagePicker() {
  if (isUploading.value) {
    return;
  }

  fileInput.value?.click();
}

function handleImageSelect(
    event: Event
) {
  const input =
      event.target as HTMLInputElement;

  const file = input.files?.[0];

  if (!file) {
    return;
  }

  // Разрешаем только изображения
  if (!file.type.startsWith("image/")) {
    input.value = "";
    return;
  }

  isUploading.value = true;

  const reader = new FileReader();

  reader.onload = () => {
    const result = reader.result;

    if (typeof result === "string") {
      imagePreview.value = result;
    }

    isUploading.value = false;
    input.value = "";
  };

  reader.onerror = () => {
    console.error(
        "Не удалось прочитать изображение"
    );

    isUploading.value = false;
    input.value = "";
  };

  reader.readAsDataURL(file);
}
</script>

<template>
  <form
      class="composer"
      @submit.prevent="imagePreview ? sendSelectedImage() : submitMessage()"
  >
    <!-- Скрытый input -->
    <input
        ref="fileInput"
        class="hidden-file-input"
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        @change="handleImageSelect"
    />

    <div v-if="imagePreview" class="image-preview">
      <img :src="imagePreview" alt="Выбранная фотография" />
      <button type="button" class="image-preview__remove" aria-label="Убрать фотографию" @click="removeSelectedImage">×</button>
      <span>Фотография готова к отправке</span>
    </div>

    <div class="composer__box">

      <!-- Кнопка фотографии -->
      <button
          type="button"
          class="composer__icon-button"
          :disabled="isUploading"
          title="Отправить фотографию"
          aria-label="Отправить фотографию"
          @click="openImagePicker"
      >
        <svg
            v-if="!isUploading"
            viewBox="0 0 24 24"
            fill="none"
        >
          <rect
              x="3"
              y="4"
              width="18"
              height="16"
              rx="3"
              stroke="currentColor"
              stroke-width="1.7"
          />

          <circle
              cx="8.5"
              cy="9"
              r="1.5"
              fill="currentColor"
          />

          <path
              d="m5 17 4.2-4.2a1.5 1.5 0 0 1 2.1 0l2.7 2.7 1.9-1.9a1.5 1.5 0 0 1 2.1 0l1 1"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
          />
        </svg>

        <span
            v-else
            class="loader"
        />
      </button>

      <!-- Текст -->
      <input
          v-model="draft"
          type="text"
          placeholder="Напишите сообщение..."
          autocomplete="off"
          aria-label="Сообщение"
      />

      <!-- Отправка -->
      <button
          type="submit"
          class="composer__send"
          :disabled="!draft.trim() && !imagePreview"
          title="Отправить"
      >
        <svg
            viewBox="0 0 24 24"
            fill="none"
        >
          <path
              d="m4 4 16 8-16 8 3-8-3-8Z"
              fill="currentColor"
          />

          <path
              d="M7 12h8"
              stroke="white"
              stroke-width="1.5"
              stroke-linecap="round"
          />
        </svg>
      </button>

    </div>
  </form>
</template>

<style scoped>
.hidden-file-input {
  display: none;
}


.image-preview { position:relative; display:flex; align-items:center; gap:10px; margin-bottom:8px; padding:7px 10px; border:1px solid rgba(99,102,241,.18); border-radius:12px; color:#8f9ab0; background:rgba(20,28,43,.78); font-size:11px; }
.image-preview img { width:48px; height:48px; border-radius:8px; object-fit:cover; }
.image-preview__remove { position:absolute; top:4px; left:46px; width:20px; height:20px; border:1px solid rgba(255,255,255,.18); border-radius:50%; color:#fff; background:rgba(15,23,42,.85); cursor:pointer; }
:global(html[data-theme="light"]) .composer { border-top-color:rgba(15,23,42,.08); background:linear-gradient(180deg,rgba(255,255,255,.8),#f7f9fc 80%); }
:global(html[data-theme="light"]) .composer__box, :global(html[data-theme="light"]) .image-preview { color:#59667d; background:rgba(255,255,255,.95); border-color:rgba(15,23,42,.1); box-shadow:0 10px 24px rgba(15,23,42,.06); }
:global(html[data-theme="light"]) .composer input:not([type="file"]) { color:#172033; }
:global(html[data-theme="light"]) .composer input::placeholder { color:#8a94a7; }

.composer {
  flex-shrink: 0;

  padding: 14px 18px 18px;

  border-top: 1px solid rgba(148, 163, 184, 0.08);

  background:
      linear-gradient(
          180deg,
          rgba(11, 17, 28, 0.75),
          #0b111c 80%
      );
}

.composer__box {
  min-height: 56px;

  display: flex;
  align-items: center;
  gap: 8px;

  padding: 6px 7px 6px 8px;

  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;

  background: rgba(20, 28, 43, 0.9);

  box-shadow:
      0 14px 30px rgba(0, 0, 0, 0.18);

  transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease;
}

.composer__box:focus-within {
  border-color: rgba(100, 102, 241, 0.55);

  box-shadow:
      0 0 0 3px rgba(99, 102, 241, 0.07),
      0 14px 30px rgba(0, 0, 0, 0.2);
}

.composer__icon-button,
.composer__send {
  width: 40px;
  height: 40px;

  flex: 0 0 40px;

  display: grid;
  place-items: center;

  border: 0;
  border-radius: 12px;

  cursor: pointer;

  transition: 0.18s ease;
}

.composer__icon-button {
  color: #8e98ae;
  background: transparent;
}

.composer__icon-button:hover:not(:disabled) {
  color: white;
  background: rgba(255, 255, 255, 0.05);
}

.composer__icon-button:disabled {
  opacity: 0.5;
  cursor: wait;
}

.composer__icon-button svg {
  width: 20px;
  height: 20px;
}

.composer input:not([type="file"]) {
  min-width: 0;
  flex: 1;

  height: 42px;

  border: 0;
  outline: none;

  padding: 0 4px;

  color: #f3f5f9;
  background: transparent;

  font-family: inherit;
  font-size: 13px;
}

.composer input::placeholder {
  color: #6f7990;
}

.composer__send {
  color: white;

  background:
      linear-gradient(
          145deg,
          #6472ff,
          #4b64e8
      );

  box-shadow:
      0 8px 20px rgba(79, 91, 235, 0.3);
}

.composer__send:hover:not(:disabled) {
  transform: translateY(-1px);

  box-shadow:
      0 11px 25px rgba(79, 91, 235, 0.38);
}

.composer__send:disabled {
  opacity: 0.35;
  cursor: default;
  box-shadow: none;
}

.composer__send svg {
  width: 19px;
  height: 19px;
}

.loader {
  width: 17px;
  height: 17px;

  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #ffffff;

  border-radius: 50%;

  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

:global(html[data-theme="light"]) .composer {
  border-top-color: rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, rgba(255,255,255,.8), #f7f9fc 80%);
}

:global(html[data-theme="light"]) .composer__box,
:global(html[data-theme="light"]) .image-preview {
  color: #59667d;
  background: rgba(255,255,255,.95);
  border-color: rgba(15,23,42,.1);
  box-shadow: 0 10px 24px rgba(15,23,42,.06);
}

:global(html[data-theme="light"]) .composer input:not([type="file"]) {
  color: #172033;
}

:global(html[data-theme="light"]) .composer input::placeholder {
  color: #8a94a7;
}

:global(html[data-theme="light"]) .composer__icon-button:hover:not(:disabled) {
  color: #253047;
  background: rgba(15,23,42,.04);
}

:global(html[data-theme="light"]) .image-preview__remove {
  color: #253047;
  background: #fff;
  border-color: rgba(15,23,42,.12);
}

</style>