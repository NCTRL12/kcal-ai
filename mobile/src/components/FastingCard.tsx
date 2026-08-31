import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '../theme/theme';
import { FastingState } from '../lib/log';

function fmt(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function FastingCard({
  fasting,
  onStart,
  onStop,
}: {
  fasting: FastingState;
  onStart: (windowHours: number) => void;
  onStop: () => void;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!fasting.active) return;
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [fasting.active]);

  if (!fasting.active || !fasting.startedAt) {
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Ayuno intermitente</Text>
          <Text style={styles.value}>Sin empezar</Text>
        </View>
        <Pressable onPress={() => onStart(16)} style={styles.pillBtn}>
          <Text style={styles.pillBtnText}>Empezar 16:8</Text>
        </Pressable>
      </View>
    );
  }

  const elapsed = Date.now() - fasting.startedAt;
  const targetMs = fasting.windowHours * 3600_000;
  const remaining = targetMs - elapsed;
  const done = remaining <= 0;

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Ayuno intermitente</Text>
        <Text style={styles.value}>{done ? `Ventana cumplida (${fmt(elapsed)})` : `Llevas ${fmt(elapsed)} · quedan ${fmt(remaining)}`}</Text>
      </View>
      <Pressable onPress={onStop} style={[styles.pillBtn, styles.pillBtnDark]}>
        <Text style={[styles.pillBtnText, { color: colors.white }]}>Terminar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, backgroundColor: colors.fillSofter, gap: 10 },
  label: { fontSize: 11, color: colors.textFaint, marginBottom: 3, fontFamily: font.regular },
  value: { fontSize: 14, fontFamily: font.semibold, color: colors.black },
  pillBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.lime },
  pillBtnDark: { backgroundColor: colors.black },
  pillBtnText: { fontSize: 12.5, fontFamily: font.semibold, color: colors.black },
});
