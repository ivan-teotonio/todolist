# To-Do App (React Native + Expo)

#The specification documents and the questionnaire are inside the 'docs' folder.

Mobile to-do application with SQLite persistence, categories, filters,
optional due dates and scheduled local notifications.

## Requirements

- Node.js 20+
- Expo SDK 57 (`npm install -g expo-cli` not needed; use `npx expo`)
- Android Studio / Xcode, or the Expo Go app, to run

## Setup

```bash
npm install
npx tsc --noEmit   # typecheck
npx jest           # unit tests (pure logic, no device needed)
npx expo start     # run on emulator / device / Expo Go
```

## Project structure

```
App.tsx                  # providers + native-stack navigation
index.ts                 # expo entry (registerRootComponent)
src/
  types.ts               # Task, Category, filters (pure TS)
  utils/filter.ts        # pure in-memory task filtering
  db/                    # database.ts (expo-sqlite) + repositories
  notifications/         # local notification service (expo-notifications)
  state/AppContext.tsx   # Context + hooks state management
  navigation/types.ts    # RootStackParamList (editor takes only taskId)
  screens/               # TaskList, TaskEditor, CategoryManagement
  components/            # TaskItem
__tests__/               # jest tests for filter + date rules
```

## Key decisions (see BUILD_LOG.md)

- `expo-sqlite` with direct SQL, FK `ON DELETE SET NULL`: deleting a
  category leaves its tasks uncategorized.
- Extra fields beyond the SPEC minimum: `Task.notificationId` (opaque
  Expo notification identifier needed for exact cancel/reschedule) and
  `Category.color` (hex string for the UI dot).
- Notification id cannot be derived from the task id (Expo generates it),
  so it is persisted in the `tasks` table.
- Editor route receives only the task id (`{ taskId?: number }`).
- Reminders are re-synced at startup to survive restarts/reboots.
- Since SDK 53, `expo-notifications` cannot even be imported inside
  Expo Go on Android (its push auto-registration throws at import time),
  so the service uses a dynamic import and Expo Go/Android is detected
  up front: the app runs fully, only reminders are disabled with an
  in-app notice. Use a development build (`npx expo run:android`) for
  real notification testing on Android.

## Android permissions

Declared in `app.json`: `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`
(via the `expo-notifications` plugin). Runtime permission is requested
on startup; denial only disables reminders, never crashes the app.
