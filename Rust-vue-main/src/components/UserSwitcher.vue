<!-- UserSwitcher.vue -->
<script setup lang="ts">
import type { User } from "../types/user.ts";

defineProps<{
  users: User[];
  currentUserId: number;
}>();

const emit = defineEmits<{
  select: [user: User];
}>();

function userAvatar(user: User) {
  return (user as User & { avatar?: string }).avatar || "";
}
</script>

<template>
  <div
      class="user-switcher"
      aria-label="Выбор пользователя"
  >
    <span class="user-switcher__label">
      Пишет
    </span>

    <div class="user-switcher__group">
      <button
          v-for="user in users"
          :key="user.id"
          type="button"
          class="user-switcher__button"
          :class="{
          'user-switcher__button--active':
            user.id === currentUserId
        }"
          @click="emit('select', user)"
      >
        <span class="user-switcher__avatar">
          <img
              v-if="userAvatar(user)"
              :src="userAvatar(user)"
              alt=""
          />
          <span v-else>
            {{ user.display_name?.charAt(0)?.toUpperCase() || "U" }}
          </span>
        </span>

        <span>
          {{ user.display_name }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.user-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-switcher__label {
  color: #69738a;

  font-size: 10px;
  font-weight: 700;

  white-space: nowrap;
}

.user-switcher__group {
  display: flex;
  align-items: center;
  gap: 4px;

  padding: 3px;

  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;

  background: rgba(18, 25, 39, 0.78);
}

.user-switcher__button {
  min-height: 32px;

  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 0 8px;

  border: 0;
  border-radius: 9px;

  color: #8994aa;
  background: transparent;

  cursor: pointer;

  font: inherit;
  font-size: 10px;
  font-weight: 650;

  transition: 0.18s ease;
}

.user-switcher__button:hover {
  color: #e5e9f1;
  background: rgba(255, 255, 255, 0.04);
}

.user-switcher__button--active {
  color: #f4f6fb;
  background: #242e49;

  box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.user-switcher__avatar {
  width: 21px;
  height: 21px;

  display: grid;
  place-items: center;

  border-radius: 7px;

  color: #fff;
  background: #3e4a68;

  font-size: 8px;
  font-weight: 800;
}

.user-switcher__avatar img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.user-switcher__avatar > span {
  display: grid;
  place-items: center;
}

.user-switcher__button--active .user-switcher__avatar {
  background:
      linear-gradient(
          145deg,
          #6872ff,
          #4e64e6
      );
}

@media (max-width: 920px) {
  .user-switcher__label {
    display: none;
  }

  .user-switcher__button > span:last-child {
    display: none;
  }
}

:global(html[data-theme="light"]) .user-switcher__group { background:#fff; border-color:rgba(15,23,42,.09); }
:global(html[data-theme="light"]) .user-switcher__button { color:#69758b; }
:global(html[data-theme="light"]) .user-switcher__button:hover { color:#253047; background:rgba(15,23,42,.035); }
:global(html[data-theme="light"]) .user-switcher__button--active { color:#253047; background:#eef2f7; }

</style>