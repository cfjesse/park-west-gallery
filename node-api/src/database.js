// Use the pure-JS HTTP client — no native binaries, works on any OS/serverless.
// Requires a remote Turso HTTPS URL (set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN).
const { createClient } = require('@libsql/client/web');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Turso: set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your environment.
// For local dev you can use a local file: file:./database.db
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./database.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initializeDatabase() {
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
      media TEXT NOT NULL CHECK(media IN ('acrylic', 'oils', 'pastel', 'charcoal', 'pencil', 'mixed_media', 'watercolor', 'gouache', 'ink', 'digital')),
      style TEXT NOT NULL CHECK(style IN ('abstract', 'realism', 'impressionism', 'surrealism', 'art_deco', 'expressionism', 'cubism', 'minimalism', 'pop_art', 'baroque')),
      width_in REAL NOT NULL,
      height_in REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('sold', 'pending', 'ready_for_sale')) DEFAULT 'ready_for_sale',
      price REAL NOT NULL CHECK(price >= 1000 AND price <= 20000),
      discount_percent INTEGER CHECK(discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 30)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const { rows: userRows } = await db.execute('SELECT COUNT(*) as count FROM users');
  if (Number(userRows[0].count) === 0) {
    await seedUsers();
  }

  const { rows: invRows } = await db.execute('SELECT COUNT(*) as count FROM inventory');
  if (Number(invRows[0].count) === 0) {
    await seedInventory();
  }
}

async function seedUsers() {
  const seedData = [
    { username: 'accountant1', role: 'accountant', password: 'Accountant@123' },
    { username: 'specialist1', role: 'inventory_specialist', password: 'Specialist@123' },
    { username: 'customer1', role: 'customer', password: 'Customer@123' },
  ];
  for (const u of seedData) {
    await db.execute({
      sql: 'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      args: [uuidv4(), u.username, bcrypt.hashSync(u.password, 12), u.role],
    });
  }
}

async function seedInventory() {
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
    'Neon Dissolution', 'Autumn Requiem', 'Silver Cascade', 'Twilight Accord', 'The Broken Path',
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

    await db.execute({
      sql: `INSERT INTO inventory (id, artist_name, title, media, style, width_in, height_in, status, price, discount_percent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [uuidv4(), artist, title, media, style, width, height, status, price, discount],
    });
  }
}

module.exports = { db, initializeDatabase };
