<script setup lang="ts">
import { ref, watch } from "vue";

type ProfileUser = {
  id: number;
  display_name: string;
  username?: string;
  status?: string;
  avatar?: string;
};

type ProfileData = {
  displayName: string;
  username: string;
  status: string;
  avatar: string;
};

const props = defineProps<{
  user: ProfileUser;
}>();

const emit = defineEmits<{
  (
      e: "save",
      data: ProfileData
  ): void;

  (
      e: "close"
  ): void;
}>();

const displayName = ref("");
const username = ref("");
const status = ref("");
const avatar = ref("");

watch(
    () => props.user,
    (user) => {
      displayName.value =
          user?.display_name || "";

      username.value =
          user?.username || "";

      status.value =
          user?.status || "";

      avatar.value =
          user?.avatar || "";
    },
    {
      immediate: true,
    }
);

/* =====================================================
   AVATAR
===================================================== */

function selectAvatar(
    event: Event
) {
  const input =
      event.target as HTMLInputElement;

  const file =
      input.files?.[0];

  if (!file) {
    return;
  }

  if (
      !file.type.startsWith(
          "image/"
      )
  ) {
    return;
  }

  const reader =
      new FileReader();

  reader.onload = () => {
    if (
        typeof reader.result ===
        "string"
    ) {
      avatar.value =
          reader.result;
    }
  };

  reader.readAsDataURL(file);

  input.value = "";
}

function removeAvatar() {
  avatar.value = "";
}

/* =====================================================
   SAVE
===================================================== */

function save() {
  const cleanName =
      displayName.value.trim();

  const cleanUsername =
      username.value
          .trim()
          .replace(/^@+/, "")
          .toLowerCase();

  const cleanStatus =
      status.value.trim();

  if (!cleanName) {
    return;
  }

  if (
      cleanUsername &&
      !/^[a-z0-9_.-]+$/i.test(
          cleanUsername
      )
  ) {
    return;
  }

  emit("save", {
    displayName:
    cleanName,

    username:
    cleanUsername,

    status:
    cleanStatus,

    avatar:
    avatar.value,
  });
}

function close() {
  emit("close");
}
</script>

<template>
  <div class="profile-editor">

    <!-- AVATAR -->

    <div class="avatar-section">

      <div
          v-if="avatar"
          class="avatar avatar-image"
      >
        <img
            :src="avatar"
            alt="Аватар"
        />
      </div>

      <div
          v-else
          class="avatar avatar-empty"
      >
        {{
          displayName
              .charAt(0)
              .toUpperCase() || "?"
        }}
      </div>

      <div class="avatar-actions">

        <label
            class="avatar-button"
        >
          Изменить фото

          <input
              type="file"
              accept="image/*"
              hidden
              @change="
              selectAvatar
            "
          />
        </label>

        <button
            v-if="avatar"
            type="button"
            class="remove-avatar"
            @click="
            removeAvatar
          "
        >
          Удалить
        </button>

      </div>
    </div>

    <!-- DISPLAY NAME -->

    <div class="field">

      <label>
        Имя
      </label>

      <input
          v-model="displayName"
          type="text"
          placeholder="Введите имя"
          maxlength="50"
      />

    </div>

    <!-- USERNAME -->

    <div class="field">

      <label>
        Username
      </label>

      <div class="username-input">

        <span>
          @
        </span>

        <input
            v-model="username"
            type="text"
            placeholder="username"
            maxlength="32"
            autocomplete="off"
        />

      </div>

      <small>
        Только латинские буквы,
        цифры, точка, дефис и
        нижнее подчёркивание.
      </small>

    </div>

    <!-- STATUS -->

    <div class="field">

      <label>
        Статус
      </label>

      <input
          v-model="status"
          type="text"
          placeholder="Например: В сети"
          maxlength="100"
      />

    </div>

    <!-- BUTTONS -->

    <div class="buttons">

      <button
          type="button"
          class="cancel-button"
          @click="close"
      >
        Отмена
      </button>

      <button
          type="button"
          class="save-button"
          @click="save"
      >
        Сохранить
      </button>

    </div>

  </div>
</template>

<style scoped>
.profile-editor {
  width: 100%;
}

.avatar-section {
  display: flex;
  align-items: center;

  gap: 16px;

  margin-bottom: 24px;
}

.avatar {
  width: 76px;
  height: 76px;

  flex: 0 0 76px;

  overflow: hidden;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: #242c3a;

  color: #ffffff;

  font-size: 26px;
  font-weight: 700;
}

.avatar-image img {
  width: 100%;
  height: 100%;

  display: block;

  object-fit: cover;
}

.avatar-empty {
  background: #263248;
}

.avatar-actions {
  display: flex;
  flex-direction: column;

  align-items: flex-start;

  gap: 8px;
}

.avatar-button {
  display: inline-flex;

  align-items: center;
  justify-content: center;

  min-height: 36px;

  padding: 0 13px;

  border-radius: 9px;

  color: #ffffff;

  background: #29354a;

  cursor: pointer;

  font-size: 13px;
  font-weight: 600;

  transition: 0.18s ease;
}

.avatar-button:hover {
  background: #35445d;
}

.remove-avatar {
  padding: 0;

  border: 0;

  color: #9ba6ba;

  background: transparent;

  cursor: pointer;

  font-size: 12px;
}

.remove-avatar:hover {
  color: #ff7272;
}

.field {
  margin-bottom: 17px;
}

.field label {
  display: block;

  margin-bottom: 7px;

  color: #aab4c6;

  font-size: 12px;
  font-weight: 600;
}

.field input {
  width: 100%;
  height: 44px;

  padding: 0 13px;

  border: 1px solid
  rgba(148, 163, 184, 0.14);

  outline: none;

  border-radius: 10px;

  color: #f5f7fb;

  background: #0e1521;

  font: inherit;

  transition: 0.18s ease;
}

.field input:focus {
  border-color: #64748b;

  background: #111a28;
}

.field small {
  display: block;

  margin-top: 6px;

  color: #68758b;

  font-size: 10px;

  line-height: 1.4;
}

.username-input {
  display: flex;
  align-items: center;

  height: 44px;

  padding-left: 13px;

  border: 1px solid
  rgba(148, 163, 184, 0.14);

  border-radius: 10px;

  background: #0e1521;

  transition: 0.18s ease;
}

.username-input:focus-within {
  border-color: #64748b;

  background: #111a28;
}

.username-input span {
  color: #758198;

  font-size: 14px;
}

.username-input input {
  height: 42px;

  padding-left: 4px;

  border: 0;

  background: transparent;
}

.username-input input:focus {
  border: 0;

  background: transparent;
}

.buttons {
  display: flex;

  justify-content: flex-end;

  gap: 9px;

  margin-top: 22px;
}

.buttons button {
  min-height: 40px;

  padding: 0 16px;

  border-radius: 9px;

  cursor: pointer;

  font: inherit;
  font-size: 13px;
  font-weight: 600;
}

.cancel-button {
  border: 1px solid
  rgba(148, 163, 184, 0.14);

  color: #aab4c6;

  background: transparent;
}

.cancel-button:hover {
  background:
      rgba(255, 255, 255, 0.05);
}

.save-button {
  border: 0;

  color: #ffffff;

  background: #3b82f6;
}

.save-button:hover {
  background: #2563eb;
}

@media (max-width: 480px) {
  .avatar-section {
    align-items: flex-start;
  }

  .buttons {
    flex-direction: column-reverse;
  }

  .buttons button {
    width: 100%;
  }
}
</style>