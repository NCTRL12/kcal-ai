import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { MainTabParamList, RootStackParamList } from '../../App';
import { useApp } from '../state/AppContext';
import { colors, font } from '../theme/theme';
import { findFood } from '../lib/nutrition';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Hoy'>,
  NativeStackScreenProps<RootStackParamList>
>;

const R = 52;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function HoyScreen({ navigation }: Props) {
  const app = useApp();
  const P = app.plan;
  const consumido = app.meals.reduce((t, m) => t + m.kcal, 0);
  const restante = Math.max(0, P.kcal - consumido);
  const pct = Math.min(1, consumido / P.kcal);

  const eatenP = app.meals.reduce((t, m) => t + (parseInt(m.macroText, 10) || 0), 0);
  const eatenC = Math.round((consumido * 0.42) / 4);
  const eatenG = Math.round((consumido * 0.26) / 9);
  const macros = [
    { label: 'Proteína', eaten: eatenP, goal: P.prot },
    { label: 'Carbos', eaten: eatenC, goal: P.carb },
    { label: 'Grasas', eaten: eatenG, goal: P.fat },
  ];

  const excluded = [
    ...(app.dislikes.map((id) => findFood(id)?.label).filter(Boolean) as string[]),
    ...app.extraDislikes,
  ];
  const nudge = `Te faltan ${Math.max(0, P.prot - eatenP)} g de proteína y ${restante.toLocaleString('es-ES')} kcal${excluded.length ? ', sin ' + excluded.join(' ni ').toLowerCase() : ''}.`;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.dateLabel}>Hoy</Text>
            <Text style={styles.h1}>Hoy</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.objLabel}>Objetivo</Text>
            <Text style={styles.objValue}>{P.kcal.toLocaleString('es-ES')} kcal</Text>
          </View>
        </View>

        <View style={styles.ringRow}>
          <View style={styles.ringWrap}>
            <Svg width={150} height={150} viewBox="0 0 120 120" style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={60} cy={60} r={R} fill="none" stroke={colors.track} strokeWidth={12} />
              <Circle
                cx={60}
                cy={60}
                r={R}
                fill="none"
                stroke={colors.lime}
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={CIRCUMFERENCE * (1 - pct)}
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={styles.ringNum}>{restante.toLocaleString('es-ES')}</Text>
              <Text style={styles.ringLabel}>KCAL RESTANTES</Text>
            </View>
          </View>
          <View style={{ flex: 1, gap: 14 }}>
            {macros.map((m) => (
              <View key={m.label} style={{ gap: 6 }}>
                <View style={styles.macroRow}>
                  <Text style={styles.macroLabel}>{m.label}</Text>
                  <Text style={styles.macroValue}>{m.eaten} / {m.goal} g</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.trackFill, { width: `${Math.min(100, Math.round((m.eaten / m.goal) * 100))}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <Pressable onPress={() => navigation.navigate('Scan')} style={styles.scanCta}>
          <View style={styles.scanIcon}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.lime} strokeWidth={1.7}>
              <RectIcon />
            </Svg>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.scanTitle}>Escanear comida</Text>
            <Text style={styles.scanSub}>Una foto y la IA estima kcal y macros</Text>
          </View>
          <Text style={{ fontSize: 18, color: colors.black }}>→</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('IA')} style={styles.nudgeRow}>
          <View style={styles.iaBadge}>
            <Text style={{ fontSize: 10, fontFamily: font.bold, color: colors.black }}>IA</Text>
          </View>
          <Text style={styles.nudgeText}>
            {nudge} <Text style={styles.nudgeLink}>Pídeme una cena</Text>
          </Text>
        </Pressable>

        <View>
          <View style={styles.mealsHeader}>
            <Text style={styles.sectionTitle}>Comidas de hoy</Text>
            <Text style={styles.sectionMeta}>{consumido.toLocaleString('es-ES')} kcal</Text>
          </View>
          {app.meals.map((meal, i) => (
            <View key={i} style={styles.mealRow}>
              <View style={styles.mealSlot}>
                <Text style={styles.mealSlotText}>{meal.slot}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
                <Text style={styles.mealMacro}>{meal.macroText}</Text>
              </View>
              <Text style={styles.mealKcal}>{meal.kcal}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RectIcon() {
  return (
    <>
      <Rect x={3} y={6} width={18} height={14} rx={3} />
      <Circle cx={12} cy={13} r={3.6} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 24, gap: 22 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  dateLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint, marginBottom: 5, fontFamily: font.medium },
  h1: { fontSize: 27, fontFamily: font.semibold, letterSpacing: -0.6, color: colors.black },
  objLabel: { fontSize: 11.5, color: colors.textMuted, fontFamily: font.regular },
  objValue: { fontSize: 14, fontFamily: font.semibold, color: colors.black },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  ringWrap: { width: 150, height: 150 },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 2 },
  ringNum: { fontSize: 31, fontFamily: font.semibold, letterSpacing: -0.9, color: colors.black },
  ringLabel: { fontSize: 10.5, color: colors.textFaint, letterSpacing: 0.5 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel: { fontSize: 12, color: colors.textMuted, fontFamily: font.regular },
  macroValue: { fontSize: 12, fontFamily: font.semibold, color: colors.black },
  track: { height: 5, borderRadius: 5, backgroundColor: colors.track, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 5, backgroundColor: colors.black },
  scanCta: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: colors.lime },
  scanIcon: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  scanTitle: { fontSize: 15, fontFamily: font.semibold, color: colors.black },
  scanSub: { fontSize: 12, color: colors.limeDeepText, marginTop: 2, fontFamily: font.regular },
  nudgeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iaBadge: { width: 22, height: 22, borderRadius: 999, borderWidth: 1.5, borderColor: colors.black, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  nudgeText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.textMuted, fontFamily: font.regular },
  nudgeLink: { color: colors.black, fontFamily: font.semibold, textDecorationLine: 'underline' },
  mealsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  sectionTitle: { fontSize: 15.5, fontFamily: font.semibold, color: colors.black },
  sectionMeta: { fontSize: 12, color: colors.textFaint, fontFamily: font.regular },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.divider },
  mealSlot: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.fillSoft, alignItems: 'center', justifyContent: 'center' },
  mealSlotText: { fontSize: 9, color: colors.textGhost, textAlign: 'center' },
  mealName: { fontSize: 14.5, fontFamily: font.medium, color: colors.black },
  mealMacro: { fontSize: 11.5, color: colors.textFaint, marginTop: 3, fontFamily: font.regular },
  mealKcal: { fontSize: 14.5, fontFamily: font.semibold, color: colors.black },
});
