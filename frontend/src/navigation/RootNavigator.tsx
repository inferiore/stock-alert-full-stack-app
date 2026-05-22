import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// App screens (placeholders — filled in PASO 5)
import StocksScreen from '../screens/app/StocksScreen';
import AlertsScreen from '../screens/app/AlertsScreen';
import StockDetailScreen from '../screens/app/StockDetailScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Stocks: undefined;
  Alerts: undefined;
  StockDetail: { symbol: string };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator>
      <AppStack.Screen name="Stocks" component={StocksScreen} options={{ title: 'Live Stocks' }} />
      <AppStack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'My Alerts' }} />
      <AppStack.Screen
        name="StockDetail"
        component={StockDetailScreen}
        options={({ route }) => ({ title: route.params.symbol })}
      />
    </AppStack.Navigator>
  );
}

export default function RootNavigator() {
  const { token, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
