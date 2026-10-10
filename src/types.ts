/**
 * Core domain types. Dates are stored as epoch milliseconds (INTEGER in
 * SQLite) to keep the DB layer free of date-parsing ambiguities.
 */

export interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  /** Epoch ms of the due date/time, or null when the task has none. */
  dueDateTime: number | null;
  /** Epoch ms recording when the task was created. */
  createdAt: number;
  /** Optional FK to a category. Null = uncategorized. */
  categoryId: number | null;
  /**
   * EXTRA field (beyond the SPEC minimum): identifier returned by
   * `expo-notifications` when a reminder is scheduled. Needed to cancel /
   * reschedule the exact notification, since Expo identifiers are opaque
   * strings that cannot be derived from the task id.
   */
  notificationId: string | null;
}

export interface NewTaskInput {
  title: string;
  description?: string | null;
  dueDateTime?: number | null;
  categoryId?: number | null;
}

export interface TaskUpdate extends NewTaskInput {
  id: number;
  completed: boolean;
}

export interface Category {
  id: number;
  name: string;
  /**
   * EXTRA field (allowed by the SPEC): hex color string (e.g. '#2196F3')
   * used to render a color dot next to the category name.
   */
  color: string;
}

export type StatusFilter = 'all' | 'pending' | 'completed';

export function hasFutureDueDate(task: Task, now = Date.now()): boolean {
  return (
    task.dueDateTime != null && !task.completed && task.dueDateTime > now
  );
}
