import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';
import { useApp } from '../state/AppContext';
import { colors, font, radius } from '../theme/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { ACT_LABELS, DIETS, FOODS, Goal, RITMOS, goalNote } from '../lib/nutrition';
import { generatePlanNote } from '../lib/ollama';

type Props = NativeStackScreenProps<RootStackParamList, 'Plan'>;

const GOALS: { id: Goal; label: string; note: string }[] = [
  { id: 'perder', label: 'Perder grasa', note: 'Déficit controlado, proteína alta para conservar músculo' },
  { id: 'mantener', label: 'Mantener', note: 'Recomposición: mismas calorías, más proteína' },
  { id: 'ganar', label: 'Ganar masa muscular', note: 'Superávit ajustado al volumen de entrenamiento' },
  { id: 'custom', label: 'Personalizado', note: 'Escríbelo con tus palabras y la IA lo traduce a números' },
];

export default function PlanScreen({ navigation }: Props) {
  const app = useApp();
  const [step, setStep] = useState(1);

  const next = () => {
    if (step < 4) setStep(step + 1);
    else {
      app.completePlan();
      navigation.replace('Main');
    }
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 12 }}>
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.progressBar, { backgroundColor: i <= step ? colors.black : colors.bg }]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>Plan IA · paso {step} de 4</Text>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {step === 1 && <StepBasics />}
          {step === 2 && <StepGoal />}
          {step === 3 && <StepPreferences />}
          {step === 4 && <StepResult />}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        {step > 1 && (
          <Pressable onPress={back} style={styles.backBtn}>
            <Text style={{ fontSize: 20, color: colors.black }}>←</Text>
          </Pressable>
        )}
        <PrimaryButton label={step === 4 ? 'Empezar a contar' : 'Continuar'} onPress={next} style={{ flex: 1 }} />
      </View>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (t: string) => void }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        style={styles.fieldInput}
        underlineColorAndroid="transparent"
      />
    </View>
  );
}

function StepBasics() {
  const app = useApp();
  const p = app.profile;
  return (
    <View style={{ gap: 22 }}>
      <Text style={styles.h1}>Cuéntame sobre ti y calculo tus calorías.</Text>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="Edad" value={p.edad} onChangeText={(t) => app.setProfileField('edad', t)} />
          <Field label="Peso (kg)" value={p.peso} onChangeText={(t) => app.setProfileField('peso', t)} />
          <Field label="Altura" value={p.altura} onChangeText={(t) => app.setProfileField('altura', t)} />
        </View>

        <View style={{ gap: 8, marginTop: 6 }}>
          <Text style={styles.fieldLabel}>Sexo</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ChoicePill label="Hombre" active={p.sexo === 'h'} onPress={() => app.setSexo('h')} flex />
            <ChoicePill label="Mujer" active={p.sexo === 'm'} onPress={() => app.setSexo('m')} flex />
          </View>
        </View>

        <View style={{ gap: 8, marginTop: 6 }}>
          <Text style={styles.fieldLabel}>Entrenamientos por semana</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {ACT_LABELS.map((label, i) => (
              <ChoicePill key={label} label={label} active={p.act === i} onPress={() => app.setAct(i)} flex small />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function StepGoal() {
  const app = useApp();
  const p = app.profile;
  return (
    <View style={{ gap: 22 }}>
      <Text style={styles.h1}>¿Cuál es tu objetivo?</Text>
      <View style={{ gap: 10 }}>
        {GOALS.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => app.setGoal(g.id)}
            style={[styles.goalCard, { borderColor: p.goal === g.id ? colors.black : '#e4e4e8', backgroundColor: p.goal === g.id ? colors.lime : colors.white }]}
          >
            <Text style={styles.goalLabel}>{g.label}</Text>
            <Text style={styles.goalNote}>{g.note}</Text>
          </Pressable>
        ))}
      </View>
      {p.goal === 'custom' && (
        <View style={styles.customBox}>
          <Text style={styles.kicker}>Escríbelo tú</Text>
          <TextInput
            value={p.customGoal}
            onChangeText={(t) => app.setCustomGoal(t)}
            placeholder="ej. bajar al 12% de grasa antes de octubre"
            placeholderTextColor={colors.textFaint}
            style={styles.customInput}
          />
          <Text style={styles.customHint}>La IA lo interpreta y ajusta calorías, macros y sugerencias a lo que escribas.</Text>
        </View>
      )}
      <View style={{ gap: 10, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.fieldLabel}>Ritmo semanal</Text>
          <Text style={[styles.fieldLabel, { color: colors.black, fontFamily: font.semibold }]}>{RITMOS[p.ritmo]}</Text>
        </View>
        <Slider
          minimumValue={0}
          maximumValue={4}
          step={1}
          value={p.ritmo}
          onValueChange={(v) => app.setRitmo(v)}
          minimumTrackTintColor={colors.black}
          maximumTrackTintColor={colors.border}
        />
      </View>
    </View>
  );
}

function StepPreferences() {
  const app = useApp();
  const liked = app.likes.map((id) => FOODS.find((f) => f.id === id)?.label).filter(Boolean) as string[];
  const excluded = [
    ...app.dislikes.map((id) => FOODS.find((f) => f.id === id)?.label).filter(Boolean),
    ...app.extraDislikes,
  ] as string[];
  const resumen =
    (liked.length ? `Priorizo ${liked.slice(0, 4).join(', ').toLowerCase()}${liked.length > 4 ? ' y ' + (liked.length - 4) + ' más' : ''}. ` : '') +
    (excluded.length ? `Nunca te sugeriré ${excluded.join(', ').toLowerCase()}.` : 'No has excluido nada todavía.') +
    (app.diets.length ? ' ' + app.diets.join(' · ') + '.' : '');

  return (
    <View style={{ gap: 24 }}>
      <Text style={styles.h1}>Qué te gusta comer y qué no soportas.</Text>
      <View style={{ gap: 11 }}>
        <Text style={styles.hintSmall}>
          Toca una vez para <Text style={{ color: colors.black, fontFamily: font.semibold }}>me gusta</Text>, dos para{' '}
          <Text style={{ color: colors.black, fontFamily: font.semibold }}>no lo soporto</Text>
        </Text>
        <View style={styles.chipRow}>
          {FOODS.map((f) => {
            const like = app.likes.includes(f.id);
            const no = app.dislikes.includes(f.id);
            return (
              <Pressable
                key={f.id}
                onPress={() => app.cycleFood(f.id)}
                style={[
                  styles.foodChip,
                  {
                    borderColor: like ? colors.black : no ? '#c9c9ce' : colors.borderSoft,
                    backgroundColor: like ? colors.lime : no ? colors.track : colors.white,
                  },
                ]}
              >
                <Text style={[styles.foodChipText, { color: no ? colors.textGhost : colors.black, textDecorationLine: no ? 'line-through' : 'none' }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ gap: 11 }}>
        <Text style={styles.hintSmall}>Restricciones</Text>
        <View style={styles.chipRow}>
          {DIETS.map((d) => {
            const active = app.diets.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => app.toggleDiet(d)}
                style={[styles.foodChip, { borderColor: active ? colors.black : colors.borderSoft, backgroundColor: active ? colors.lime : colors.white }]}
              >
                <Text style={styles.foodChipText}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={styles.summaryText}>{resumen}</Text>
    </View>
  );
}

function StepResult() {
  const app = useApp();
  const P = app.plan;
  const fallbackNote = goalNote(app.profile, P);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const connected = !!app.aiSettings.baseUrl;

  useEffect(() => {
    if (!connected || app.profile.goal !== 'custom' || !app.profile.customGoal) {
      setAiNote(null);
      return;
    }
    let cancelled = false;
    setAiLoading(true);
    const prompt = [
      `Objetivo del usuario, en sus palabras: "${app.profile.customGoal}"`,
      `Plan calculado: ${P.kcal} kcal/día, ${P.prot} g proteína, ${P.carb} g carbos, ${P.fat} g grasas (gasto estimado ${P.tdee} kcal).`,
      'Explícale en 2-3 frases cómo este plan encaja con lo que ha pedido.',
    ].join('\n');
    generatePlanNote(prompt, app.aiSettings).then((text) => {
      if (!cancelled) {
        setAiNote(text);
        setAiLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, app.profile.goal, app.profile.customGoal, P.kcal]);

  const note = aiNote || fallbackNote;

  return (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View style={styles.pulseDot} />
        <Text style={{ fontSize: 12.5, color: colors.textMuted, fontFamily: font.regular }}>
          {aiLoading ? 'Tu modelo local está redactando la explicación…' : connected ? 'Calculado con tu modelo local' : 'Calculado por la IA con tus datos'}
        </Text>
      </View>
      <Text style={styles.h1}>Tu plan diario</Text>
      <View style={styles.planCard}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={styles.planKcal}>{P.kcal.toLocaleString('es-ES')}</Text>
          <Text style={styles.planKcalUnit}>kcal / día</Text>
        </View>
        <View style={styles.planDivider} />
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <MacroCol label="Proteína" value={`${P.prot} g`} />
          <MacroCol label="Carbos" value={`${P.carb} g`} />
          <MacroCol label="Grasas" value={`${P.fat} g`} />
        </View>
      </View>
      <Text style={styles.planNote}>{note}</Text>
    </View>
  );
}

function MacroCol({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: '#a5a5aa', marginBottom: 4, fontFamily: font.regular }}>{label}</Text>
      <Text style={{ fontSize: 19, fontFamily: font.semibold, color: colors.white }}>{value}</Text>
    </View>
  );
}

function ChoicePill({
  label,
  active,
  onPress,
  flex,
  small,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  flex?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        small ? styles.pillSmall : styles.pill,
        flex && { flex: 1 },
        { borderColor: active ? colors.black : colors.border, backgroundColor: active ? colors.lime : colors.white },
      ]}
    >
      <Text style={[small ? styles.pillSmallText : styles.pillText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  progressRow: { flexDirection: 'row', gap: 5, marginTop: 4 },
  progressBar: { height: 3, flex: 1, borderRadius: 3 },
  stepLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint, marginTop: 20, marginBottom: 20, fontFamily: font.medium },
  h1: { fontSize: 31, fontFamily: font.semibold, letterSpacing: -0.7, lineHeight: 34, color: colors.black },
  fieldLabel: { fontSize: 11.5, color: colors.textFaint, fontFamily: font.regular },
  fieldInput: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    fontFamily: font.semibold,
    fontSize: 27,
    color: colors.black,
    paddingBottom: 8,
    paddingHorizontal: 0,
  },
  pill: { flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' },
  pillText: { fontFamily: font.medium, fontSize: 14, color: colors.black },
  pillSmall: { paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  pillSmallText: { fontFamily: font.medium, fontSize: 13.5, color: colors.black },
  goalCard: { padding: 18, borderRadius: 18, borderWidth: 1.5, gap: 5 },
  goalLabel: { fontSize: 16.5, fontFamily: font.semibold, color: colors.black },
  goalNote: { fontSize: 12.5, color: colors.textMuted, lineHeight: 17, fontFamily: font.regular },
  customBox: { gap: 9, padding: 16, borderRadius: 18, borderWidth: 1.5, borderColor: colors.black, backgroundColor: '#fafafa' },
  kicker: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint, fontFamily: font.medium },
  customInput: { borderBottomWidth: 1.5, borderBottomColor: colors.border, fontFamily: font.medium, fontSize: 15, color: colors.black, paddingBottom: 9 },
  customHint: { fontSize: 12, color: colors.textMuted, lineHeight: 17, fontFamily: font.regular },
  hintSmall: { fontSize: 12, color: colors.textFaint, fontFamily: font.regular },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  foodChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1.5 },
  foodChipText: { fontFamily: font.medium, fontSize: 13 },
  summaryText: { fontSize: 12.5, color: colors.textMuted, lineHeight: 19, fontFamily: font.regular },
  pulseDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.lime },
  planCard: { borderRadius: 22, backgroundColor: colors.black, padding: 24, gap: 16 },
  planKcal: { fontSize: 52, fontFamily: font.semibold, letterSpacing: -1.5, color: colors.lime, lineHeight: 52 },
  planKcalUnit: { fontSize: 13, color: '#a5a5aa', fontFamily: font.regular },
  planDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  planNote: { fontSize: 13, lineHeight: 19, color: colors.textMuted, fontFamily: font.regular },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 26, paddingTop: 16, paddingBottom: 20, backgroundColor: colors.white },
  backBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
