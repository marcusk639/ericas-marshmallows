import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MemoriesScreen from '../screens/MemoriesScreen';
import MemoryDetailScreen from '../screens/MemoryDetailScreen';
import type { WithId, Memory } from '../../../shared/types';

export type MemoriesStackParamList = {
  MemoriesList: undefined;
  MemoryDetail: { memory: WithId<Memory> };
};

const Stack = createStackNavigator<MemoriesStackParamList>();

export default function MemoriesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MemoriesList" component={MemoriesScreen} />
      <Stack.Screen name="MemoryDetail" component={MemoryDetailScreen} />
    </Stack.Navigator>
  );
}
