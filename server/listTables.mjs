import Database from 'better-sqlite3';

const db = new Database(new URL('./library.db', import.meta.url));
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', tables.map((row) => row.name));
