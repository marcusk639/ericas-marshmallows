import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import MarshmallowsScreen from '../screens/MarshmallowsScreen';

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
        options={{
          title: 'Check-In',
          tabBarLabel: 'Check-In',
        }}
      >
        {() => <HomeScreen title="Check-In" />}
      </Tab.Screen>

      <Tab.Screen
        name="Memories"
        options={{
          title: 'Memories',
          tabBarLabel: 'Memories',
        }}
      >
        {() => <HomeScreen title="Memories" />}
      </Tab.Screen>

      <Tab.Screen
        name="Profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      >
        {() => <HomeScreen title="Profile" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
