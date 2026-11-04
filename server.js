const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');
const LOGS_FILE = path.join(__dirname, 'logs.json');
const CONTENT_FILE = path.join(__dirname, 'content.json');
const BANNED_FILE = path.join(__dirname, 'banned.json');

const ADMIN_SECRET_CODE = '944590705';
const SETTINGS_SECRET_CODE = '7777';

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
if (!fs.existsSync(LOGS_FILE)) fs.writeFileSync(LOGS_FILE, JSON.stringify([]));
if (!fs.existsSync(BANNED_FILE)) fs.writeFileSync(BANNED_FILE, JSON.stringify([]));
if (!fs.existsSync(CONTENT_FILE)) {
  fs.writeFileSync(CONTENT_FILE, JSON.stringify({
    theme: { accent: '#1f5eff', bg: '#f6f5f1', card: '#ffffff' },
    days: []
  }, null, 2));
}

function writeLog(entry) {
  try {
    const logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
    logs.unshift({
      time: new Date().toLocaleTimeString('uz-UZ'),
      date: new Date().toLocaleDateString('uz-UZ'),
      ...entry
    });
    if (logs.length > 500) logs.pop();
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (e) {
    console.error(e);
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // 1. Asosiy sahifa
  if (req.method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
    return;
  }

  // 2. Boshqaruv paneli
  if (req.method === 'GET' && url === '/boshqaruv') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(__dirname, 'admin.html')).pipe(res);
    return;
  }

  // 3. Kontentni olish
  if (req.method === 'GET' && url === '/api/content') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(fs.readFileSync(CONTENT_FILE, 'utf-8'));
    return;
  }

  // POST so'rovlar
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let parsed = {};
      try { parsed = JSON.parse(body); } catch(e) {}

      // /api/sync
      if (url === '/api/sync') {
        const { userId, userInfo, data, completedDaysCount, currentActiveTab, logAction } = parsed;
        if (!userId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'User ID kerak' }));
          return;
        }

        const bannedUsers = JSON.parse(fs.readFileSync(BANNED_FILE, 'utf-8'));
        if (bannedUsers.includes(String(userId))) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ banned: true, error: 'Siz tizimdan chetlashtirilgansiz (BAN)!' }));
          return;
        }

        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        const now = new Date().toLocaleTimeString('uz-UZ');

        db[userId] = {
          userId,
          userInfo: userInfo || { name: 'Nomaʼlum', telegramId: 'Mavjud emas', username: '' },
          completedDaysCount: completedDaysCount || 0,
          currentActiveTab: currentActiveTab || 'home',
          data: data || {},
          lastSeen: now
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

        if (logAction) {
          writeLog({
            userId,
            name: userInfo?.name || 'Nomaʼlum',
            telegramId: userInfo?.telegramId || 'Mavjud emas',
            action: logAction
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, banned: false }));
        return;
      }

      // /api/admin/data
      if (url === '/api/admin/data') {
        const { code } = parsed;
        if (code !== ADMIN_SECRET_CODE && code !== SETTINGS_SECRET_CODE) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Kod noto‘g‘ri!' }));
          return;
        }
        const users = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        const logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
        const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf-8'));
        const banned = JSON.parse(fs.readFileSync(BANNED_FILE, 'utf-8'));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ users: Object.values(users), logs, content, banned }));
        return;
      }

      // /api/admin/toggle-ban
      if (url === '/api/admin/toggle-ban') {
        const { code, targetUserId } = parsed;
        if (code !== ADMIN_SECRET_CODE) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Ruxsat yo‘q!' }));
          return;
        }

        let banned = JSON.parse(fs.readFileSync(BANNED_FILE, 'utf-8'));
        const uid = String(targetUserId);

        if (banned.includes(uid)) {
          banned = banned.filter(id => id !== uid);
          writeLog({ userId: 'ADMIN', name: 'Admin', telegramId: 'ADMIN', action: 'Blokdan chiqarildi: ' + uid });
        } else {
          banned.push(uid);
          writeLog({ userId: 'ADMIN', name: 'Admin', telegramId: 'ADMIN', action: 'Chetlashtirildi (BAN): ' + uid });
        }
        fs.writeFileSync(BANNED_FILE, JSON.stringify(banned, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, banned }));
        return;
      }

      // /api/admin/save-content
      if (url === '/api/admin/save-content') {
        const { code, content } = parsed;
        if (code !== SETTINGS_SECRET_CODE && code !== ADMIN_SECRET_CODE) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Kod xato!' }));
          return;
        }

        fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2));
        writeLog({ userId: 'ADMIN', name: 'Boshqaruvchi', telegramId: 'ADMIN', action: 'Darslar yoki dizayn yangilandi' });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      res.writeHead(404);
      res.end();
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Server ishlamoqda: http://localhost:${PORT}`);
  console.log(`Boshqaruv paneli: http://localhost:${PORT}/boshqaruv`);
});