import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon, Polyline } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { RootStackParamList } from '../../App';
import { useApp } from '../state/AppContext';
import { colors, font, radius } from '../theme/theme';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function ProgresoScreen() {
  const app = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const P = app.plan;
  const consumido = app.meals.reduce((t, m) => t + m.kcal, 0);

  const kcalWeek = [3120, 3290, 2980, 3410, 3180, 3620, consumido];
  const maxBar = Math.max(P.kcal * 1.15, ...kcalWeek);
  const targetLinePct = (P.kcal / maxBar) * 100;

  const weights = [76.4, 76.6, 76.9, 77.1, 77.0, 77.4, 77.8, +app.profile.peso || 78];
  const wMin = 75.5;
  const wMax = 79.5;
  const y = (w: number) => 112 - ((w - wMin) / (wMax - wMin)) * 100;
  const points = weights.map((w, i) => `${(i * (300 / 7)).toFixed(1)},${y(w).toFixed(1)}`).join(' ');
  const areaPoints = `0,120 ${points} 300,120`;

  const avgKcal = Math.round(kcalWeek.reduce((a, b) => a + b, 0) / 7);

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
            {kcalWeek.map((v, i) => (
              <View key={i} style={styles.barCol}>
                <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end' }}>
                  <View
                    style={[
                      styles.bar,
                      { height: `${(v / maxBar) * 100}%`, backgroundColor: i === 6 ? colors.lime : colors.black },
                    ]}
                  />
                </View>
                <Text style={styles.barDay}>{DIAS[i]}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.meta}>La línea marca tu objetivo de {P.kcal.toLocaleString('es-ES')} kcal</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatTile label="Media diaria" value={avgKcal.toLocaleString('es-ES')} note="kcal · últimos 7 días" />
          <StatTile label="Proteína media" value="168 g" note="2,15 g por kilo" />
        </View>

        <View style={{ gap: 12 }}>
          <Text style={styles.sectionLabel}>Peso corporal · 8 semanas</Text>
          <View style={{ height: 120 }}>
            <Svg width="100%" height={120} viewBox="0 0 300 120" preserveAspectRatio="none">
              <Polygon points={areaPoints} fill={colors.lime} opacity={0.5} />
              <Polyline points={points} fill="none" stroke={colors.black} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </Svg>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.meta}>hace 8 sem · 76,4 kg</Text>
            <Text style={styles.meta}>hoy · {app.profile.peso},0 kg</Text>
          </View>
        </View>

        <View style={styles.aiCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.aiDot} />
            <Text style={styles.aiKicker}>Ajuste de la IA</Text>
          </View>
          <Text style={styles.aiText}>
            Llevas tres semanas subiendo 0,35 kg por semana con la proteína cumplida al 94%. Puedo subir 90 kcal de
            carbohidratos en los días de entrenamiento de pierna.
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
  aiCard: { padding: 18, borderRadius: 20, backgroundColor: colors.black, gap: 9 },
  aiDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.lime },
  aiKicker: { fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: '#a5a5aa', fontFamily: font.medium },
  aiText: { fontSize: 14, lineHeight: 20, color: '#e7e7ea', fontFamily: font.regular },
  recalcBtn: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.lime },
  recalcBtnText: { fontSize: 13, fontFamily: font.semibold, color: colors.black },
});
