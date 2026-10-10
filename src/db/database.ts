import * as SQLite from 'expo-sqlite';

const DB_NAME = 'todo.db';

const DEFAULT_CATEGORIES = [
  { name: 'Personal', color: '#2196F3' },
  { name: 'Work', color: '#F44336' },
  { name: 'Study', color: '#4CAF50' },
  { name: 'Shopping', color: '#FF9800' },
];

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Singleton SQLite database (direct SQL via `expo-sqlite`, no ORM —
 * explicit schema, no codegen, appropriate for a small educational app).
 *
 * Tables:
 * - `categories(id, name UNIQUE, color)`
 * - `tasks(id, title, description, completed 0/1, dueDateTime NULL-able,
 *   createdAt, categoryId NULL-able FK -> categories(id) ON DELETE SET NULL,
 *   notificationId NULL-able)`
 *
 * Category deletion strategy: tasks of a deleted category become
 * uncategorized (`categoryId` set to NULL); no task is ever deleted
 * together with its category.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  const opened = await SQLite.openDatabaseAsync(DB_NAME);
  await opened.execAsync('PRAGMA foreign_keys = ON;');
  await opened.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    );
  `);
  await opened.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      dueDateTime INTEGER,
      createdAt INTEGER NOT NULL,
      categoryId INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      notificationId TEXT
    );
  `);
  await opened.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);',
  );
  await opened.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(categoryId);',
  );

  const count = await opened.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM categories;',
  );
  if (!count || count.count === 0) {
    for (const c of DEFAULT_CATEGORIES) {
      await opened.runAsync(
        'INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?);',
        c.name,
        c.color,
      );
    }
  }

  db = opened;
  return opened;
}

/** Test/maintenance hook: drops the singleton so tests can reopen. */
export function __resetDatabaseForTests(): void {
  db = null;
}
