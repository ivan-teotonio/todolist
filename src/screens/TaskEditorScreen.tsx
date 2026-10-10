import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RootStackParamList } from '../navigation/types';
import { useApp } from '../state/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskEditor'>;

/**
 * Screen 2 — Task Editor / Detail. Creates a task when no `taskId` param
 * is given, otherwise edits the existing task (form pre-filled from
 * AppContext). Supports save, cancel and delete (existing tasks only).
 */
export function TaskEditorScreen({ navigation, route }: Props) {
  const taskId = route.params?.taskId;
  const isEditing = taskId != null;
  const { taskById, categories, addTask, updateTask, deleteTask } = useApp();
  const existing = taskById(taskId);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [categoryId, setCategoryId] = useState<number | null>(
    existing?.categoryId ?? null,
  );
  const [dueDateTime, setDueDateTime] = useState<number | null>(
    existing?.dueDateTime ?? null,
  );
  const [completed, setCompleted] = useState(existing?.completed ?? false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [saving, setSaving] = useState(false);

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed') {
      setPickerMode(null);
      return;
    }
    if (pickerMode === 'date' && date) {
      const base = dueDateTime != null ? new Date(dueDateTime) : new Date();
      base.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setDueDateTime(base.getTime());
      setPickerMode('time');
    } else if (pickerMode === 'time' && date) {
      const base = dueDateTime != null ? new Date(dueDateTime) : new Date();
      base.setHours(date.getHours(), date.getMinutes(), 0, 0);
      if (base.getTime() < Date.now()) {
        Alert.alert(
          'Invalid date',
          'Due date/time must be in the future.',
        );
        setPickerMode(null);
        return;
      }
      setDueDateTime(base.getTime());
      setPickerMode(null);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        title,
        description: description.trim() ? description.trim() : null,
        dueDateTime,
        categoryId,
      };
      if (isEditing) {
        await updateTask({ ...payload, id: taskId, completed });
      } else {
        await addTask(payload);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        'Could not save task',
        e instanceof Error ? e.message : 'Unknown error.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete task?',
      'This will permanently delete the task.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(taskId as number);
              navigation.goBack();
            } catch (e) {
              Alert.alert(
                'Could not delete task',
                e instanceof Error ? e.message : 'Unknown error.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="What needs to be done?"
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Details..."
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Category (optional)</Text>
      <View style={styles.categoryRow}>
        <Pressable
          onPress={() => setCategoryId(null)}
          style={[styles.chip, categoryId === null && styles.chipActive]}
        >
          <Text
            style={[
              styles.chipText,
              categoryId === null && styles.chipTextActive,
            ]}
          >
            None
          </Text>
        </Pressable>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            onPress={() => setCategoryId(category.id)}
            style={[
              styles.chip,
              categoryId === category.id && styles.chipActive,
            ]}
          >
            <View
              style={[styles.dot, { backgroundColor: category.color }]}
            />
            <Text
              style={[
                styles.chipText,
                categoryId === category.id && styles.chipTextActive,
              ]}
            >
              {category.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Due date/time (optional)</Text>
      <View style={styles.dueRow}>
        <Pressable
          style={styles.dueButton}
          onPress={() => setPickerMode('date')}
        >
          <Text>
            {dueDateTime != null
              ? new Date(dueDateTime).toLocaleString()
              : 'Pick due date & time'}
          </Text>
        </Pressable>
        {dueDateTime != null && (
          <Pressable
            style={styles.clearButton}
            onPress={() => setDueDateTime(null)}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>
      {pickerMode && (
        <DateTimePicker
          value={dueDateTime != null ? new Date(dueDateTime) : new Date()}
          mode={pickerMode}
          onChange={onPickerChange}
        />
      )}

      {isEditing && (
        <View style={styles.completedRow}>
          <Text style={styles.label}>Completed</Text>
          <Switch value={completed} onValueChange={setCompleted} />
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.cancelButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>

      {isEditing && (
        <Pressable style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
          <Text style={styles.buttonText}>Delete task</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  content: { padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  chipActive: { backgroundColor: '#1a73e8' },
  chipText: { color: '#333', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dueButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  clearButton: { padding: 12 },
  clearText: { color: '#D32F2F', fontWeight: '600' },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: '#9e9e9e' },
  saveButton: { backgroundColor: '#1a73e8' },
  deleteButton: { backgroundColor: '#D32F2F', marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
