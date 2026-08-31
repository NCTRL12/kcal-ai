import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from '@expo-google-fonts/inter-tight';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from '@expo-google-fonts/inter-tight';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProvider } from './src/state/AppContext';
import { TabBar } from './src/components/TabBar';
import { colors } from './src/theme/theme';

import PlanScreen from './src/screens/PlanScreen';
import HoyScreen from './src/screens/HoyScreen';
import DiarioScreen from './src/screens/DiarioScreen';
import IAScreen from './src/screens/IAScreen';
import ProgresoScreen from './src/screens/ProgresoScreen';
import ScanScreen from './src/screens/ScanScreen';

export type RootStackParamList = {
  Plan: undefined;
  Main: undefined;
  Scan: undefined;
};

export type MainTabParamList = {
  Hoy: undefined;
  Diario: undefined;
  IA: undefined;
  Progreso: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

SplashScreen.preventAutoHideAsync().catch(() => {});

function MainTabs() {
  return (
    <Tabs.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="Hoy" component={HoyScreen} />
      <Tabs.Screen name="Diario" component={DiarioScreen} />
      <Tabs.Screen name="IA" component={IAScreen} />
      <Tabs.Screen name="Progreso" component={ProgresoScreen} />
    </Tabs.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
  });

  const onLayout = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.white }} onLayout={onLayout}>
      <AppProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="Plan" component={PlanScreen} />
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen name="Scan" component={ScanScreen} options={{ presentation: 'fullScreenModal' }} />
          </RootStack.Navigator>
        </NavigationContainer>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
