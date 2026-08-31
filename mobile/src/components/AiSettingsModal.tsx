import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, font, radius } from '../theme/theme';
import { useApp } from '../state/AppContext';
import { pingOllama } from '../lib/ollama';
import { PrimaryButton } from './PrimaryButton';

export function AiSettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const app = useApp();
  const [baseUrl, setBaseUrl] = useState(app.aiSettings.baseUrl);
  const [model, setModel] = useState(app.aiSettings.model);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  useEffect(() => {
    if (visible) {
      setBaseUrl(app.aiSettings.baseUrl);
      setModel(app.aiSettings.model);
      setStatus('idle');
    }
  }, [visible]);

  const test = async () => {
    setChecking(true);
    const ok = await pingOllama({ baseUrl, model });
    setStatus(ok ? 'ok' : 'fail');
    setChecking(false);
  };

  const save = () => {
    app.setAiSettings({ baseUrl: baseUrl.trim(), model: model.trim() || 'llama3.1' });
    onClose();
  };

  const clear = () => {
    app.setAiSettings({ baseUrl: '', model: model.trim() || 'llama3.1' });
    setBaseUrl('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <Text style={styles.title}>Modelo local</Text>
          <Text style={styles.body}>
            Conecta un modelo que corra en tu ordenador con Ollama (gratis, sin nube). En el ordenador: instala Ollama,
            ejecuta <Text style={styles.mono}>ollama pull llama3.1</Text> y luego{' '}
            <Text style={styles.mono}>OLLAMA_HOST=0.0.0.0 ollama serve</Text>. Aquí pon la IP de ese ordenador en tu wifi.
          </Text>

          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Servidor</Text>
            <TextInput
              value={baseUrl}
              onChangeText={setBaseUrl}
              placeholder="http://192.168.1.42:11434"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Modelo</Text>
            <TextInput
              value={model}
              onChangeText={setModel}
              placeholder="llama3.1"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          {status !== 'idle' && (
            <Text style={{ fontSize: 12.5, color: status === 'ok' ? '#4d5406' : '#b3261e', fontFamily: font.medium }}>
              {status === 'ok' ? '✓ Conectado' : '✕ No se pudo conectar'}
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={test} disabled={!baseUrl || checking} style={[styles.secondaryBtn, (!baseUrl || checking) && { opacity: 0.5 }]}>
              <Text style={styles.secondaryBtnText}>{checking ? 'Probando…' : 'Probar conexión'}</Text>
            </Pressable>
            <PrimaryButton label="Guardar" onPress={save} style={{ flex: 1 }} />
          </View>
          <Pressable onPress={clear} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontSize: 12.5, color: colors.textFaint, fontFamily: font.medium }}>Desconectar y usar el asistente básico</Text>
          </Pressable>
          <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ fontSize: 13, color: colors.black, fontFamily: font.semibold }}>Cerrar</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 16 },
  title: { fontSize: 20, fontFamily: font.semibold, color: colors.black },
  body: { fontSize: 12.5, lineHeight: 18, color: colors.textMuted, fontFamily: font.regular },
  mono: { fontFamily: font.semibold, color: colors.black },
  label: { fontSize: 11.5, color: colors.textFaint, fontFamily: font.regular },
  input: {
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.black,
    fontFamily: font.regular,
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 13, fontFamily: font.semibold, color: colors.black },
});
