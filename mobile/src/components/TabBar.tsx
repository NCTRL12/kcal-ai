import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, font } from '../theme/theme';

const LABELS: Record<string, string> = {
  Hoy: 'Hoy',
  Diario: 'Diario',
  IA: 'IA',
  Progreso: 'Progreso',
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.wrap}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = LABELS[route.name] ?? route.name;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tab} hitSlop={8}>
            <Text style={[styles.label, { color: focused ? colors.black : colors.textGhost }]}>{label}</Text>
            <View style={[styles.dot, { backgroundColor: focused ? colors.lime : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.white,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  label: {
    fontFamily: font.semibold,
    fontSize: 11.5,
    letterSpacing: -0.1,
  },
  dot: {
    width: 16,
    height: 2.5,
    borderRadius: 3,
  },
});
