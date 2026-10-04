const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'park-west-secure-jwt-secret-key-2026';
process.env.JWT_SECRET = JWT_SECRET;

const hasTurso = !!process.env.TURSO_DATABASE_URL &&
  (process.env.TURSO_DATABASE_URL.startsWith('libsql:') || process.env.TURSO_DATABASE_URL.startsWith('https:'));

let realClient = null;

if (hasTurso) {
  try {
    const { createClient } = require('@libsql/client/web');
    realClient = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  } catch (err) {
    console.warn('Failed to initialize Turso client, falling back to in-memory store:', err.message);
  }
}

// ---------------------------------------------------------------------------
// In-Memory Database Store (Fallback for serverless / zero-config environments)
// ---------------------------------------------------------------------------
const memoryStore = {
  users: [],
  inventory: [],
  initialized: false,
};

function initMemoryStore() {
  if (memoryStore.initialized) return;

  // Seed default users
  const defaultUsers = [
    { username: 'admin', role: 'inventory_specialist', password: 'password123' },
    { username: 'accountant1', role: 'accountant', password: 'Accountant@123' },
    { username: 'specialist1', role: 'inventory_specialist', password: 'Specialist@123' },
    { username: 'customer1', role: 'customer', password: 'Customer@123' },
  ];

  for (const u of defaultUsers) {
    memoryStore.users.push({
      id: uuidv4(),
      username: u.username,
      password_hash: bcrypt.hashSync(u.password, 10),
      role: u.role,
      created_at: new Date().toISOString(),
    });
  }

  // Seed inventory items
  const artists = [
    'Elena Vasquez', 'Marcus Chen', 'Sofia Delacroix', 'James Okoye', 'Amara Patel',
    'Luca Bianchi', 'Nadia Kowalski', 'Rafael Morales', 'Yuki Tanaka', 'Isabelle Fontaine',
    'Dmitri Volkov', 'Chiara Romano', 'Ahmed Al-Rashid', 'Priya Sharma', 'Carlos Reyes',
    'Astrid Lindqvist', 'Kwame Asante', 'Valentina Cruz', 'Henrik Sorensen', 'Zara Hussain',
  ];

  const titleBases = [
    'Echoes of Light', 'Fractured Horizon', 'Silent Garden', 'Midnight Reverie', 'Urban Symphony',
    'The Last Wave', 'Golden Meridian', 'Whispers in Blue', 'Crimson Descent', 'Infinite Bloom',
    'Shattered Dusk', 'The Quiet Storm', 'Velvet Shadows', 'Emerald Passage', 'Lost in Translation',
    'Celestial Drift', 'Iron and Grace', 'Desert Mirage', 'Coastal Memory', 'The Forgotten Gate',
  ];

  const medias = ['acrylic', 'oils', 'pastel', 'charcoal', 'pencil', 'mixed_media', 'watercolor', 'gouache', 'ink', 'digital'];
  const styles = ['abstract', 'realism', 'impressionism', 'surrealism', 'art_deco', 'expressionism', 'cubism', 'minimalism', 'pop_art', 'baroque'];
  const dimensions = [12, 16, 18, 20, 24, 30, 36, 40, 48, 60];

  for (let i = 0; i < 200; i++) {
    const artist = artists[i % artists.length];
    const baseTitle = titleBases[i % titleBases.length];
    const title = i < titleBases.length ? baseTitle : `${baseTitle} No. ${Math.floor(i / titleBases.length) + 1}`;
    const media = medias[Math.floor(Math.random() * medias.length)];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const width = dimensions[Math.floor(Math.random() * dimensions.length)];
    const height = dimensions[Math.floor(Math.random() * dimensions.length)];
    const price = Math.round((Math.random() * 19000 + 1000) / 100) * 100;
    const rand = Math.random();
    const status = rand < 0.25 ? 'sold' : rand < 0.40 ? 'pending' : 'ready_for_sale';
    const discount = Math.random() < 0.4 ? Math.floor(Math.random() * 31) : null;

    memoryStore.inventory.push({
      id: uuidv4(),
      artist_name: artist,
      title,
      media,
      style,
      width_in: width,
      height_in: height,
      status,
      price,
      discount_percent: discount,
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
      updated_at: new Date(Date.now() - i * 3600000).toISOString(),
    });
  }

  memoryStore.initialized = true;
}

// In-memory SQL execution engine
async function executeMemoryQuery(stmt) {
  initMemoryStore();

  let sql = typeof stmt === 'string' ? stmt : stmt.sql;
  let args = (typeof stmt === 'object' && stmt.args) || [];

  sql = sql.trim();

  // 1. SELECT * FROM users WHERE username = ?
  if (sql.includes('FROM users WHERE username = ?')) {
    const username = args[0];
    const user = memoryStore.users.find(u => u.username === username);
    return { rows: user ? [{ ...user }] : [] };
  }

  // 2. SELECT COUNT(*) as count FROM users
  if (sql.includes('SELECT COUNT(*) as count FROM users')) {
    return { rows: [{ count: memoryStore.users.length }] };
  }

  // 3. INSERT INTO users
  if (sql.startsWith('INSERT INTO users')) {
    const [id, username, password_hash, role] = args;
    const newUser = { id, username, password_hash, role, created_at: new Date().toISOString() };
    memoryStore.users.push(newUser);
    return { rows: [] };
  }

  // 4. SELECT COUNT(*) as count FROM inventory
  if (sql.includes('COUNT(*) as count FROM inventory')) {
    let list = [...memoryStore.inventory];
    let argIdx = 0;
    if (sql.includes('status = ?')) {
      const val = args[argIdx++];
      list = list.filter(i => i.status === val);
    }
    if (sql.includes('media = ?')) {
      const val = args[argIdx++];
      list = list.filter(i => i.media === val);
    }
    if (sql.includes('style = ?')) {
      const val = args[argIdx++];
      list = list.filter(i => i.style === val);
    }
    if (sql.includes('artist_name LIKE ?')) {
      const val = String(args[argIdx++]).replace(/%/g, '').toLowerCase();
      list = list.filter(i => i.artist_name.toLowerCase().includes(val));
    }
    return { rows: [{ count: list.length }] };
  }

  // 5. SELECT * FROM inventory WHERE id = ?
  if (sql.includes('SELECT * FROM inventory WHERE id = ?')) {
    const id = args[0];
    const item = memoryStore.inventory.find(i => i.id === id);
    return { rows: item ? [{ ...item }] : [] };
  }

  // 6. SELECT * FROM inventory ... ORDER BY created_at DESC LIMIT ? OFFSET ?
  if (sql.startsWith('SELECT * FROM inventory')) {
    let list = [...memoryStore.inventory];
    let argIdx = 0;
    if (sql.includes('status = ?')) {
      const val = args[argIdx++];
      list = list.filter(i => i.status === val);
    }
    if (sql.includes('media = ?')) {
      const val = args[argIdx++];
      list = list.filter(i => i.media === val);
    }
    if (sql.includes('style = ?')) {
      const val = args[argIdx++];
      list = list.filter(i => i.style === val);
    }
    if (sql.includes('artist_name LIKE ?')) {
      const val = String(args[argIdx++]).replace(/%/g, '').toLowerCase();
      list = list.filter(i => i.artist_name.toLowerCase().includes(val));
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (sql.includes('LIMIT ?')) {
      const limit = args[argIdx++] || 50;
      const offset = args[argIdx++] || 0;
      const paged = list.slice(offset, offset + limit);
      return { rows: paged.map(i => ({ ...i })) };
    }

    return { rows: list.map(i => ({ ...i })) };
  }

  // 7. INSERT INTO inventory
  if (sql.startsWith('INSERT INTO inventory')) {
    const [id, artist_name, title, media, style, width_in, height_in, status, price, discount_percent] = args;
    const newItem = {
      id,
      artist_name,
      title,
      media,
      style,
      width_in,
      height_in,
      status,
      price,
      discount_percent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.inventory.unshift(newItem);
    return { rows: [] };
  }

  // 8. UPDATE inventory
  if (sql.startsWith('UPDATE inventory')) {
    const id = args[args.length - 1];
    const itemIndex = memoryStore.inventory.findIndex(i => i.id === id);
    if (itemIndex !== -1) {
      const item = memoryStore.inventory[itemIndex];
      let argPos = 0;
      if (sql.includes('artist_name = ?')) item.artist_name = args[argPos++];
      if (sql.includes('title = ?')) item.title = args[argPos++];
      if (sql.includes('media = ?')) item.media = args[argPos++];
      if (sql.includes('style = ?')) item.style = args[argPos++];
      if (sql.includes('width_in = ?')) item.width_in = args[argPos++];
      if (sql.includes('height_in = ?')) item.height_in = args[argPos++];
      if (sql.includes('status = ?')) item.status = args[argPos++];
      if (sql.includes('price = ?')) item.price = args[argPos++];
      if (sql.includes('discount_percent = ?')) item.discount_percent = args[argPos++];
      item.updated_at = new Date().toISOString();
    }
    return { rows: [] };
  }

  // 9. DELETE FROM inventory WHERE id = ?
  if (sql.startsWith('DELETE FROM inventory WHERE id = ?')) {
    const id = args[0];
    const itemIndex = memoryStore.inventory.findIndex(i => i.id === id);
    if (itemIndex !== -1) {
      memoryStore.inventory.splice(itemIndex, 1);
    }
    return { rows: [] };
  }

  return { rows: [] };
}

const db = {
  async execute(stmt) {
    if (realClient) {
      try {
        return await realClient.execute(stmt);
      } catch (err) {
        console.warn('Real DB query failed, using in-memory query fallback:', err.message);
      }
    }
    return await executeMemoryQuery(stmt);
  },
  async executeMultiple(sql) {
    if (realClient) {
      try {
        return await realClient.executeMultiple(sql);
      } catch (err) {
        console.warn('Real DB executeMultiple failed, using in-memory store:', err.message);
      }
    }
    initMemoryStore();
    return [];
  },
};

async function initializeDatabase() {
  if (realClient) {
    try {
      await db.executeMultiple(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('accountant', 'inventory_specialist', 'customer')),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS inventory (
          id TEXT PRIMARY KEY,
          artist_name TEXT NOT NULL,
          title TEXT NOT NULL,
          media TEXT NOT NULL,
          style TEXT NOT NULL,
          width_in REAL NOT NULL,
          height_in REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'ready_for_sale',
          price REAL NOT NULL,
          discount_percent INTEGER,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      return;
    } catch (err) {
      console.warn('Initialize real DB failed, fallback to in-memory:', err.message);
    }
  }
  initMemoryStore();
}

module.exports = { db, initializeDatabase };
