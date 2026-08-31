import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font } from '../theme/theme';
import { SECTIONS, useSectionNav } from '../state/SectionNav';

const LABELS: Record<(typeof SECTIONS)[number], string> = {
  Hoy: 'Hoy',
  Diario: 'Diario',
  IA: 'IA',
  Progreso: 'Progreso',
};

export const RAIL_WIDTH = 64;

export function SideRail() {
  const { index, goToIndex } = useSectionNav();
  return (
    <SafeAreaView edges={['top', 'bottom', 'left']} style={styles.wrap}>
      <View style={styles.list}>
        {SECTIONS.map((name, i) => {
          const focused = i === index;
          return (
            <Pressable key={name} onPress={() => goToIndex(i)} style={styles.item} hitSlop={8}>
              <View style={[styles.dot, { backgroundColor: focused ? colors.lime : 'transparent' }]} />
              <Text style={[styles.label, { color: focused ? colors.black : colors.textGhost }]}>{LABELS[name]}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: RAIL_WIDTH,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
    backgroundColor: colors.white,
  },
  list: {
    flex: 1,
    justifyContent: 'center',
    gap: 34,
    paddingVertical: 20,
  },
  item: {
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 5,
    height: 16,
    borderRadius: 3,
  },
  label: {
    fontFamily: font.semibold,
    fontSize: 10.5,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
});
