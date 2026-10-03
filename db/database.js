import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

let db = null;
let currentSessionUser = null;

// Helper for Web storage fallback
const isWeb = Platform.OS === 'web';
const WEB_USERS_KEY = 'shodhini_users';
const WEB_SESSION_KEY = 'shodhini_current_user';

function getWebUsers() {
  try {
    const raw = localStorage.getItem(WEB_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWebUsers(users) {
  try {
    localStorage.setItem(WEB_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving web users:', e);
  }
}

export async function initDatabase() {
  if (isWeb) {
    // Check if web session exists
    try {
      const savedSession = localStorage.getItem(WEB_SESSION_KEY);
      if (savedSession) {
        currentSessionUser = JSON.parse(savedSession);
      }
    } catch {}
    return true;
  }

  try {
    db = SQLite.openDatabaseSync('shodhini.db');
    db.execSync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        identifier TEXT NOT NULL,
        area TEXT,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Check if session exists in SQLite
    const session = db.getFirstSync(
      `SELECT u.id, u.role, u.name, u.phone, u.identifier, u.area, u.created_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = 1`
    );
    if (session) {
      currentSessionUser = session;
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize SQLite database:', error);
    return false;
  }
}

export async function getCurrentUser() {
  if (isWeb) {
    try {
      const saved = localStorage.getItem(WEB_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return currentSessionUser;
    }
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const session = db.getFirstSync(
      `SELECT u.id, u.role, u.name, u.phone, u.identifier, u.area, u.created_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = 1`
    );
    currentSessionUser = session || null;
    return currentSessionUser;
  } catch (e) {
    console.error('Error getting current user:', e);
    return null;
  }
}

export async function signUpUser({ role, name, phone, identifier, area = '', password }) {
  if (isWeb) {
    const users = getWebUsers();
    // Check duplicate
    const exists = users.find(
      (u) =>
        u.role === role &&
        (u.phone === phone || u.identifier.toLowerCase() === identifier.toLowerCase())
    );
    if (exists) {
      throw new Error('A user with this phone or email/username already exists.');
    }

    const newUser = {
      id: Date.now(),
      role,
      name,
      phone,
      identifier,
      area: area || '',
      password,
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    saveWebUsers(users);

    const safeUser = { ...newUser };
    delete safeUser.password;
    localStorage.setItem(WEB_SESSION_KEY, JSON.stringify(safeUser));
    currentSessionUser = safeUser;
    return safeUser;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    // Check duplicate
    const existing = db.getFirstSync(
      `SELECT id FROM users WHERE role = ? AND (phone = ? OR LOWER(identifier) = LOWER(?))`,
      [role, phone, identifier]
    );

    if (existing) {
      throw new Error('A user with this phone or email/username already exists.');
    }

    const result = db.runSync(
      `INSERT INTO users (role, name, phone, identifier, area, password) VALUES (?, ?, ?, ?, ?, ?)`,
      [role, name, phone, identifier, area || '', password]
    );

    const userId = result.lastInsertRowId;

    // Save session
    db.runSync(`INSERT OR REPLACE INTO sessions (id, user_id) VALUES (1, ?)`, [userId]);

    const user = db.getFirstSync(
      `SELECT id, role, name, phone, identifier, area, created_at FROM users WHERE id = ?`,
      [userId]
    );

    currentSessionUser = user;
    return user;
  } catch (error) {
    throw error;
  }
}

export async function loginUser({ role, identifier, password }) {
  const cleanId = (identifier || '').trim();
  const cleanPass = (password || '').trim();

  if (isWeb) {
    const users = getWebUsers();
    const user = users.find(
      (u) =>
        u.role === role &&
        (u.identifier.toLowerCase() === cleanId.toLowerCase() || u.phone === cleanId) &&
        u.password === cleanPass
    );

    if (!user) {
      throw new Error('Invalid credentials or account does not exist.');
    }

    const safeUser = { ...user };
    delete safeUser.password;
    localStorage.setItem(WEB_SESSION_KEY, JSON.stringify(safeUser));
    currentSessionUser = safeUser;
    return safeUser;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    const user = db.getFirstSync(
      `SELECT id, role, name, phone, identifier, area, created_at 
       FROM users 
       WHERE role = ? AND (LOWER(identifier) = LOWER(?) OR phone = ?) AND password = ?`,
      [role, cleanId, cleanId, cleanPass]
    );

    if (!user) {
      throw new Error('Invalid credentials or account does not exist.');
    }

    // Save session
    db.runSync(`INSERT OR REPLACE INTO sessions (id, user_id) VALUES (1, ?)`, [user.id]);

    currentSessionUser = user;
    return user;
  } catch (error) {
    throw error;
  }
}

export async function logoutUser() {
  currentSessionUser = null;
  if (isWeb) {
    try {
      localStorage.removeItem(WEB_SESSION_KEY);
    } catch {}
    return true;
  }

  if (!db) {
    await initDatabase();
  }

  try {
    db.runSync(`DELETE FROM sessions WHERE id = 1`);
    return true;
  } catch (e) {
    console.error('Error logging out:', e);
    return false;
  }
}
