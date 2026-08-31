import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Svg, { Polygon, Polyline } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { RootStackParamList } from '../../App';
import { useApp } from '../state/AppContext';
import { colors, font, radius } from '../theme/theme';
import { dayTotal, lastNDays, parseDateKey } from '../lib/log';
import { exportDiaryCsv } from '../lib/exportCsv';
import { cancelDailyReminder, scheduleDailyReminder } from '../lib/notifications';

const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export default function ProgresoScreen() {
  const app = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const P = app.plan;
  const [weightInput, setWeightInput] = useState('');

  const weekKeys = lastNDays(7);
  const kcalWeek = weekKeys.map((k) => dayTotal(app.dailyLogs[k]));
  const daysWithData = kcalWeek.filter((v) => v > 0);
  const maxBar = Math.max(P.kcal * 1.15, ...kcalWeek, 1);
  const targetLinePct = (P.kcal / maxBar) * 100;

  const weightKeys = Object.keys(app.weightLog).sort();
  const hasWeightHistory = weightKeys.length >= 2;
  const recentWeightKeys = weightKeys.slice(-8);
  const currentWeight = +app.profile.peso || 78;
  const weights = hasWeightHistory ? recentWeightKeys.map((k) => app.weightLog[k]) : [currentWeight, currentWeight];
  const wMin = Math.min(...weights) - 1;
  const wMax = Math.max(...weights) + 1;
  const y = (w: number) => 112 - ((w - wMin) / (wMax - wMin || 1)) * 100;
  const points = weights.map((w, i) => `${(i * (300 / Math.max(1, weights.length - 1))).toFixed(1)},${y(w).toFixed(1)}`).join(' ');
  const areaPoints = `0,120 ${points} 300,120`;

  const avgKcal = daysWithData.length ? Math.round(daysWithData.reduce((a, b) => a + b, 0) / daysWithData.length) : 0;
  const avgProt = daysWithData.length
    ? Math.round(
        weekKeys.reduce((t, k) => t + (app.dailyLogs[k] || []).reduce((tt, m) => tt + (parseInt(m.macroText, 10) || 0), 0), 0) /
          daysWithData.length
      )
    : 0;

  const saveWeight = () => {
    const kg = parseFloat(weightInput.replace(',', '.'));
    if (!Number.isFinite(kg) || kg <= 0) return;
    app.logWeight(kg);
    setWeightInput('');
  };

  const onExport = async () => {
    try {
      await exportDiaryCsv(app.dailyLogs);
    } catch (err) {
      Alert.alert('No se pudo exportar', err instanceof Error ? err.message : String(err));
    }
  };

  const onToggleReminders = async (on: boolean) => {
    try {
      if (on) await scheduleDailyReminder();
      else await cancelDailyReminder();
      app.setRemindersEnabled(on);
    } catch (err) {
      Alert.alert('No se pudo activar el recordatorio', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Progreso</Text>

        <View style={{ gap: 12 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>Calorías vs objetivo</Text>
            <Text style={styles.meta}>7 días</Text>
          </View>
          <View style={styles.barChart}>
            <View style={[styles.targetLine, { bottom: `${targetLinePct}%` }]} />
            {weekKeys.map((k, i) => (
              <View key={k} style={styles.barCol}>
                <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end' }}>
                  <View
                    style={[
                      styles.bar,
                      { height: `${(kcalWeek[i] / maxBar) * 100}%`, backgroundColor: i === 6 ? colors.lime : colors.black },
                    ]}
                  />
                </View>
                <Text style={styles.barDay}>{DIAS[parseDateKey(k).getDay()]}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.meta}>La línea marca tu objetivo de {P.kcal.toLocaleString('es-ES')} kcal</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatTile label="Media diaria" value={daysWithData.length ? avgKcal.toLocaleString('es-ES') : '—'} note="kcal · últimos 7 días" />
          <StatTile label="Proteína media" value={daysWithData.length ? `${avgProt} g` : '—'} note="de los días registrados" />
        </View>

        <View style={{ gap: 12 }}>
          <Text style={styles.sectionLabel}>Peso corporal</Text>
          <View style={{ height: 120 }}>
            <Svg width="100%" height={120} viewBox="0 0 300 120" preserveAspectRatio="none">
              <Polygon points={areaPoints} fill={colors.lime} opacity={0.5} />
              <Polyline points={points} fill="none" stroke={colors.black} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </Svg>
          </View>
          {hasWeightHistory ? (
            <View style={styles.rowBetween}>
              <Text style={styles.meta}>{parseDateKey(recentWeightKeys[0]).toLocaleDateString('es-ES')} · {weights[0]} kg</Text>
              <Text style={styles.meta}>hoy · {weights[weights.length - 1]} kg</Text>
            </View>
          ) : (
            <Text style={styles.meta}>Registra tu peso para ver la curva real — de momento muestra tu peso actual ({currentWeight} kg).</Text>
          )}
          <View style={styles.weightInputRow}>
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder={`Peso de hoy (${currentWeight} kg)`}
              placeholderTextColor={colors.textFaint}
              keyboardType="decimal-pad"
              style={styles.weightInput}
            />
            <Pressable onPress={saveWeight} style={styles.weightSaveBtn}>
              <Text style={styles.weightSaveBtnText}>Guardar</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <View style={styles.utilRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.utilLabel}>Recordatorio diario</Text>
              <Text style={styles.utilNote}>Aviso a las 20:00 si no has registrado nada</Text>
            </View>
            <Switch value={app.remindersEnabled} onValueChange={onToggleReminders} trackColor={{ true: colors.lime }} />
          </View>
          <Pressable onPress={onExport} style={styles.exportBtn}>
            <Text style={styles.exportBtnText}>Exportar diario (CSV)</Text>
          </Pressable>
        </View>

        <View style={styles.aiCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.aiDot} />
            <Text style={styles.aiKicker}>Racha</Text>
          </View>
          <Text style={styles.aiText}>
            {app.streak > 0
              ? `Llevas ${app.streak} ${app.streak === 1 ? 'día' : 'días'} seguidos registrando comidas.`
              : 'Aún no tienes racha — registra algo hoy para empezar.'}
          </Text>
          <Pressable onPress={() => navigation.navigate('Plan')} style={styles.recalcBtn}>
            <Text style={styles.recalcBtnText}>Recalcular plan</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statNote}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 24, gap: 26 },
  h1: { fontSize: 27, fontFamily: font.semibold, letterSpacing: -0.6, color: colors.black },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionLabel: { fontSize: 13, color: colors.textMuted, fontFamily: font.regular },
  meta: { fontSize: 11.5, color: colors.textFaint, fontFamily: font.regular },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 130, position: 'relative' },
  targetLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.black, opacity: 0.25 },
  barCol: { flex: 1, height: '100%', alignItems: 'center', gap: 7 },
  bar: { width: '100%', borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  barDay: { fontSize: 10, color: colors.textFaint, fontFamily: font.regular },
  statTile: { flex: 1, padding: 16, borderRadius: 18, backgroundColor: colors.fillSofter, gap: 5 },
  statLabel: { fontSize: 11, color: colors.textFaint, fontFamily: font.regular },
  statValue: { fontSize: 21, fontFamily: font.semibold, letterSpacing: -0.4, color: colors.black },
  statNote: { fontSize: 11, color: colors.textMuted, fontFamily: font.regular },
  weightInputRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  weightInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: colors.black,
    fontFamily: font.regular,
  },
  weightSaveBtn: { paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  weightSaveBtnText: { color: colors.white, fontSize: 12.5, fontFamily: font.semibold },
  utilRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: colors.fillSofter },
  utilLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.black },
  utilNote: { fontSize: 11.5, color: colors.textFaint, marginTop: 2, fontFamily: font.regular },
  exportBtn: { padding: 16, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  exportBtnText: { fontSize: 13.5, fontFamily: font.semibold, color: colors.black },
  aiCard: { padding: 18, borderRadius: 20, backgroundColor: colors.black, gap: 9 },
  aiDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.lime },
  aiKicker: { fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: '#a5a5aa', fontFamily: font.medium },
  aiText: { fontSize: 14, lineHeight: 20, color: '#e7e7ea', fontFamily: font.regular },
  recalcBtn: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.lime },
  recalcBtnText: { fontSize: 13, fontFamily: font.semibold, color: colors.black },
});
