import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { Task } from '../types';

function formatDueDate(epochMs: number): string {
  const d = new Date(epochMs);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()} ${hours}:${minutes}`;
}

export function TaskItem({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: () => void;
}) {
  const { toggleTask, categoryById } = useApp();
  const category = categoryById(task.categoryId);
  const overdue =
    task.dueDateTime != null &&
    !task.completed &&
    task.dueDateTime < Date.now();

  return (
    <Pressable onPress={onOpen} style={styles.card}>
      <Pressable
        onPress={() => toggleTask(task.id).catch(() => {})}
        style={[styles.checkbox, task.completed && styles.checkboxDone]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
      >
        {task.completed && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>
      <View style={styles.body}>
        <Text
          style={[styles.title, task.completed && styles.titleDone]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {category && (
          <View style={styles.row}>
            <View
              style={[styles.dot, { backgroundColor: category.color }]}
            />
            <Text style={styles.category}>{category.name}</Text>
          </View>
        )}
        {task.dueDateTime != null && (
          <Text style={[styles.due, overdue && styles.overdue]}>
            {overdue ? 'Overdue • ' : ''}
            {formatDueDate(task.dueDateTime)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 6,
    elevation: 2,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxDone: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: { color: '#fff', fontWeight: 'bold' },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  titleDone: { textDecorationLine: 'line-through', color: '#999' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  category: { fontSize: 12, color: '#555' },
  due: { fontSize: 12, color: '#666', marginTop: 4 },
  overdue: { color: '#D32F2F', fontWeight: 'bold' },
});
