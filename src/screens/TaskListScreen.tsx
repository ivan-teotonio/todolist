import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaskItem } from '../components/TaskItem';
import { RootStackParamList } from '../navigation/types';
import { useApp } from '../state/AppContext';
import { StatusFilter } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskList'>;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

/**
 * Screen 1 — Task List (main screen). Shows stored tasks with title,
 * completed/pending state, category and due date/time. Filters by status
 * (chips) and by category (chips). Entry points to create/open tasks and
 * to category management.
 */
export function TaskListScreen({ navigation }: Props) {
  const {
    loaded,
    categories,
    filteredTasks,
    statusFilter,
    categoryFilterId,
    remindersSupported,
    setStatusFilter,
    setCategoryFilter,
  } = useApp();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('Categories')}>
          <Text style={styles.headerLink}>Categories</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipContent}
      >
        {STATUS_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setStatusFilter(option.value)}
            style={[
              styles.chip,
              statusFilter === option.value && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                statusFilter === option.value && styles.chipTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipContent}
      >
        <Pressable
          onPress={() => setCategoryFilter(null)}
          style={[
            styles.chip,
            categoryFilterId === null && styles.chipActive,
          ]}
        >
          <Text
            style={[
              styles.chipText,
              categoryFilterId === null && styles.chipTextActive,
            ]}
          >
            All categories
          </Text>
        </Pressable>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            onPress={() => setCategoryFilter(category.id)}
            style={[
              styles.chip,
              categoryFilterId === category.id && styles.chipActive,
            ]}
          >
            <View
              style={[styles.dot, { backgroundColor: category.color }]}
            />
            <Text
              style={[
                styles.chipText,
                categoryFilterId === category.id && styles.chipTextActive,
              ]}
            >
              {category.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {!remindersSupported && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Reminders are disabled in Expo Go on Android. Use a development
            build to receive due-date notifications.
          </Text>
        </View>
      )}

      {!loaded ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : filteredTasks.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No tasks found.</Text>
          <Text style={styles.empty}>Tap + to create one.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onOpen={() =>
                navigation.navigate('TaskEditor', { taskId: item.id })
              }
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('TaskEditor', { taskId: undefined })}
        accessibilityLabel="New task"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  headerLink: { color: '#1a73e8', fontSize: 16, marginRight: 4 },
  chipRow: { flexGrow: 0, marginTop: 8 },
  chipContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
  },
  chipActive: { backgroundColor: '#1a73e8' },
  chipText: { color: '#333', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  notice: {
    backgroundColor: '#FFF8E1',
    marginHorizontal: 12,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  noticeText: { fontSize: 12, color: '#795548' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 16, color: '#777' },
  list: { paddingVertical: 8, paddingBottom: 90 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1a73e8',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 30 },
});
