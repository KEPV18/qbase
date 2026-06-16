import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = process.env.USERS_FILE || path.join(DATA_DIR, 'users.txt');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '', 'utf8');
  }
}

function parseLine(line) {
  const parts = line.split('|');
  if (parts.length < 6) return null;
  const [id, name, email, password, role, activeStr, lastLoginStr] = parts;
  return {
    id,
    name,
    email,
    password,
    role: role || 'user',
    active: activeStr === 'true',
    lastLoginAt: lastLoginStr ? Number(lastLoginStr) : 0,
  };
}

function toLine(user) {
  const fields = [
    user.id,
    user.name || '',
    user.email || '',
    user.password || '',
    user.role || 'user',
    user.active ? 'true' : 'false',
    String(user.lastLoginAt || 0),
  ];
  return fields.join('|');
}

function readUsers() {
  ensureFile();
  const content = fs.readFileSync(USERS_FILE, 'utf8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  return lines.map(parseLine).filter(Boolean);
}

function writeUsers(users) {
  ensureFile();
  const content = users.map(toLine).join('\n') + (users.length ? '\n' : '');
  fs.writeFileSync(USERS_FILE, content, 'utf8');
}

export default async function handler(req, res) {
  ensureFile();
  const method = req.method || 'GET';

  if (method === 'GET') {
    const users = readUsers();
    res.status(200).json(users);
    return;
  }

  if (method === 'POST') {
    const body = req.body || {};
    if (!body.email || !body.name) {
      res.status(400).json({ error: 'Missing name or email' });
      return;
    }
    const users = readUsers();
    const exists = users.some(u => u.email.toLowerCase() === String(body.email).toLowerCase());
    if (exists) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }
    const id = body.id || (global.crypto?.randomUUID?.() || String(Date.now()));
    const newUser = {
      id,
      name: body.name,
      email: body.email,
      password: body.password || '',
      role: body.role || 'user',
      active: !!body.active,
      lastLoginAt: 0,
    };
    users.push(newUser);
    writeUsers(users);
    res.status(201).json(newUser);
    return;
  }

  if (method === 'PUT') {
    const id = req.query?.id || req.params?.id || req.body?.id;
    if (!id) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }
    const users = readUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const current = users[idx];
    const updates = req.body || {};
    const updated = {
      ...current,
      ...updates,
      active: typeof updates.active === 'boolean' ? updates.active : current.active,
      role: updates.role || current.role,
      lastLoginAt: typeof updates.lastLoginAt === 'number' ? updates.lastLoginAt : current.lastLoginAt,
    };
    users[idx] = updated;
    writeUsers(users);
    res.status(200).json(updated);
    return;
  }

  if (method === 'DELETE') {
    const id = req.query?.id || req.params?.id || req.body?.id;
    if (!id) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }
    const users = readUsers();
    const filtered = users.filter(u => u.id !== id);
    writeUsers(filtered);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
