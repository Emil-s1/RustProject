<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import AppHeader from './components/AppHeader.vue';
import ChatSidebar from './components/ChatSidebar.vue';
import MessageList from './components/MessageList.vue';
import MessageComposer from './components/MessageComposer.vue';
import ProfileEditor from './components/ProfileEditor.vue';
import type { User } from './types/user';
import type { Chat } from './types/chats';
import type { Message } from './types/message';

type AuthMode = 'login' | 'register';
type ProfileData = { displayName: string; username: string; status: string; avatar: string };

type WsMessage = Record<string, unknown>;

const API = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001/ws';

const token = ref(localStorage.getItem('encore-token') || '');
const currentUser = ref<User | null>(null);
const users = ref<User[]>([]);
const chats = ref<Chat[]>([]);
const messages = ref<Message[]>([]);
const activeChatId = ref(0);
const activeServerChatId = ref(0);
const onlineUsers = ref<Record<string, number>>({});
const showProfile = ref(false);
const showCreateChat = ref(false);
const selectedUserId = ref(0);
const ws = ref<WebSocket | null>(null);
const wsReady = ref(false);
const authMode = ref<AuthMode>('login');
const authName = ref('');
const authUsername = ref('');
const authPassword = ref('');
const authError = ref('');
const authBusy = ref(false);
const appError = ref('');
const loading = ref(true);
const userSearch = ref('');

const filteredUsers = computed(() => {
  const q = userSearch.value.trim().toLowerCase();
  if (!q) return users.value;
  return users.value.filter(u =>
    u.display_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
  );
});

const activeChat = computed(() => chats.value.find(c => c.id === activeChatId.value) || null);
const appStatus = computed(() => {
  if (!currentUser.value) return 'Не авторизован';
  return wsReady.value ? 'Онлайн' : 'Подключение...';
});

function authHeaders() {
  return token.value ? { Authorization: `Bearer ${token.value}` } : {};
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  Object.entries(authHeaders()).forEach(([k, v]) => headers.set(k, v));
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Ошибка HTTP ${response.status}`);
  return data as T;
}

async function submitAuth() {
  authError.value = '';
  authBusy.value = true;
  try {
    const endpoint = authMode.value === 'register' ? '/api/register' : '/api/login';
    const payload = authMode.value === 'register'
      ? { displayName: authName.value.trim(), username: authUsername.value.trim(), password: authPassword.value }
      : { username: authUsername.value.trim(), password: authPassword.value };
    const data = await api<{ token: string; user: User }>(endpoint, { method: 'POST', body: JSON.stringify(payload) });
    token.value = data.token;
    localStorage.setItem('encore-token', data.token);
    currentUser.value = data.user;
    authPassword.value = '';
    await loadApp();
  } catch (error) {
    authError.value = error instanceof Error ? error.message : 'Не удалось выполнить вход';
  } finally {
    authBusy.value = false;
  }
}

function switchAuthMode() {
  authMode.value = authMode.value === 'login' ? 'register' : 'login';
  authError.value = '';
}

async function loadApp() {
  loading.value = true;
  appError.value = '';
  try {
    const me = await api<{ user: User }>('/api/me');
    currentUser.value = me.user;
    await Promise.all([loadUsers(), loadChats()]);
    connectWebSocket();
  } catch (error) {
    logout(false);
    appError.value = error instanceof Error ? error.message : 'Не удалось загрузить приложение';
  } finally {
    loading.value = false;
  }
}

async function loadUsers() {
  const data = await api<{ users: User[] }>('/api/users');
  users.value = data.users;
}

async function loadChats() {
  const data = await api<{ chats: Array<any> }>('/api/chats');
  chats.value = data.chats.map(c => ({
    id: Number(c.user.id),
    chat_id: Number(c.id),
    title: c.title || c.user.display_name,
    username: c.username || c.user.username,
    subtitle: c.subtitle,
    avatar: c.avatar || c.user.avatar,
    user: c.user,
    last_message: c.last_message || null,
  }));
  if (!activeChatId.value && chats.value.length) {
    await selectChat(chats.value[0]);
  }
}

async function selectChat(chat: Chat) {
  activeChatId.value = chat.id;
  activeServerChatId.value = chat.chat_id;
  messages.value = [];
  try {
    const data = await api<{ messages: Message[] }>(`/api/chats/${chat.chat_id}/messages`);
    if (activeChatId.value === chat.id) messages.value = data.messages;
  } catch (error) {
    appError.value = error instanceof Error ? error.message : 'Не удалось загрузить сообщения';
  }
}

function sendWs(payload: WsMessage) {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
    appError.value = 'WebSocket ещё не подключён';
    return false;
  }
  ws.value.send(JSON.stringify(payload));
  return true;
}

function connectWebSocket() {
  if (!token.value) return;
  ws.value?.close();
  const socket = new WebSocket(WS_URL);
  ws.value = socket;

  socket.onopen = () => {
    wsReady.value = true;
    socket.send(JSON.stringify({ type: 'auth', token: token.value }));
  };

  socket.onmessage = event => {
    try {
      handleWsMessage(JSON.parse(event.data));
    } catch {
      console.warn('Некорректное сообщение WebSocket');
    }
  };

  socket.onerror = () => {
    wsReady.value = false;
  };

  socket.onclose = () => {
    wsReady.value = false;
    if (token.value) {
      window.setTimeout(() => {
        if (token.value && !wsReady.value) connectWebSocket();
      }, 2500);
    }
  };
}

function handleWsMessage(data: WsMessage) {
  switch (data.type) {
    case 'auth_ok':
      if (data.user) currentUser.value = data.user as User;
      if (Array.isArray(data.onlineUsers)) {
        onlineUsers.value = Object.fromEntries((data.onlineUsers as number[]).map(id => [String(id), Date.now()]));
      }
      break;
    case 'presence':
      if (typeof data.userId === 'number') {
        if (data.online) onlineUsers.value[String(data.userId)] = Date.now();
        else delete onlineUsers.value[String(data.userId)];
        onlineUsers.value = { ...onlineUsers.value };
      }
      break;
    case 'new_message': {
      const msg = data.message as Message;
      if (!msg) break;
      if (Number(data.chatId) === activeServerChatId.value) {
        messages.value = [...messages.value, msg];
      }
      const chat = chats.value.find(c => c.chat_id === Number(data.chatId));
      if (chat) {
        chat.last_message = { id: msg.id, text: msg.body || (msg.type === 'image' ? '📷 Фотография' : ''), created_at: msg.created_at };
      }
      break;
    }
    case 'chat_created':
      void loadChats();
      break;
    case 'profile_updated':
      if (Number(data.userId) === currentUser.value?.id && data.user) currentUser.value = data.user as User;
      void loadUsers();
      void loadChats();
      break;
    case 'error':
      appError.value = String(data.error || 'Ошибка сервера');
      break;
  }
}

function createChatWithUser(user: User) {
  if (!sendWs({ type: 'start_chat', userId: user.id })) return;
  selectedUserId.value = 0;
  showCreateChat.value = false;
}

async function sendMessage(body: string) {
  if (!activeServerChatId.value) return;
  sendWs({ type: 'send_message', chatId: activeServerChatId.value, messageType: 'text', text: body });
}

async function sendImage(image: string) {
  if (!activeServerChatId.value) return;
  sendWs({ type: 'send_message', chatId: activeServerChatId.value, messageType: 'image', attachment: image, text: '' });
}

function deleteMessage(messageId: number) {
  // Удаление пока локально скрывает сообщение. Для настоящего удаления нужен отдельный WS/API endpoint.
  messages.value = messages.value.filter(m => Number(m.id) !== messageId);
}

function selectUser(user: User) {
  const chat = chats.value.find(c => c.id === user.id);
  if (chat) void selectChat(chat);
}

function saveProfile(data: ProfileData) {
  sendWs({
    type: 'update_profile',
    displayName: data.displayName,
    username: data.username,
    status: data.status,
    avatar: data.avatar,
  });
  showProfile.value = false;
}

function logout(reload = true) {
  token.value = '';
  currentUser.value = null;
  users.value = [];
  chats.value = [];
  messages.value = [];
  activeChatId.value = 0;
  activeServerChatId.value = 0;
  wsReady.value = false;
  localStorage.removeItem('encore-token');
  ws.value?.close();
  ws.value = null;
  if (reload) {
    authMode.value = 'login';
    authPassword.value = '';
  }
}

function formatLastSeen(user: User) {
  if (onlineUsers.value[String(user.id)]) return 'Онлайн';
  return user.last_seen ? `Был(а) ${new Date(user.last_seen).toLocaleString()}` : 'Оффлайн';
}

onMounted(() => {
  if (token.value) void loadApp();
  else loading.value = false;
});

onBeforeUnmount(() => {
  ws.value?.close();
});
</script>

<template>
  <div class="app-shell">
    <div v-if="loading" class="loading-screen">Загрузка…</div>

    <section v-else-if="!currentUser" class="auth-screen">
      <div class="auth-card">
        <div class="auth-logo">67</div>
        <h1>Encore 67</h1>
        <p class="auth-subtitle">Мессенджер с настоящими пользователями</p>

        <form @submit.prevent="submitAuth">
          <div v-if="authMode === 'register'" class="field">
            <label>Имя</label>
            <input v-model="authName" required maxlength="50" placeholder="Например, Алексей" />
          </div>

          <div class="field">
            <label>Username</label>
            <div class="username-input"><span>@</span><input v-model="authUsername" required maxlength="32" autocomplete="username" placeholder="username" /></div>
          </div>

          <div class="field">
            <label>Пароль</label>
            <input v-model="authPassword" required minlength="6" type="password" autocomplete="current-password" placeholder="Минимум 6 символов" />
          </div>

          <div v-if="authError" class="auth-error">{{ authError }}</div>
          <button class="primary-button" :disabled="authBusy">{{ authBusy ? 'Подождите…' : authMode === 'login' ? 'Войти' : 'Зарегистрироваться' }}</button>
        </form>

        <button class="switch-auth" type="button" @click="switchAuthMode">
          {{ authMode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти' }}
        </button>
      </div>
    </section>

    <template v-else>
      <AppHeader :status="appStatus" :users="[currentUser]" :current-user="currentUser" @select="selectUser" @profile="showProfile = true" />

      <main class="main-layout">
        <ChatSidebar :chats="chats" :active-chat-id="activeChatId" :online-users="onlineUsers" @select="selectChat" @create="showCreateChat = true" />

        <section class="conversation">
          <div v-if="activeChat" class="conversation-header">
            <div class="conversation-avatar">
              <img v-if="activeChat.avatar" :src="activeChat.avatar" alt="" />
              <span v-else>{{ activeChat.title.charAt(0).toUpperCase() }}</span>
            </div>
            <div>
              <strong>{{ activeChat.title }}</strong>
              <small>{{ formatLastSeen(activeChat.user) }}</small>
            </div>
            <button class="logout-button" type="button" @click="logout()">Выйти</button>
          </div>
          <div v-else class="conversation-header empty-header">
            <div><strong>Выберите чат</strong><small>Создайте новый чат через «+»</small></div>
            <button class="logout-button" type="button" @click="logout()">Выйти</button>
          </div>

          <div v-if="appError" class="app-error" @click="appError = ''">{{ appError }}</div>
          <MessageList :messages="messages" :current-user-id="currentUser.id" @delete-message="deleteMessage" />
          <MessageComposer :key="activeServerChatId" @send="sendMessage" @send-image="sendImage" />
        </section>
      </main>

      <div v-if="showProfile" class="modal-overlay" @click.self="showProfile = false">
        <div class="modal-card profile-modal">
          <div class="modal-title"><strong>Мой профиль</strong><button type="button" @click="showProfile = false">×</button></div>
          <ProfileEditor :user="currentUser" @save="saveProfile" @close="showProfile = false" />
        </div>
      </div>

      <div v-if="showCreateChat" class="modal-overlay" @click.self="showCreateChat = false">
        <div class="modal-card create-chat-modal">
          <div class="modal-title"><strong>Новый чат</strong><button type="button" @click="showCreateChat = false">×</button></div>
          <input v-model="userSearch" class="search-input" placeholder="Поиск по имени или username" />
          <div class="user-list">
            <button v-for="user in filteredUsers" :key="user.id" type="button" class="user-row" @click="createChatWithUser(user)">
              <span class="row-avatar"><img v-if="user.avatar" :src="user.avatar" alt="" /><span v-else>{{ user.display_name.charAt(0).toUpperCase() }}</span></span>
              <span class="row-copy"><strong>{{ user.display_name }}</strong><small>@{{ user.username }}</small></span>
              <span class="row-status" :class="{ online: onlineUsers[String(user.id)] }">{{ onlineUsers[String(user.id)] ? 'онлайн' : 'оффлайн' }}</span>
            </button>
            <div v-if="filteredUsers.length === 0" class="no-users">Пользователи не найдены</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style>
* { box-sizing: border-box; }
html, body, #app { margin: 0; width: 100%; height: 100%; }
body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #080d17; color: #eef2f7; }
button, input { font: inherit; }
.app-shell { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #080d17; }
.loading-screen { flex: 1; display: grid; place-items: center; color: #9aa5ba; }
.main-layout { flex: 1; min-height: 0; display: flex; }
.conversation { min-width: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; position: relative; }
.conversation-header { height: 66px; flex: 0 0 66px; display: flex; align-items: center; gap: 11px; padding: 0 18px; border-bottom: 1px solid rgba(148,163,184,.1); background: #0d1522; }
.conversation-header > div:nth-child(2) { min-width: 0; flex: 1; }
.conversation-header strong, .conversation-header small { display: block; }
.conversation-header strong { font-size: 13px; color: #eef2f7; }
.conversation-header small { margin-top: 3px; color: #7d899e; font-size: 10px; }
.conversation-avatar { width: 38px; height: 38px; flex: 0 0 38px; display: grid; place-items: center; overflow: hidden; border-radius: 11px; color: white; background: #4f5fdc; font-weight: 800; }
.conversation-avatar img { width: 100%; height: 100%; object-fit: cover; }
.logout-button { border: 1px solid rgba(148,163,184,.12); border-radius: 9px; padding: 8px 11px; color: #aab4c5; background: rgba(255,255,255,.035); cursor: pointer; font-size: 11px; }
.logout-button:hover { color: #fff; background: rgba(255,255,255,.07); }
.empty-header { justify-content: space-between; }
.app-error { position: absolute; z-index: 20; top: 74px; left: 50%; transform: translateX(-50%); max-width: 80%; padding: 8px 12px; border: 1px solid rgba(248,113,113,.25); border-radius: 9px; color: #fecaca; background: rgba(127,29,29,.92); font-size: 11px; cursor: pointer; }
.auth-screen { flex: 1; display: grid; place-items: center; padding: 20px; background: radial-gradient(circle at 50% 20%, rgba(79,70,229,.14), transparent 38%), #080d17; }
.auth-card { width: min(410px, 100%); padding: 30px; border: 1px solid rgba(148,163,184,.13); border-radius: 20px; background: rgba(14,21,33,.94); box-shadow: 0 30px 90px rgba(0,0,0,.35); }
.auth-logo { width: 50px; height: 50px; display: grid; place-items: center; margin-bottom: 16px; border-radius: 15px; color: #fff; background: linear-gradient(145deg,#5b5cf0,#356ef4); font-weight: 900; }
.auth-card h1 { margin: 0; font-size: 23px; }
.auth-subtitle { margin: 7px 0 25px; color: #7e899d; font-size: 12px; }
.field { margin-bottom: 15px; }
.field label { display: block; margin-bottom: 7px; color: #aab4c6; font-size: 11px; font-weight: 700; }
.field input, .username-input { width: 100%; height: 44px; border: 1px solid rgba(148,163,184,.14); outline: none; border-radius: 10px; color: #f5f7fb; background: #0b1320; }
.field input { padding: 0 13px; }
.field input:focus, .username-input:focus-within { border-color: rgba(100,102,241,.7); }
.username-input { display: flex; align-items: center; padding-left: 13px; }
.username-input span { color: #748097; }
.username-input input { border: 0; padding-left: 4px; background: transparent; }
.auth-error { margin: 10px 0; padding: 9px 10px; border-radius: 9px; color: #fecaca; background: rgba(127,29,29,.45); font-size: 11px; }
.primary-button { width: 100%; height: 44px; margin-top: 5px; border: 0; border-radius: 10px; color: #fff; background: linear-gradient(145deg,#6472ff,#4b64e8); cursor: pointer; font-weight: 750; }
.primary-button:disabled { opacity: .6; cursor: wait; }
.switch-auth { width: 100%; margin-top: 15px; padding: 0; border: 0; color: #8490a7; background: transparent; cursor: pointer; font-size: 11px; }
.switch-auth:hover { color: #b8c1d0; }
.modal-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 20px; background: rgba(2,6,18,.72); backdrop-filter: blur(9px); }
.modal-card { width: min(520px, 100%); max-height: min(90vh, 760px); overflow: auto; padding: 22px; border: 1px solid rgba(148,163,184,.13); border-radius: 17px; background: #111927; box-shadow: 0 30px 90px rgba(0,0,0,.5); }
.modal-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; color: #eef2f7; }
.modal-title button { width: 30px; height: 30px; border: 0; border-radius: 8px; color: #9aa5b8; background: transparent; cursor: pointer; font-size: 22px; }
.modal-title button:hover { background: rgba(255,255,255,.06); color: white; }
.search-input { width: 100%; height: 42px; margin-bottom: 10px; padding: 0 12px; border: 1px solid rgba(148,163,184,.13); border-radius: 10px; outline: none; color: #f3f5f9; background: #0b1320; }
.user-list { display: flex; flex-direction: column; gap: 4px; }
.user-row { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px; border: 0; border-radius: 10px; text-align: left; color: #e8edf5; background: transparent; cursor: pointer; }
.user-row:hover { background: rgba(255,255,255,.06); }
.row-avatar { width: 40px; height: 40px; flex: 0 0 40px; display: grid; place-items: center; overflow: hidden; border-radius: 11px; color: white; background: #3f4d73; font-weight: 800; }
.row-avatar img { width: 100%; height: 100%; object-fit: cover; }
.row-copy { min-width: 0; flex: 1; }
.row-copy strong, .row-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-copy strong { font-size: 12px; }
.row-copy small { margin-top: 2px; color: #77839a; font-size: 10px; }
.row-status { color: #77839a; font-size: 10px; }
.row-status.online { color: #4ade80; }
.no-users { padding: 25px; text-align: center; color: #7c879b; font-size: 12px; }
@media (max-width: 700px) { .conversation-header { padding: 0 10px; } .auth-card { padding: 22px; } }
</style>
