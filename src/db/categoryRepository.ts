import { getDatabase } from './database';
import { Category } from '../types';

interface CategoryRow {
  id: number;
  name: string;
  color: string;
}

function toCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, color: row.color };
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories ORDER BY name ASC;',
  );
  return rows.map(toCategory);
}

export async function insertCategory(
  name: string,
  color: string,
): Promise<Category> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO categories (name, color) VALUES (?, ?);',
    name,
    color,
  );
  return { id: result.lastInsertRowId, name, color };
}

export async function updateCategory(category: Category): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE categories SET name = ?, color = ? WHERE id = ?;',
    category.name,
    category.color,
    category.id,
  );
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM categories WHERE id = ?;', id);
}
