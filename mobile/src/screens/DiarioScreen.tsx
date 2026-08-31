import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font } from '../theme/theme';
import { useApp } from '../state/AppContext';
import { dayTotal, lastNDays, parseDateKey, todayKey } from '../lib/log';

const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function DiarioScreen() {
  const app = useApp();
  const week = lastNDays(7);
  const today = todayKey();

  const history = Object.keys(app.dailyLogs)
    .filter((k) => k !== today && (app.dailyLogs[k] || []).length > 0)
    .sort((a, b) => (a < b ? 1 : -1))
    .slice(0, 14);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Diario</Text>

        <View style={styles.weekRow}>
          {week.map((key) => {
            const d = parseDateKey(key);
            const isToday = key === today;
            const hasData = (app.dailyLogs[key] || []).length > 0;
            return (
              <View key={key} style={{ flex: 1, alignItems: 'center', gap: 7 }}>
                <Text style={styles.weekDay}>{DIAS[d.getDay()]}</Text>
                <View
                  style={[
                    styles.weekNum,
                    { backgroundColor: isToday ? colors.black : hasData ? colors.track : colors.white },
                  ]}
                >
                  <Text style={{ color: isToday ? colors.white : colors.black, fontSize: 12.5, fontFamily: font.semibold }}>
                    {d.getDate()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {history.length === 0 && (
          <Text style={styles.emptyText}>Aún no hay días anteriores registrados — lo que añadas hoy aparecerá aquí mañana.</Text>
        )}

        {history.map((key) => {
          const rows = app.dailyLogs[key];
          const total = dayTotal(rows);
          const delta = total - app.plan.kcal;
          const d = parseDateKey(key);
          const title = `${DIAS_LARGO[d.getDay()]} ${d.getDate()}`;
          return (
            <View key={key} style={{ gap: 2 }}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{title}</Text>
                <Text style={styles.dayDelta}>
                  {delta > 0 ? '+' : delta < 0 ? '−' : ''}
                  {Math.abs(delta).toLocaleString('es-ES')} kcal
                </Text>
              </View>
              {rows.map((r) => (
                <View key={r.id} style={styles.row}>
                  <View style={styles.thumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.rowMeta}>{r.slot} · {r.macroText}</Text>
                  </View>
                  <Text style={styles.rowKcal}>{r.kcal}</Text>
                </View>
              ))}
            </View>
          );
        })}
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
  emptyText: { fontSize: 12.5, color: colors.textFaint, lineHeight: 18, fontFamily: font.regular },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  dayTitle: { fontSize: 15.5, fontFamily: font.semibold, color: colors.black },
  dayDelta: { fontSize: 12, fontFamily: font.semibold, color: colors.textFaint },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  thumb: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.fillSoft },
  rowName: { fontSize: 14, fontFamily: font.medium, color: colors.black },
  rowMeta: { fontSize: 11.5, color: colors.textFaint, marginTop: 2, fontFamily: font.regular },
  rowKcal: { fontSize: 14, fontFamily: font.semibold, color: colors.black },
});
