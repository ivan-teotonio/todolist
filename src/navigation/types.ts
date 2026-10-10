/**
 * Navigation routes. The editor receives only the task id
 * (`taskId` absent = create mode); the task itself is read from
 * AppContext, keeping a single source of truth.
 */
export type RootStackParamList = {
  TaskList: undefined;
  TaskEditor: { taskId?: number } | undefined;
  Categories: undefined;
};
