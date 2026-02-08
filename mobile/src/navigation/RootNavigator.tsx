import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import MarshmallowsScreen from '../screens/MarshmallowsScreen';
import DailyCheckinScreen from '../screens/DailyCheckinScreen';
import MemoriesScreen from '../screens/MemoriesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#D946A6',
        tabBarInactiveTintColor: '#9CA3AF',
        headerStyle: {
          backgroundColor: '#D946A6',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Marshmallows"
        component={MarshmallowsScreen}
        options={{
          title: 'Marshmallows',
          tabBarLabel: 'Marshmallows',
        }}
      />

      <Tab.Screen
        name="CheckIn"
        component={DailyCheckinScreen}
        options={{
          title: 'Check-In',
          tabBarLabel: 'Check-In',
        }}
      />

      <Tab.Screen
        name="Memories"
        component={MemoriesScreen}
        options={{
          title: 'Memories',
          tabBarLabel: 'Memories',
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}
