import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme/theme';

const GOAL = 8;

export function WaterCard({ glasses, onAdd }: { glasses: number; onAdd: (delta: number) => void }) {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Agua</Text>
        <Text style={styles.value}>{glasses} / {GOAL} vasos</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => onAdd(-1)} style={styles.btn} hitSlop={6}>
          <Text style={styles.btnText}>−</Text>
        </Pressable>
        <Pressable onPress={() => onAdd(1)} style={[styles.btn, styles.btnLime]} hitSlop={6}>
          <Text style={styles.btnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, backgroundColor: colors.fillSofter },
  label: { fontSize: 11, color: colors.textFaint, marginBottom: 3, fontFamily: font.regular },
  value: { fontSize: 15, fontFamily: font.semibold, color: colors.black },
  btn: { width: 34, height: 34, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  btnLime: { backgroundColor: colors.lime, borderColor: colors.lime },
  btnText: { fontSize: 17, color: colors.black, fontFamily: font.semibold, lineHeight: 20 },
});
