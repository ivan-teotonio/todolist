import { Task, hasFutureDueDate } from '../src/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Submit assignment',
    description: 'Mobile development',
    completed: false,
    dueDateTime: null,
    createdAt: 1000,
    categoryId: null,
    notificationId: null,
    ...overrides,
  };
}

describe('hasFutureDueDate', () => {
  it('is true for a future due date on a pending task', () => {
    expect(
      hasFutureDueDate(
        makeTask({ dueDateTime: Date.now() + 3600_000 }),
      ),
    ).toBe(true);
  });

  it('is false for a past due date', () => {
    expect(
      hasFutureDueDate(
        makeTask({ dueDateTime: Date.now() - 3600_000 }),
      ),
    ).toBe(false);
  });

  it('is false when there is no due date', () => {
    expect(hasFutureDueDate(makeTask())).toBe(false);
  });

  it('is false for completed tasks even with a future due date', () => {
    expect(
      hasFutureDueDate(
        makeTask({
          completed: true,
          dueDateTime: Date.now() + 3600_000,
        }),
      ),
    ).toBe(false);
  });
});
