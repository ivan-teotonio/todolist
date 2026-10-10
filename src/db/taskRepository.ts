import { getDatabase } from './database';
import { NewTaskInput, Task, TaskUpdate } from '../types';

interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  completed: number;
  dueDateTime: number | null;
  createdAt: number;
  categoryId: number | null;
  notificationId: string | null;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: row.completed === 1,
    dueDateTime: row.dueDateTime,
    createdAt: row.createdAt,
    categoryId: row.categoryId,
    notificationId: row.notificationId,
  };
}

export async function getAllTasks(): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks ORDER BY createdAt DESC;',
  );
  return rows.map(toTask);
}

export async function insertTask(input: NewTaskInput): Promise<Task> {
  const db = await getDatabase();
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO tasks (title, description, completed, dueDateTime, createdAt, categoryId, notificationId)
     VALUES (?, ?, 0, ?, ?, ?, NULL);`,
    input.title,
    input.description ?? null,
    input.dueDateTime ?? null,
    now,
    input.categoryId ?? null,
  );
  return {
    id: result.lastInsertRowId,
    title: input.title,
    description: input.description ?? null,
    completed: false,
    dueDateTime: input.dueDateTime ?? null,
    createdAt: now,
    categoryId: input.categoryId ?? null,
    notificationId: null,
  };
}

export async function updateTask(task: TaskUpdate): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE tasks
     SET title = ?, description = ?, completed = ?, dueDateTime = ?, categoryId = ?
     WHERE id = ?;`,
    task.title,
    task.description ?? null,
    task.completed ? 1 : 0,
    task.dueDateTime ?? null,
    task.categoryId ?? null,
    task.id,
  );
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tasks WHERE id = ?;', id);
}

export async function setTaskNotificationId(
  id: number,
  notificationId: string | null,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE tasks SET notificationId = ? WHERE id = ?;',
    notificationId,
    id,
  );
}

/** Nulls out `categoryId` for every task using [categoryId]. */
export async function detachCategoryFromTasks(
  categoryId: number,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE tasks SET categoryId = NULL WHERE categoryId = ?;',
    categoryId,
  );
}
