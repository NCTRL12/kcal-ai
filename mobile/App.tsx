import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import { colors } from './src/theme/theme';

import PlanScreen from './src/screens/PlanScreen';
import MainShell from './src/screens/MainShell';
import ScanScreen from './src/screens/ScanScreen';

export type RootStackParamList = {
  Plan: undefined;
  Main: undefined;
  Scan: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

SplashScreen.preventAutoHideAsync().catch(() => {});

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
            <RootStack.Screen name="Main" component={MainShell} />
            <RootStack.Screen name="Scan" component={ScanScreen} options={{ presentation: 'fullScreenModal' }} />
          </RootStack.Navigator>
        </NavigationContainer>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
