import { StatusFilter, Task } from '../types';

/**
 * Pure in-memory filtering over the SQLite-loaded task list.
 * Kept dependency-free so it is unit-testable with plain jest
 * (no native modules involved).
 */
export function filterTasks(
  tasks: Task[],
  status: StatusFilter,
  categoryId: number | null,
): Task[] {
  return tasks.filter((task) => {
    if (status === 'pending' && task.completed) return false;
    if (status === 'completed' && !task.completed) return false;
    if (categoryId != null && task.categoryId !== categoryId) return false;
    return true;
  });
}
