import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font } from '../theme/theme';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const HISTORY = [
  {
    title: 'Domingo 30',
    delta: '+440 kcal',
    rows: [
      { name: 'Tortilla de claras y avena', meta: 'Desayuno · 42 P', kcal: 480 },
      { name: 'Ternera con boniato', meta: 'Comida · 52 P', kcal: 810 },
      { name: 'Batido post-entreno', meta: 'Snack · 30 P', kcal: 260 },
    ],
  },
  {
    title: 'Sábado 29',
    delta: '−120 kcal',
    rows: [
      { name: 'Bowl de yogur y frutos rojos', meta: 'Desayuno · 28 P', kcal: 390 },
      { name: 'Pasta con atún', meta: 'Comida · 46 P', kcal: 720 },
    ],
  },
];

export default function DiarioScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Diario</Text>

        <View style={styles.weekRow}>
          {DIAS.map((day, i) => {
            const isToday = i === 6;
            const past = i < 6;
            return (
              <View key={day + i} style={{ flex: 1, alignItems: 'center', gap: 7 }}>
                <Text style={styles.weekDay}>{day}</Text>
                <View
                  style={[
                    styles.weekNum,
                    { backgroundColor: isToday ? colors.black : past ? colors.track : colors.white },
                  ]}
                >
                  <Text style={{ color: isToday ? colors.white : colors.black, fontSize: 12.5, fontFamily: font.semibold }}>
                    {25 + i}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {HISTORY.map((day) => (
          <View key={day.title} style={{ gap: 2 }}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{day.title}</Text>
              <Text style={styles.dayDelta}>{day.delta}</Text>
            </View>
            {day.rows.map((r) => (
              <View key={r.name} style={styles.row}>
                <View style={styles.thumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName} numberOfLines={1}>{r.name}</Text>
                  <Text style={styles.rowMeta}>{r.meta}</Text>
                </View>
                <Text style={styles.rowKcal}>{r.kcal}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 24, gap: 24 },
  h1: { fontSize: 27, fontFamily: font.semibold, letterSpacing: -0.6, color: colors.black },
  weekRow: { flexDirection: 'row', gap: 6 },
  weekDay: { fontSize: 10.5, color: colors.textFaint, fontFamily: font.regular },
  weekNum: { width: '100%', paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  dayTitle: { fontSize: 15.5, fontFamily: font.semibold, color: colors.black },
  dayDelta: { fontSize: 12, fontFamily: font.semibold, color: colors.textFaint },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  thumb: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.fillSoft },
  rowName: { fontSize: 14, fontFamily: font.medium, color: colors.black },
  rowMeta: { fontSize: 11.5, color: colors.textFaint, marginTop: 2, fontFamily: font.regular },
  rowKcal: { fontSize: 14, fontFamily: font.semibold, color: colors.black },
});
