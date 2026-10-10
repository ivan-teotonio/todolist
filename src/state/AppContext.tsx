import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  deleteCategory as dbDeleteCategory,
  getAllCategories,
  insertCategory,
  updateCategory,
} from '../db/categoryRepository';
import {
  deleteTask as dbDeleteTask,
  detachCategoryFromTasks,
  getAllTasks,
  insertTask,
  setTaskNotificationId,
  updateTask as dbUpdateTask,
} from '../db/taskRepository';
import {
  areRemindersSupported,
  cancelReminder,
  initNotifications,
  isNotificationsGranted,
  syncReminderForTask,
} from '../notifications/notifications';
import {
  Category,
  NewTaskInput,
  StatusFilter,
  Task,
  TaskUpdate,
} from '../types';
import { filterTasks } from '../utils/filter';

export const CATEGORY_COLORS = [
  '#2196F3',
  '#F44336',
  '#4CAF50',
  '#FF9800',
  '#9C27B0',
  '#009688',
];

interface AppContextValue {
  tasks: Task[];
  categories: Category[];
  loaded: boolean;
  error: string | null;
  statusFilter: StatusFilter;
  categoryFilterId: number | null;
  filteredTasks: Task[];
  notificationsGranted: boolean;
  remindersSupported: boolean;
  setStatusFilter: (filter: StatusFilter) => void;
  setCategoryFilter: (categoryId: number | null) => void;
  categoryById: (id: number | null | undefined) => Category | undefined;
  taskById: (id: number | null | undefined) => Task | undefined;
  addTask: (input: NewTaskInput) => Promise<Task>;
  updateTask: (task: TaskUpdate) => Promise<void>;
  toggleTask: (id: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  addCategory: (name: string, color: string) => Promise<Category>;
  renameCategory: (id: number, name: string) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used within AppProvider');
  return value;
}

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  return `${fallback}: ${String(e)}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilterId, setCategoryFilter] = useState<number | null>(null);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [remindersSupported, setRemindersSupported] = useState(true);

  // Initial load: persisted data first, then restore reminders cleared by
  // an app restart / device reboot.
  useEffect(() => {
    (async () => {
      try {
        const granted = await initNotifications();
        setNotificationsGranted(granted);
        setRemindersSupported(areRemindersSupported());
        const [loadedTasks, loadedCategories] = await Promise.all([
          getAllTasks(),
          getAllCategories(),
        ]);
        setTasks(loadedTasks);
        setCategories(loadedCategories);

        if (granted) {
          const updated = await Promise.all(
            loadedTasks.map(async (task) => {
              if (task.dueDateTime == null || task.completed) return task;
              if (task.dueDateTime <= Date.now()) return task;
              const nid = await syncReminderForTask(task);
              if (nid !== task.notificationId) {
                await setTaskNotificationId(task.id, nid).catch(() => {});
                return { ...task, notificationId: nid };
              }
              return task;
            }),
          );
          setTasks(updated);
        }
      } catch (e) {
        setError(errorMessage(e, 'Could not load data'));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const categoryById = useCallback(
    (id: number | null | undefined) =>
      id == null
        ? undefined
        : categories.find((c) => c.id === id),
    [categories],
  );

  const taskById = useCallback(
    (id: number | null | undefined) =>
      id == null ? undefined : tasks.find((t) => t.id === id),
    [tasks],
  );

  const filteredTasks = useMemo(
    () => filterTasks(tasks, statusFilter, categoryFilterId),
    [tasks, statusFilter, categoryFilterId],
  );

  const addTask = useCallback(async (input: NewTaskInput): Promise<Task> => {
    const title = input.title.trim();
    if (!title) throw new Error('Title is required.');
    if (
      input.dueDateTime != null &&
      input.dueDateTime < Date.now() - 5000
    ) {
      throw new Error('Due date/time must be in the future.');
    }
    try {
      const created = await insertTask({
        title,
        description: input.description?.trim() || null,
        dueDateTime: input.dueDateTime ?? null,
        categoryId: input.categoryId ?? null,
      });
      setTasks((prev) => [created, ...prev]);
      // New task with a future due date -> schedule its reminder.
      const nid = await syncReminderForTask(created);
      if (nid) {
        await setTaskNotificationId(created.id, nid).catch(() => {});
        const withNid = { ...created, notificationId: nid };
        setTasks((prev) =>
          prev.map((t) => (t.id === created.id ? withNid : t)),
        );
        return withNid;
      }
      return created;
    } catch (e) {
      const message = errorMessage(e, 'Could not create task');
      setError(message);
      throw e instanceof Error ? e : new Error(message);
    }
  }, []);

  const updateTask = useCallback(
    async (task: TaskUpdate): Promise<void> => {
      const title = task.title.trim();
      if (!title) throw new Error('Title is required.');
      const existing = taskById(task.id);
      if (!existing) throw new Error('Task not found.');
      const merged: Task = {
        ...existing,
        title,
        description: task.description?.trim() || null,
        completed: task.completed,
        dueDateTime: task.dueDateTime ?? null,
        categoryId: task.categoryId ?? null,
      };
      try {
        await dbUpdateTask(merged);
        // Due date changed -> old reminder already cancelled inside
        // syncReminderForTask; a new one is scheduled when applicable.
        const nid = await syncReminderForTask(merged);
        await setTaskNotificationId(merged.id, nid).catch(() => {});
        const finalTask = { ...merged, notificationId: nid };
        setTasks((prev) =>
          prev.map((t) => (t.id === merged.id ? finalTask : t)),
        );
      } catch (e) {
        const message = errorMessage(e, 'Could not update task');
        setError(message);
        throw e instanceof Error ? e : new Error(message);
      }
    },
    [taskById],
  );

  const toggleTask = useCallback(
    async (id: number): Promise<void> => {
      const existing = taskById(id);
      if (!existing) throw new Error('Task not found.');
      const merged: Task = { ...existing, completed: !existing.completed };
      try {
        await dbUpdateTask(merged);
        let nid: string | null = merged.notificationId;
        if (merged.completed) {
          // Completing cancels the scheduled reminder.
          await cancelReminder(merged.notificationId);
          nid = null;
        } else {
          // Reopening re-schedules it when the due date is still future.
          nid = await syncReminderForTask(merged);
        }
        await setTaskNotificationId(merged.id, nid).catch(() => {});
        const finalTask = { ...merged, notificationId: nid };
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? finalTask : t)),
        );
      } catch (e) {
        const message = errorMessage(e, 'Could not update task');
        setError(message);
        throw e instanceof Error ? e : new Error(message);
      }
    },
    [taskById],
  );

  const deleteTask = useCallback(
    async (id: number): Promise<void> => {
      const existing = taskById(id);
      try {
        // Deleting a task cancels its scheduled reminder.
        await cancelReminder(existing?.notificationId);
        await dbDeleteTask(id);
        setTasks((prev) => prev.filter((t) => t.id !== id));
      } catch (e) {
        const message = errorMessage(e, 'Could not delete task');
        setError(message);
        throw e instanceof Error ? e : new Error(message);
      }
    },
    [taskById],
  );

  const addCategory = useCallback(
    async (name: string, color: string): Promise<Category> => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Category name is required.');
      try {
        const created = await insertCategory(trimmed, color);
        setCategories((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        return created;
      } catch (e) {
        const message = errorMessage(e, 'Could not create category');
        setError(message);
        throw e instanceof Error ? e : new Error(message);
      }
    },
    [],
  );

  const renameCategory = useCallback(
    async (id: number, name: string): Promise<void> => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Category name is required.');
      const existing = categories.find((c) => c.id === id);
      if (!existing) throw new Error('Category not found.');
      try {
        await updateCategory({ ...existing, name: trimmed });
        setCategories((prev) =>
          prev
            .map((c) => (c.id === id ? { ...c, name: trimmed } : c))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } catch (e) {
        const message = errorMessage(e, 'Could not rename category');
        setError(message);
        throw e instanceof Error ? e : new Error(message);
      }
    },
    [categories],
  );

  const deleteCategory = useCallback(
    async (id: number): Promise<void> => {
      try {
        // Tasks of a deleted category become uncategorized (NULL);
        // the FK (ON DELETE SET NULL) enforces this too — belt & braces.
        await detachCategoryFromTasks(id);
        await dbDeleteCategory(id);
        setTasks((prev) =>
          prev.map((t) =>
            t.categoryId === id ? { ...t, categoryId: null } : t,
          ),
        );
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setCategoryFilter((prev) => (prev === id ? null : prev));
      } catch (e) {
        const message = errorMessage(e, 'Could not delete category');
        setError(message);
        throw e instanceof Error ? e : new Error(message);
      }
    },
    [],
  );

  const value: AppContextValue = {
    tasks,
    categories,
    loaded,
    error,
    statusFilter,
    categoryFilterId,
    filteredTasks,
    notificationsGranted: notificationsGranted && isNotificationsGranted(),
    remindersSupported,
    setStatusFilter,
    setCategoryFilter,
    categoryById,
    taskById,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    addCategory,
    renameCategory,
    deleteCategory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
