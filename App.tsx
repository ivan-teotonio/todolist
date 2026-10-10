import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { RootStackParamList } from './src/navigation/types';
import { CategoryManagementScreen } from './src/screens/CategoryManagementScreen';
import { TaskEditorScreen } from './src/screens/TaskEditorScreen';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { AppProvider } from './src/state/AppContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="TaskList">
          <Stack.Screen
            name="TaskList"
            component={TaskListScreen}
            options={{ title: 'My Tasks' }}
          />
          <Stack.Screen
            name="TaskEditor"
            component={TaskEditorScreen}
            options={{ title: 'Task' }}
          />
          <Stack.Screen
            name="Categories"
            component={CategoryManagementScreen}
            options={{ title: 'Categories' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
}
