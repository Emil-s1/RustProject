<script setup lang="ts">
import { ref, onMounted } from "vue";
import UserSwitcher from "./UserSwitcher.vue";

type User = {
  id: number;
  display_name: string;
  username?: string;
  status?: string;
  avatar?: string;
};

const props = defineProps<{
  status: string;
  users: User[];
  currentUser: User;
}>();

const emit = defineEmits<{
  select: [user: User];
  profile: [];
}>();

const isDark = ref(true);

onMounted(() => {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "light") {
    isDark.value = false;
    document.documentElement.classList.add("light");
  }
});

function toggleTheme() {
  isDark.value = !isDark.value;

  if (isDark.value) {
    document.documentElement.classList.remove("light");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.add("light");
    localStorage.setItem("theme", "light");
  }
}
</script>

<template>
  <header class="header">

    <!-- BRAND -->

    <div class="brand">

      <div class="brand__icon">
        <svg
            viewBox="0 0 24 24"
            fill="none"
        >
          <path
              d="M7.25 18.25 5.4 21l4.05-1.55c.8.2 1.65.3 2.55.3 4.88 0 8.85-3.1 8.85-6.93S16.88 6 12 6s-8.85 3.1-8.85 6.82c0 2.17 1.4 4.15 3.6 5.43l.5.27Z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
          />

          <path
              d="M8.7 12.4h.01M12 12.4h.01M15.3 12.4h.01"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
          />
        </svg>
      </div>

      <div class="brand__copy">

        <div class="brand__title-row">

          <h1>
            Encore 67
            <span>messenger</span>
          </h1>

          <span class="status-pill">
            <i />
            {{ status }}
          </span>

        </div>

        <p>
          Общайтесь быстро и удобно
        </p>

      </div>
    </div>

    <!-- ACTIONS -->

    <div class="header__actions">

      <div class="header__local">
        <i />
        Локально
      </div>

      <!-- THEME -->

      <button
          type="button"
          class="theme-toggle"
          :title="
          isDark
            ? 'Включить светлую тему'
            : 'Включить тёмную тему'
        "
          :aria-label="
          isDark
            ? 'Включить светлую тему'
            : 'Включить тёмную тему'
        "
          @click="toggleTheme"
      >
        <svg
            v-if="isDark"
            viewBox="0 0 24 24"
            fill="none"
        >
          <circle
              cx="12"
              cy="12"
              r="4"
              stroke="currentColor"
              stroke-width="1.7"
          />

          <path
              d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
          />
        </svg>

        <svg
            v-else
            viewBox="0 0 24 24"
            fill="none"
        >
          <path
              d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linejoin="round"
          />
        </svg>
      </button>

      <!-- USER SWITCHER -->

      <UserSwitcher
          :users="users"
          :current-user-id="currentUser.id"
          @select="
          emit('select', $event)
        "
      />

      <!-- PROFILE -->

      <button
          type="button"
          class="profile-open-button"
          @click="emit('profile')"
      >

        <span
            v-if="currentUser.avatar"
            class="profile-open-button__avatar profile-open-button__avatar--image"
        >
          <img
              :src="currentUser.avatar"
              alt=""
          />
        </span>

        <span
            v-else
            class="profile-open-button__avatar"
        >
          {{
            currentUser.display_name
                ?.charAt(0)
                ?.toUpperCase() || "U"
          }}
        </span>

        <span class="profile-open-button__name">
          {{ currentUser.display_name }}
        </span>

        <svg
            viewBox="0 0 24 24"
            fill="none"
        >
          <path
              d="m8 10 4 4 4-4"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
          />
        </svg>

      </button>

    </div>
  </header>
</template>

<style scoped>
.header {
  position: relative;
  z-index: 10;

  min-height: 76px;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 24px;

  padding: 0 22px 0 24px;

  border-bottom: 1px solid
  rgba(148, 163, 184, 0.12);

  background: rgb(10 16 36);

  backdrop-filter: blur(18px);

  box-shadow:
      0 10px 35px
      rgba(0, 0, 0, 0.16);
}

:global(html[data-theme="light"])
.header {
  border-bottom-color:
      rgba(15, 23, 42, 0.09);

  background: rgb(245 247 250);

  box-shadow:
      0 10px 35px
      rgba(15, 23, 42, 0.08);
}

/* BRAND */

.brand {
  min-width: 0;

  display: flex;
  align-items: center;

  gap: 13px;
}

.brand__icon {
  width: 42px;
  height: 42px;

  flex: 0 0 42px;

  display: grid;
  place-items: center;

  border: 1px solid
  rgba(129, 140, 248, 0.35);

  border-radius: 13px;

  color: white;

  background:
      linear-gradient(
          145deg,
          #5b5cf0 0%,
          #356ef4 100%
      );

  box-shadow:
      0 10px 24px
      rgba(79, 70, 229, 0.28);
}

.brand__icon svg {
  width: 23px;
  height: 23px;
}

.brand__copy {
  min-width: 0;
}

.brand__title-row {
  min-width: 0;

  display: flex;
  align-items: center;

  gap: 10px;
}

.brand__copy h1 {
  margin: 0;

  color: #f8fafc;

  font-size: 16px;
  font-weight: 750;

  letter-spacing: -0.02em;

  white-space: nowrap;
}

.brand__copy h1 span {
  color: #8c93a8;

  font-weight: 600;
}

.brand__copy p {
  margin: 4px 0 0;

  color: #6f7890;

  font-size: 11px;
}

/* STATUS */

.status-pill {
  display: inline-flex;

  align-items: center;

  gap: 6px;

  padding: 5px 8px;

  border: 1px solid
  rgba(52, 211, 153, 0.14);

  border-radius: 999px;

  color: #a4f4d0;

  background:
      rgba(16, 185, 129, 0.08);

  font-size: 10px;
  font-weight: 700;
}

.status-pill i,
.header__local i {
  display: block;

  width: 6px;
  height: 6px;

  border-radius: 50%;

  background: #35d399;

  box-shadow:
      0 0 10px
      rgba(53, 211, 153, 0.85);
}

/* ACTIONS */

.header__actions {
  display: flex;

  align-items: center;

  gap: 10px;

  flex-shrink: 0;
}

.header__local {
  display: inline-flex;

  align-items: center;

  gap: 7px;

  color: #7e899f;

  font-size: 10px;
  font-weight: 700;
}

/* THEME */

.theme-toggle {
  width: 36px;
  height: 36px;

  display: grid;
  place-items: center;

  padding: 0;

  border: 1px solid
  rgba(148, 163, 184, 0.12);

  border-radius: 10px;

  color: #a7b0c1;

  background:
      rgba(255, 255, 255, 0.035);

  cursor: pointer;

  transition: 0.18s ease;
}

.theme-toggle:hover {
  color: #ffffff;

  background:
      rgba(255, 255, 255, 0.08);
}

.theme-toggle svg {
  width: 19px;
  height: 19px;
}

/* PROFILE */

.profile-open-button {
  min-height: 40px;

  display: flex;
  align-items: center;

  gap: 8px;

  padding: 3px 9px 3px 4px;

  border: 1px solid
  rgba(148, 163, 184, 0.12);

  border-radius: 12px;

  color: #e8edf5;

  background:
      rgba(255, 255, 255, 0.035);

  cursor: pointer;

  font: inherit;

  transition: 0.18s ease;
}

.profile-open-button:hover {
  background:
      rgba(255, 255, 255, 0.075);
}

.profile-open-button__avatar {
  width: 31px;
  height: 31px;

  display: grid;
  place-items: center;

  overflow: hidden;

  border-radius: 9px;

  color: #ffffff;

  background:
      linear-gradient(
          145deg,
          #6872ff,
          #4e64e6
      );

  font-size: 11px;
  font-weight: 800;
}

.profile-open-button__avatar--image {
  background: #29354a;
}

.profile-open-button__avatar img {
  width: 100%;
  height: 100%;

  display: block;

  object-fit: cover;
}

.profile-open-button__name {
  max-width: 130px;

  overflow: hidden;

  color: #dfe5ef;

  font-size: 11px;
  font-weight: 700;

  text-overflow: ellipsis;

  white-space: nowrap;
}

.profile-open-button > svg {
  width: 16px;
  height: 16px;

  color: #77839a;
}

/* LIGHT */

:global(html[data-theme="light"])
.brand__copy h1 {
  color: #172033;
}

:global(html[data-theme="light"])
.brand__copy h1 span {
  color: #6b7280;
}

:global(html[data-theme="light"])
.brand__copy p {
  color: #7a8497;
}

:global(html[data-theme="light"])
.header__local {
  color: #69758b;
}

:global(html[data-theme="light"])
.theme-toggle {
  color: #59667c;

  border-color:
      rgba(15, 23, 42, 0.09);

  background:
      rgba(15, 23, 42, 0.035);
}

:global(html[data-theme="light"])
.theme-toggle:hover {
  color: #172033;

  background:
      rgba(15, 23, 42, 0.07);
}

:global(html[data-theme="light"])
.profile-open-button {
  color: #253047;

  border-color:
      rgba(15, 23, 42, 0.09);

  background:
      rgba(15, 23, 42, 0.035);
}

:global(html[data-theme="light"])
.profile-open-button:hover {
  background:
      rgba(15, 23, 42, 0.07);
}

:global(html[data-theme="light"])
.profile-open-button__name {
  color: #253047;
}

/* MOBILE */

@media (max-width: 920px) {
  .header__local {
    display: none;
  }

  .brand__copy p {
    display: none;
  }
}

@media (max-width: 700px) {
  .header {
    min-height: 64px;

    padding: 0 12px;
  }

  .brand__icon {
    width: 36px;
    height: 36px;

    flex-basis: 36px;

    border-radius: 10px;
  }

  .brand__icon svg {
    width: 20px;
    height: 20px;
  }

  .status-pill {
    display: none;
  }

  .profile-open-button__name {
    display: none;
  }
}
</style>