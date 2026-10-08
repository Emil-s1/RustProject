import http from 'node:http';
import { URL, fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'encore-67-change-this-secret';
const DB_PATH = fileURLToPath(new URL('./encore.db', import.meta.url));
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  last_seen TEXT
);
CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user1_id INTEGER NOT NULL,
  user2_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user1_id, user2_id),
  FOREIGN KEY(user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(user2_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  text TEXT NOT NULL DEFAULT '',
  attachment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// Мягкая миграция базы, если она была создана старой версией сервера.
const messageColumns = db.prepare(`PRAGMA table_info(messages)`).all().map(c => c.name);
if (!messageColumns.includes('type')) db.exec(`ALTER TABLE messages ADD COLUMN type TEXT NOT NULL DEFAULT 'text'`);
if (!messageColumns.includes('attachment')) db.exec(`ALTER TABLE messages ADD COLUMN attachment TEXT NOT NULL DEFAULT ''`);

const sockets = new Map(); // userId -> Set<WebSocket>

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function sendWs(socket, data) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data));
}

function broadcast(data, exceptUserId = null) {
  for (const [userId, set] of sockets) {
    if (exceptUserId !== null && Number(userId) === Number(exceptUserId)) continue;
    for (const socket of set) sendWs(socket, data);
  }
}

function userRow(id) {
  return db.prepare(`SELECT id, display_name, username, status, avatar, last_seen FROM users WHERE id = ?`).get(id);
}

function publicUser(row) {
  return row ? {
    id: row.id,
    display_name: row.display_name,
    username: row.username,
    status: row.status || '',
    avatar: row.avatar || '',
    last_seen: row.last_seen || null,
  } : null;
}

function onlineUserIds() {
  return [...sockets.entries()].filter(([, set]) => set.size > 0).map(([id]) => Number(id));
}

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
}

function authFromRequest(req) {
  const value = req.headers.authorization || '';
  if (!value.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(value.slice(7), JWT_SECRET);
    return userRow(Number(payload.sub));
  } catch {
    return null;
  }
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 8 * 1024 * 1024) reject(new Error('Слишком большой запрос'));
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error('Некорректный JSON')); }
    });
    req.on('error', reject);
  });
}

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@+/, '').toLowerCase();
}

function validateRegistration({ displayName, username, password }) {
  if (!String(displayName || '').trim()) return 'Введите имя';
  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) return 'Username: 3–32 символа, только a-z, 0-9, _, ., -';
  if (String(password || '').length < 6) return 'Пароль должен быть не короче 6 символов';
  return null;
}

function findOrCreateChat(a, b) {
  const user1 = Math.min(Number(a), Number(b));
  const user2 = Math.max(Number(a), Number(b));
  let chat = db.prepare(`SELECT * FROM chats WHERE user1_id = ? AND user2_id = ?`).get(user1, user2);
  if (!chat) {
    const result = db.prepare(`INSERT INTO chats (user1_id, user2_id) VALUES (?, ?)`).run(user1, user2);
    chat = db.prepare(`SELECT * FROM chats WHERE id = ?`).get(result.lastInsertRowid);
  }
  return chat;
}

function chatForUser(chatId, userId) {
  return db.prepare(`SELECT * FROM chats WHERE id = ? AND (user1_id = ? OR user2_id = ?)`).get(chatId, userId, userId);
}

function messageView(row) {
  const user = userRow(row.sender_id);
  return {
    id: row.id,
    body: row.text || '',
    type: row.type || 'text',
    attachment: row.attachment || '',
    created_at: row.created_at,
    author_id: row.sender_id,
    author_name: user?.display_name || 'Пользователь',
    author_username: user?.username || '',
    author_avatar: user?.avatar || '',
  };
}

function chatView(chat, currentUserId) {
  const peerId = chat.user1_id === currentUserId ? chat.user2_id : chat.user1_id;
  const peer = userRow(peerId);
  const last = db.prepare(`SELECT id, text, type, created_at FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT 1`).get(chat.id);
  return {
    id: chat.id,
    title: peer.display_name,
    username: peer.username,
    subtitle: peer.status || '',
    avatar: peer.avatar || '',
    user: publicUser(peer),
    last_message: last ? { id: last.id, text: last.text || (last.type === 'image' ? '📷 Фотография' : ''), created_at: last.created_at } : null,
  };
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
    return res.end();
  }

  if (path === '/api/health') return sendJson(res, 200, { ok: true });

  try {
    if (req.method === 'POST' && path === '/api/register') {
      const body = await getBody(req);
      const displayName = String(body.displayName || '').trim();
      const username = normalizeUsername(body.username);
      const password = String(body.password || '');
      const validation = validateRegistration({ displayName, username, password });
      if (validation) return sendJson(res, 400, { error: validation });
      if (db.prepare(`SELECT id FROM users WHERE username = ?`).get(username)) return sendJson(res, 409, { error: 'Этот username уже занят' });
      const passwordHash = await bcrypt.hash(password, 12);
      const result = db.prepare(`INSERT INTO users (display_name, username, password_hash, status, avatar) VALUES (?, ?, ?, ?, ?)`).run(displayName, username, passwordHash, 'В сети', '');
      const user = userRow(result.lastInsertRowid);
      return sendJson(res, 201, { token: signToken(user), user: publicUser(user) });
    }

    if (req.method === 'POST' && path === '/api/login') {
      const body = await getBody(req);
      const username = normalizeUsername(body.username);
      const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
      if (!user || !(await bcrypt.compare(String(body.password || ''), user.password_hash))) return sendJson(res, 401, { error: 'Неверный username или пароль' });
      db.prepare(`UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?`).run(user.id);
      return sendJson(res, 200, { token: signToken(user), user: publicUser(user) });
    }

    const user = authFromRequest(req);
    if (!user) return sendJson(res, 401, { error: 'Требуется авторизация' });

    if (req.method === 'GET' && path === '/api/me') return sendJson(res, 200, { user: publicUser(user) });

    if (req.method === 'GET' && path === '/api/users') {
      const rows = db.prepare(`SELECT id, display_name, username, status, avatar, last_seen FROM users WHERE id != ? ORDER BY display_name COLLATE NOCASE`).all(user.id);
      return sendJson(res, 200, { users: rows.map(publicUser) });
    }

    if (req.method === 'GET' && path === '/api/chats') {
      const rows = db.prepare(`SELECT * FROM chats WHERE user1_id = ? OR user2_id = ? ORDER BY id DESC`).all(user.id, user.id);
      return sendJson(res, 200, { chats: rows.map(c => chatView(c, user.id)) });
    }

    const messagesMatch = path.match(/^\/api\/chats\/(\d+)\/messages$/);
    if (req.method === 'GET' && messagesMatch) {
      const chat = chatForUser(Number(messagesMatch[1]), user.id);
      if (!chat) return sendJson(res, 404, { error: 'Чат не найден' });
      const rows = db.prepare(`SELECT * FROM messages WHERE chat_id = ? ORDER BY id ASC`).all(chat.id);
      return sendJson(res, 200, { messages: rows.map(messageView) });
    }

    return sendJson(res, 404, { error: 'Маршрут не найден' });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error instanceof Error ? error.message : 'Ошибка сервера' });
  }
}

const server = http.createServer((req, res) => { void handle(req, res); });
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', socket => {
  let userId = null;

  socket.on('message', raw => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === 'auth') {
        try {
          const payload = jwt.verify(String(data.token || ''), JWT_SECRET);
          const user = userRow(Number(payload.sub));
          if (!user) throw new Error('Пользователь не найден');
          userId = user.id;
          if (!sockets.has(userId)) sockets.set(userId, new Set());
          sockets.get(userId).add(socket);
          db.prepare(`UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?`).run(userId);
          sendWs(socket, { type: 'auth_ok', user: publicUser(user), onlineUsers: onlineUserIds() });
          broadcast({ type: 'presence', userId, online: true }, userId);
        } catch {
          sendWs(socket, { type: 'error', error: 'WebSocket авторизация не прошла' });
          socket.close();
        }
        return;
      }

      if (!userId) return sendWs(socket, { type: 'error', error: 'Сначала выполните auth' });

      if (data.type === 'ping') {
        db.prepare(`UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?`).run(userId);
        return sendWs(socket, { type: 'pong', at: Date.now() });
      }

      if (data.type === 'start_chat') {
        const peerId = Number(data.userId);
        if (!userRow(peerId) || peerId === userId) return sendWs(socket, { type: 'error', error: 'Пользователь не найден' });
        const chat = findOrCreateChat(userId, peerId);
        sendWs(socket, { type: 'chat_created', chatId: chat.id, userId: peerId });
        const peerSockets = sockets.get(peerId);
        if (peerSockets) for (const peerSocket of peerSockets) sendWs(peerSocket, { type: 'chat_created', chatId: chat.id, userId });
        return;
      }

      if (data.type === 'send_message') {
        const chatId = Number(data.chatId);
        const chat = chatForUser(chatId, userId);
        if (!chat) return sendWs(socket, { type: 'error', error: 'Нет доступа к этому чату' });
        const type = data.type === 'image' ? 'image' : String(data.messageType || data.contentType || 'text');
        const normalizedType = type === 'image' ? 'image' : 'text';
        const text = String(data.text || '');
        const attachment = normalizedType === 'image' ? String(data.attachment || '') : '';
        if (normalizedType === 'text' && !text.trim()) return;
        if (normalizedType === 'image' && !attachment.startsWith('data:image/')) return sendWs(socket, { type: 'error', error: 'Некорректное изображение' });
        if (attachment.length > 7 * 1024 * 1024) return sendWs(socket, { type: 'error', error: 'Изображение слишком большое' });
        const result = db.prepare(`INSERT INTO messages (chat_id, sender_id, type, text, attachment) VALUES (?, ?, ?, ?, ?)`).run(chatId, userId, normalizedType, text, attachment);
        const row = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(result.lastInsertRowid);
        const message = messageView(row);
        const peerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
        const payload = { type: 'new_message', chatId, message };
        const recipientSockets = sockets.get(peerId);
        if (recipientSockets) for (const peerSocket of recipientSockets) sendWs(peerSocket, payload);
        sendWs(socket, payload);
        return;
      }

      if (data.type === 'update_profile') {
        const displayName = String(data.displayName || '').trim();
        const username = normalizeUsername(data.username);
        const status = String(data.status || '').trim().slice(0, 100);
        const avatar = String(data.avatar || '');
        if (!displayName) return sendWs(socket, { type: 'error', error: 'Имя не может быть пустым' });
        if (!/^[a-z0-9_.-]{3,32}$/.test(username)) return sendWs(socket, { type: 'error', error: 'Некорректный username' });
        const same = db.prepare(`SELECT id FROM users WHERE username = ? AND id != ?`).get(username, userId);
        if (same) return sendWs(socket, { type: 'error', error: 'Этот username уже занят' });
        if (avatar.length > 7 * 1024 * 1024) return sendWs(socket, { type: 'error', error: 'Аватар слишком большой' });
        db.prepare(`UPDATE users SET display_name = ?, username = ?, status = ?, avatar = ? WHERE id = ?`).run(displayName, username, status, avatar, userId);
        const updated = userRow(userId);
        sendWs(socket, { type: 'profile_updated', userId, user: publicUser(updated) });
        broadcast({ type: 'profile_updated', userId, user: publicUser(updated) });
      }
    } catch (error) {
      console.error('WS error:', error);
      sendWs(socket, { type: 'error', error: 'Ошибка обработки сообщения' });
    }
  });

  socket.on('close', () => {
    if (!userId) return;
    const set = sockets.get(userId);
    if (set) {
      set.delete(socket);
      if (set.size === 0) {
        sockets.delete(userId);
        db.prepare(`UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?`).run(userId);
        broadcast({ type: 'presence', userId, online: false });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Encore 67 server: http://localhost:${PORT}`);
  console.log(`Encore 67 websocket: ws://localhost:${PORT}/ws`);
  console.log(`SQLite: ${DB_PATH}`);
});
