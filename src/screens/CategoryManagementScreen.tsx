import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RootStackParamList } from '../navigation/types';
import { CATEGORY_COLORS, useApp } from '../state/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Categories'>;

/**
 * Screen 3 — Category Management. Lists categories and allows creating,
 * renaming and deleting them. Deletion strategy: tasks that used the
 * deleted category become uncategorized (nothing is lost); the user is
 * warned beforehand when tasks are affected.
 */
export function CategoryManagementScreen({ navigation }: Props) {
  const {
    categories,
    tasks,
    addCategory,
    renameCategory,
    deleteCategory,
  } = useApp();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameText, setRenameText] = useState('');

  const handleCreate = async () => {
    try {
      await addCategory(newName, newColor);
      setNewName('');
    } catch (e) {
      Alert.alert(
        'Could not create category',
        e instanceof Error ? e.message : 'Unknown error.',
      );
    }
  };

  const openRename = (id: number, currentName: string) => {
    setRenamingId(id);
    setRenameText(currentName);
  };

  const handleRename = async () => {
    if (renamingId == null) return;
    try {
      await renameCategory(renamingId, renameText);
      setRenamingId(null);
    } catch (e) {
      Alert.alert(
        'Could not rename category',
        e instanceof Error ? e.message : 'Unknown error.',
      );
    }
  };

  const handleDelete = (id: number, name: string) => {
    const usage = tasks.filter((t) => t.categoryId === id).length;
    Alert.alert(
      `Delete "${name}"?`,
      usage === 0
        ? 'This category will be permanently deleted.'
        : `${usage} task(s) use this category. They will become uncategorized (no task will be deleted).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(id);
            } catch (e) {
              Alert.alert(
                'Could not delete category',
                e instanceof Error ? e.message : 'Unknown error.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <Text style={styles.empty}>No categories yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={styles.name}>{item.name}</Text>
            <Pressable onPress={() => openRename(item.id, item.name)}>
              <Text style={styles.action}>Rename</Text>
            </Pressable>
            <Pressable onPress={() => handleDelete(item.id, item.name)}>
              <Text style={[styles.action, styles.delete]}>Delete</Text>
            </Pressable>
          </View>
        )}
        contentContainerStyle={styles.list}
      />

      <View style={styles.createBox}>
        <Text style={styles.label}>New category</Text>
        <TextInput
          style={styles.input}
          value={newName}
          onChangeText={setNewName}
          placeholder="Category name *"
        />
        <View style={styles.palette}>
          {CATEGORY_COLORS.map((color) => (
            <Pressable
              key={color}
              onPress={() => setNewColor(color)}
              style={[
                styles.swatch,
                { backgroundColor: color },
                newColor === color && styles.swatchActive,
              ]}
            />
          ))}
        </View>
        <Pressable style={styles.createButton} onPress={handleCreate}>
          <Text style={styles.createText}>Create</Text>
        </Pressable>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text>Back to tasks</Text>
        </Pressable>
      </View>

      <Modal visible={renamingId != null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.label}>Rename category</Text>
            <TextInput
              style={styles.input}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Category name *"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setRenamingId(null)}>
                <Text>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleRename}>
                <Text style={styles.action}>Rename</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  list: { padding: 12 },
  empty: { textAlign: 'center', color: '#777', marginTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  name: { flex: 1, fontSize: 16 },
  action: { color: '#1a73e8', fontWeight: '600', marginLeft: 12 },
  delete: { color: '#D32F2F' },
  createBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  label: { fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  palette: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchActive: { borderWidth: 3, borderColor: '#333' },
  createButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  createText: { color: '#fff', fontWeight: 'bold' },
  backButton: { alignItems: 'center', padding: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    gap: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 8,
  },
});
