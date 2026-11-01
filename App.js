import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FinanceProvider, useFinance } from './src/context/FinanceContext';
import SummaryScreen from './src/screens/SummaryScreen';
import MovementsScreen from './src/screens/MovementsScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import SavingsScreen from './src/screens/SavingsScreen';
import DebtsScreen from './src/screens/DebtsScreen';
import DataScreen from './src/screens/DataScreen';
import { COLORS } from './src/theme';

const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
  );
}

function AppNavigator() {
  const { ready } = useFinance();
  const insets = useSafeAreaInsets();

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.gold,
          tabBarInactiveTintColor: '#8B96AC',
          tabBarStyle: {
            backgroundColor: COLORS.navy,
            borderTopWidth: 0,
            height: 56 + bottomPad,
            paddingBottom: bottomPad,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 10 },
        }}
      >
        <Tab.Screen
          name="Resumen"
          component={SummaryScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }}
        />
        <Tab.Screen
          name="Movimientos"
          component={MovementsScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }}
        />
        <Tab.Screen
          name="Categorías"
          component={CategoriesScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏷️" focused={focused} /> }}
        />
        <Tab.Screen
          name="Ahorros"
          component={SavingsScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏦" focused={focused} /> }}
        />
        <Tab.Screen
          name="Deudas"
          component={DebtsScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💳" focused={focused} /> }}
        />
        <Tab.Screen
          name="Datos"
          component={DataScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💾" focused={focused} /> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FinanceProvider>
        <AppNavigator />
      </FinanceProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.navy },
});
