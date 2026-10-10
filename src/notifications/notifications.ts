import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Task, hasFutureDueDate } from '../types';

type NotificationsModule = typeof import('expo-notifications');

const CHANNEL_ID = 'task_reminders';

let mod: NotificationsModule | null = null;
let initialized = false;
let granted = false;
/** False when reminders cannot work in the current runtime. */
let supported = true;

/** Whether notification permission was granted (false when denied or init failed). */
export function isNotificationsGranted(): boolean {
  return granted;
}

/** Whether scheduled reminders are supported in the current runtime. */
export function areRemindersSupported(): boolean {
  return supported;
}

function isExpoGoAndroid(): boolean {
  return Platform.OS === 'android' && Constants.appOwnership === 'expo';
}

/**
 * Dynamically imports `expo-notifications`.
 *
 * A static import is intentionally avoided: since SDK 53, merely
 * *evaluating* the `expo-notifications` module inside Expo Go on Android
 * throws ("...was removed from Expo Go..."), because its push
 * auto-registration side effect runs at import time. A dynamic import lets
 * us catch that and degrade gracefully instead of redboxing at startup.
 */
async function loadModule(): Promise<NotificationsModule | null> {
  if (mod) return mod;
  try {
    mod = await import('expo-notifications');
    return mod;
  } catch (e) {
    console.warn('expo-notifications unavailable, reminders disabled:', e);
    supported = false;
    return null;
  }
}

/**
 * Centralizes all scheduled LOCAL notification logic (no remote push
 * server involved — this app never uses push tokens).
 *
 * Strategy:
 * - `scheduleNotificationAsync` returns an opaque identifier string, so it
 *   is persisted on the task (`notificationId` column) to allow exact
 *   cancel/reschedule later.
 * - `syncReminderForTask` is idempotent: it always cancels the previous
 *   identifier first, then schedules a new reminder only when the task is
 *   pending and has a future due date. Otherwise it returns null (meaning
 *   "no reminder scheduled").
 * - At startup the provider re-syncs every pending future-due reminder so
 *   reminders survive app restarts / device reboots (the OS clears
 *   scheduled alarms on reboot; reopening the app restores them).
 * - Permission is requested on init; denial (or any failure) only flips
 *   `granted` to false and makes scheduling a silent no-op — the app never
 *   crashes because of notifications.
 * - Expo Go on Android is detected up front and skipped: reminders are
 *   disabled there (development build required for notifications), while
 *   tasks/categories keep working normally.
 */
export async function initNotifications(): Promise<boolean> {
  if (initialized) return granted;
  try {
    if (isExpoGoAndroid()) {
      supported = false;
      granted = false;
      initialized = true;
      return false;
    }
    const N = await loadModule();
    if (!N) {
      granted = false;
      initialized = true;
      return false;
    }
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Task reminders',
        importance: N.AndroidImportance.HIGH,
      });
    }

    const { status } = await N.requestPermissionsAsync();
    granted = status === 'granted';
    initialized = true;
  } catch (e) {
    // Unsupported runtime, permission API failure, etc. — degrade
    // gracefully instead of breaking startup.
    console.warn('initNotifications failed, reminders disabled:', e);
    granted = false;
    initialized = true;
  }
  return granted;
}

/** Cancels the scheduled reminder identified by [notificationId], if any. */
export async function cancelReminder(
  notificationId: string | null | undefined,
): Promise<void> {
  if (!notificationId || !mod) return;
  try {
    await mod.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.warn('cancelReminder failed:', e);
  }
}

/**
 * Cancels the task's previous reminder and schedules a new one when
 * applicable. Returns the new identifier, or null when no reminder should
 * exist (unsupported runtime, no due date, past due date, completed task,
 * permission denied).
 */
export async function syncReminderForTask(
  task: Task,
): Promise<string | null> {
  await cancelReminder(task.notificationId);
  if (!mod || !initialized || !granted) return null;
  if (!hasFutureDueDate(task)) return null;
  try {
    const identifier = await mod.scheduleNotificationAsync({
      content: {
        title: 'Task reminder',
        body: `Task reminder: ${task.title}`,
      },
      trigger: {
        type: mod.SchedulableTriggerInputTypes.DATE,
        date: new Date(task.dueDateTime as number),
      },
    });
    return identifier;
  } catch (e) {
    console.warn(`scheduleReminder failed for task ${task.id}:`, e);
    return null;
  }
}
