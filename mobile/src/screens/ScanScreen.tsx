import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';
import { useApp } from '../state/AppContext';
import { colors, font } from '../theme/theme';
import { PrimaryButton } from '../components/PrimaryButton';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

type ScanState = 'aim' | 'analyzing' | 'result';

const DETECTED = [
  { label: 'Proteína', value: '58 g' },
  { label: 'Carbos', value: '74 g' },
  { label: 'Grasas', value: '22 g' },
];
const ITEMS = [
  { name: 'Pechuga de pollo a la plancha', qty: '210 g' },
  { name: 'Arroz blanco cocido', qty: '180 g' },
  { name: 'Aguacate', qty: '½ pieza' },
];
const RESULT_NAME = 'Pollo, arroz y aguacate';
const RESULT_KCAL = 780;

export default function ScanScreen({ navigation }: Props) {
  const app = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [scan, setScan] = useState<ScanState>('aim');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) requestPermission();
  }, [permission]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const shoot = () => {
    setScan('analyzing');
    timer.current = setTimeout(() => setScan('result'), 1700);
  };

  const addMeal = () => {
    app.addMeal({ slot: 'Cena', name: RESULT_NAME, kcal: RESULT_KCAL, macroText: '58 P · 74 C · 22 G' });
    navigation.replace('Main');
  };

  const title = scan === 'analyzing' ? 'Analizando…' : scan === 'result' ? 'Resultado' : 'Escanear comida';

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={{ color: colors.white, fontSize: 17 }}>✕</Text>
          </Pressable>
          <Text style={styles.topTitle}>{title}</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.frameArea}>
          {permission?.granted ? (
            <CameraView style={StyleSheet.absoluteFill} facing="back" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#141416' }]} />
          )}
          <View style={styles.framePad}>
            <View style={styles.frameBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              {scan === 'analyzing' && <ScanLine />}
              <View style={styles.frameCenter}>
                <Text style={styles.frameHint}>Encuadra el plato{'\n'}dentro del marco</Text>
              </View>
            </View>
          </View>
        </View>

        {scan === 'aim' && (
          <View style={styles.aimFooter}>
            <Text style={styles.aimHint}>Estimación de porción por volumen</Text>
            <Pressable onPress={shoot} style={styles.shutter} />
          </View>
        )}

        {scan === 'result' && (
          <View style={styles.resultSheet}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>Detectado · 92% confianza</Text>
                <Text style={styles.resultTitle}>{RESULT_NAME}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.resultKcal}>{RESULT_KCAL}</Text>
                <Text style={styles.resultKcalUnit}>kcal</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {DETECTED.map((d) => (
                <View key={d.label} style={styles.detectedTile}>
                  <Text style={styles.detectedLabel}>{d.label}</Text>
                  <Text style={styles.detectedValue}>{d.value}</Text>
                </View>
              ))}
            </View>
            <View>
              {ITEMS.map((it) => (
                <View key={it.name} style={styles.itemRow}>
                  <Text style={styles.itemName}>{it.name}</Text>
                  <Text style={styles.itemQty}>{it.qty}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setScan('aim')} style={styles.retryBtn}>
                <Text style={{ fontSize: 17, color: colors.black }}>↺</Text>
              </Pressable>
              <PrimaryButton label="Añadir al diario" onPress={addMeal} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function ScanLine() {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [y]);
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [-90, 90] });
  return (
    <Animated.View
      style={[
        styles.scanLine,
        { transform: [{ translateY }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8 },
  closeBtn: { width: 34, height: 34, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 12.5, color: 'rgba(255,255,255,0.6)', fontFamily: font.regular },
  frameArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  framePad: { width: 260, height: 260 },
  frameBox: { flex: 1, borderRadius: 34, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  corner: { position: 'absolute', width: 44, height: 44, borderColor: colors.lime },
  cornerTL: { top: -1, left: -1, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 34 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 34 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 34 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 34 },
  scanLine: { position: 'absolute', left: 14, right: 14, top: '50%', height: 2, backgroundColor: colors.lime },
  frameCenter: {
    position: 'absolute', top: 34, left: 34, right: 34, bottom: 34, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', padding: 18,
  },
  frameHint: { fontSize: 11.5, color: 'rgba(255,255,255,0.42)', lineHeight: 17, textAlign: 'center', fontFamily: font.regular },
  aimFooter: { paddingHorizontal: 22, paddingBottom: 46, alignItems: 'center', gap: 16 },
  aimHint: { fontSize: 12.5, color: 'rgba(255,255,255,0.55)', fontFamily: font.regular },
  shutter: { width: 74, height: 74, borderRadius: 999, borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: colors.lime },
  resultSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34, gap: 18 },
  kicker: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint, marginBottom: 5, fontFamily: font.medium },
  resultTitle: { fontSize: 22, fontFamily: font.semibold, letterSpacing: -0.5, color: colors.black },
  resultKcal: { fontSize: 27, fontFamily: font.semibold, letterSpacing: -0.6, color: colors.black },
  resultKcalUnit: { fontSize: 10.5, color: colors.textFaint, fontFamily: font.regular },
  detectedTile: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: colors.fillSofter },
  detectedLabel: { fontSize: 11, color: colors.textFaint, marginBottom: 4, fontFamily: font.regular },
  detectedValue: { fontSize: 16, fontFamily: font.semibold, color: colors.black },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.divider },
  itemName: { fontSize: 13.5, color: '#3c3c40', fontFamily: font.regular },
  itemQty: { fontSize: 13.5, color: colors.textFaint, fontFamily: font.regular },
  retryBtn: { width: 52, height: 52, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
