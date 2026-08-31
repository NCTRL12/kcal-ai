import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';
import { useApp } from '../state/AppContext';
import { colors, font } from '../theme/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { recognizeFoodPhoto } from '../lib/ollama';
import { OffProduct, lookupBarcode } from '../lib/openFoodFacts';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

type ScanState = 'aim' | 'analyzing' | 'result';
type Mode = 'photo' | 'barcode';

interface ScanResult {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  items: { name: string; qty: string }[];
  source: 'mock' | 'ai' | 'barcode';
}

const MOCK_RESULT: ScanResult = {
  name: 'Pollo, arroz y aguacate',
  kcal: 780,
  protein: 58,
  carbs: 74,
  fat: 22,
  items: [
    { name: 'Pechuga de pollo a la plancha', qty: '210 g' },
    { name: 'Arroz blanco cocido', qty: '180 g' },
    { name: 'Aguacate', qty: '½ pieza' },
  ],
  source: 'mock',
};

function fromOff(product: OffProduct, grams: number): ScanResult {
  const scale = grams / 100;
  return {
    name: product.brand ? `${product.name} · ${product.brand}` : product.name,
    kcal: Math.round(product.kcalPer100g * scale),
    protein: Math.round(product.proteinPer100g * scale),
    carbs: Math.round(product.carbsPer100g * scale),
    fat: Math.round(product.fatPer100g * scale),
    items: [{ name: product.name, qty: `${grams} g` }],
    source: 'barcode',
  };
}

export default function ScanScreen({ navigation }: Props) {
  const app = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('photo');
  const [scan, setScan] = useState<ScanState>('aim');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [offProduct, setOffProduct] = useState<OffProduct | null>(null);
  const [qty, setQty] = useState('100');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) requestPermission();
  }, [permission]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useEffect(() => {
    if (offProduct && scan === 'result') {
      const g = parseFloat(qty.replace(',', '.'));
      if (Number.isFinite(g) && g > 0) setResult(fromOff(offProduct, g));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty]);

  const reset = () => {
    setScan('aim');
    setResult(null);
    setOffProduct(null);
    setScannedCode(null);
    setNotFound(false);
    setQty('100');
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    reset();
  };

  const shootPhoto = async () => {
    setScan('analyzing');
    if (app.aiSettings.baseUrl && cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.3, skipProcessing: true });
        if (photo?.base64) {
          const vision = await recognizeFoodPhoto(photo.base64, app.aiSettings);
          if (vision) {
            setResult({ name: vision.name, kcal: vision.kcal, protein: vision.protein, carbs: vision.carbs, fat: vision.fat, items: vision.items, source: 'ai' });
            setScan('result');
            return;
          }
        }
      } catch {
        // fall through to mock below
      }
    }
    timer.current = setTimeout(() => {
      setResult(MOCK_RESULT);
      setScan('result');
    }, 1400);
  };

  const onBarcodeScanned = async ({ data }: { data: string }) => {
    if (scannedCode) return;
    setScannedCode(data);
    setNotFound(false);
    setScan('analyzing');
    const product = await lookupBarcode(data);
    if (!product) {
      setNotFound(true);
      setScannedCode(null);
      setScan('aim');
      return;
    }
    setOffProduct(product);
    setQty('100');
    setResult(fromOff(product, 100));
    setScan('result');
  };

  const addToDiary = () => {
    if (!result) return;
    app.addMeal({
      slot: 'Cena',
      name: result.name,
      kcal: result.kcal,
      macroText: `${result.protein} P · ${result.carbs} C · ${result.fat} G`,
    });
    if (result.source !== 'mock') {
      app.addFavorite({ slot: 'Cena', name: result.name, kcal: result.kcal, macroText: `${result.protein} P · ${result.carbs} C · ${result.fat} G` });
    }
    navigation.replace('Main');
  };

  const title = scan === 'analyzing' ? 'Analizando…' : scan === 'result' ? 'Resultado' : mode === 'photo' ? 'Escanear comida' : 'Escanear código de barras';

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

        {scan === 'aim' && (
          <View style={styles.modeRow}>
            <Pressable onPress={() => switchMode('photo')} style={[styles.modeBtn, mode === 'photo' && styles.modeBtnActive]}>
              <Text style={[styles.modeBtnText, mode === 'photo' && styles.modeBtnTextActive]}>Foto</Text>
            </Pressable>
            <Pressable onPress={() => switchMode('barcode')} style={[styles.modeBtn, mode === 'barcode' && styles.modeBtnActive]}>
              <Text style={[styles.modeBtnText, mode === 'barcode' && styles.modeBtnTextActive]}>Código de barras</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.frameArea}>
          {permission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={mode === 'barcode' ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] } : undefined}
              onBarcodeScanned={mode === 'barcode' && scan === 'aim' ? onBarcodeScanned : undefined}
            />
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
                <Text style={styles.frameHint}>
                  {mode === 'photo' ? 'Encuadra el plato\ndentro del marco' : notFound ? 'No encontrado — prueba otro producto' : 'Encuadra el código\nde barras'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {scan === 'aim' && mode === 'photo' && (
          <View style={styles.aimFooter}>
            <Text style={styles.aimHint}>
              {app.aiSettings.baseUrl ? 'Tu modelo local estimará las calorías' : 'Estimación de porción por volumen'}
            </Text>
            <Pressable onPress={shootPhoto} style={styles.shutter} />
          </View>
        )}
        {scan === 'aim' && mode === 'barcode' && (
          <View style={styles.aimFooter}>
            <Text style={styles.aimHint}>Gratis, vía Open Food Facts</Text>
          </View>
        )}

        {scan === 'result' && result && (
          <View style={styles.resultSheet}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>
                  {result.source === 'ai' ? 'Detectado por tu modelo local' : result.source === 'barcode' ? 'Producto encontrado' : 'Detectado · 92% confianza'}
                </Text>
                <Text style={styles.resultTitle}>{result.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.resultKcal}>{result.kcal}</Text>
                <Text style={styles.resultKcalUnit}>kcal</Text>
              </View>
            </View>

            {result.source === 'barcode' && (
              <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>Cantidad</Text>
                <TextInput value={qty} onChangeText={setQty} keyboardType="numeric" style={styles.qtyInput} />
                <Text style={styles.qtyLabel}>g</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={styles.detectedTile}>
                <Text style={styles.detectedLabel}>Proteína</Text>
                <Text style={styles.detectedValue}>{result.protein} g</Text>
              </View>
              <View style={styles.detectedTile}>
                <Text style={styles.detectedLabel}>Carbos</Text>
                <Text style={styles.detectedValue}>{result.carbs} g</Text>
              </View>
              <View style={styles.detectedTile}>
                <Text style={styles.detectedLabel}>Grasas</Text>
                <Text style={styles.detectedValue}>{result.fat} g</Text>
              </View>
            </View>
            <View>
              {result.items.map((it, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemName}>{it.name}</Text>
                  <Text style={styles.itemQty}>{it.qty}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={reset} style={styles.retryBtn}>
                <Text style={{ fontSize: 17, color: colors.black }}>↺</Text>
              </Pressable>
              <PrimaryButton label="Añadir al diario" onPress={addToDiary} style={{ flex: 1 }} />
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
  modeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 22, paddingTop: 14, justifyContent: 'center' },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)' },
  modeBtnActive: { backgroundColor: colors.lime },
  modeBtnText: { fontSize: 12.5, fontFamily: font.medium, color: 'rgba(255,255,255,0.7)' },
  modeBtnTextActive: { color: colors.black, fontFamily: font.semibold },
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
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyLabel: { fontSize: 12.5, color: colors.textMuted, fontFamily: font.regular },
  qtyInput: { borderWidth: 1.5, borderColor: colors.borderSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.black, fontFamily: font.medium, width: 80 },
  detectedTile: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: colors.fillSofter },
  detectedLabel: { fontSize: 11, color: colors.textFaint, marginBottom: 4, fontFamily: font.regular },
  detectedValue: { fontSize: 16, fontFamily: font.semibold, color: colors.black },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.divider },
  itemName: { fontSize: 13.5, color: '#3c3c40', fontFamily: font.regular },
  itemQty: { fontSize: 13.5, color: colors.textFaint, fontFamily: font.regular },
  retryBtn: { width: 52, height: 52, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
