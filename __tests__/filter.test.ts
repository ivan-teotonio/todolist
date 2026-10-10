import { Task } from '../src/types';
import { filterTasks } from '../src/utils/filter';

function makeTask(
  id: number,
  overrides: Partial<Task> = {},
): Task {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    completed: false,
    dueDateTime: null,
    createdAt: 1000 + id,
    categoryId: null,
    notificationId: null,
    ...overrides,
  };
}

const tasks = [
  makeTask(1, { completed: false, categoryId: 10 }),
  makeTask(2, { completed: true, categoryId: 10 }),
  makeTask(3, { completed: false, categoryId: 20 }),
  makeTask(4, { completed: true, categoryId: null }),
];

describe('filterTasks', () => {
  it('returns everything for "all" without category', () => {
    expect(filterTasks(tasks, 'all', null)).toHaveLength(4);
  });

  it('returns only pending tasks', () => {
    const result = filterTasks(tasks, 'pending', null);
    expect(result.map((t) => t.id).sort()).toEqual([1, 3]);
  });

  it('returns only completed tasks', () => {
    const result = filterTasks(tasks, 'completed', null);
    expect(result.map((t) => t.id).sort()).toEqual([2, 4]);
  });

  it('restricts to the selected category', () => {
    const result = filterTasks(tasks, 'all', 10);
    expect(result.map((t) => t.id).sort()).toEqual([1, 2]);
  });

  it('combines status and category filters', () => {
    expect(filterTasks(tasks, 'pending', 10).map((t) => t.id)).toEqual([1]);
  });
});
