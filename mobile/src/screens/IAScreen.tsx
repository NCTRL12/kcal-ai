import React, { useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatMessage, useApp } from '../state/AppContext';
import { colors, font, radius } from '../theme/theme';

const PROMPTS = [
  'Súbeme 200 kcal',
  'Dame una cena de 700 kcal',
  'No soporto el brócoli',
  '¿Cuánta proteína me falta?',
  'Soy intolerante a la lactosa',
];

export default function IAScreen() {
  const app = useApp();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = (text?: string) => {
    app.sendMessage(text);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Asistente</Text>
            <Text style={styles.h1}>Dile qué quieres</Text>
          </View>
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Activa</Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={app.chat}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingHorizontal: 22, paddingVertical: 8, gap: 12 }}
          renderItem={({ item }) => <Bubble message={item} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={app.iaThinking ? <ThinkingDots /> : null}
        />

        <View style={styles.promptsRow}>
          <FlatList
            data={PROMPTS}
            keyExtractor={(p) => p}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingHorizontal: 22 }}
            renderItem={({ item }) => (
              <Pressable onPress={() => send(item)} style={styles.promptChip}>
                <Text style={styles.promptChipText}>{item}</Text>
              </Pressable>
            )}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={app.draft}
            onChangeText={app.setDraft}
            placeholder="Sube 200 kcal, quítame el arroz…"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            onSubmitEditing={() => send()}
            returnKeyType="send"
          />
          <Pressable onPress={() => send()} style={styles.sendBtn}>
            <Text style={{ color: colors.lime, fontSize: 17, fontFamily: font.semibold }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message: m }: { message: ChatMessage }) {
  const isUser = m.role === 'user';
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', gap: 8 }}>
      {!!m.text && (
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isUser ? colors.black : colors.fillSoft,
              borderTopLeftRadius: isUser ? 18 : 6,
              borderTopRightRadius: isUser ? 6 : 18,
            },
          ]}
        >
          <Text style={{ color: isUser ? colors.white : colors.black, fontSize: 14, lineHeight: 21, fontFamily: font.regular }}>{m.text}</Text>
        </View>
      )}
      {!!m.meal && <MealCard meal={m.meal} />}
      {!!m.change && (
        <View style={styles.receipt}>
          <View style={styles.receiptCheck}>
            <Text style={{ color: colors.lime, fontSize: 12 }}>✓</Text>
          </View>
          <Text style={styles.receiptText}>{m.change}</Text>
        </View>
      )}
    </View>
  );
}

function MealCard({ meal }: { meal: NonNullable<ChatMessage['meal']> }) {
  const app = useApp();
  const [added, setAdded] = React.useState(false);
  return (
    <View style={styles.mealCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <Text style={styles.mealCardName}>{meal.name}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.mealCardKcal}>{meal.kcal}</Text>
          <Text style={styles.mealCardKcalUnit}>kcal</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {meal.items.map((it) => (
          <View key={it} style={styles.mealItemChip}>
            <Text style={styles.mealItemText}>{it}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <Text style={styles.mealCardMacros}>{meal.p} g de proteína · {meal.slot.toLowerCase()}</Text>
        <Pressable
          onPress={() => {
            if (added) return;
            app.addBuiltMeal(meal);
            setAdded(true);
          }}
          style={[styles.addBtn, added && { opacity: 0.5 }]}
        >
          <Text style={styles.addBtnText}>{added ? 'Añadido' : 'Añadir al diario'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ThinkingDots() {
  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 4, paddingHorizontal: 2 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.thinkDot} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  kicker: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint, marginBottom: 5, fontFamily: font.medium },
  h1: { fontSize: 27, fontFamily: font.semibold, letterSpacing: -0.6, color: colors.black },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.lime },
  activeDot: { width: 6, height: 6, borderRadius: 6, backgroundColor: colors.black },
  activeText: { fontSize: 11, fontFamily: font.semibold, color: colors.black },
  bubble: { maxWidth: '84%', paddingHorizontal: 15, paddingVertical: 13, borderRadius: 18 },
  receipt: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 16, backgroundColor: colors.lime, width: '100%' },
  receiptCheck: { width: 22, height: 22, borderRadius: 999, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  receiptText: { fontSize: 12.5, fontFamily: font.semibold, color: colors.black, flex: 1, lineHeight: 17 },
  mealCard: { width: '100%', borderRadius: 20, borderWidth: 1.5, borderColor: colors.black, padding: 16, gap: 13 },
  mealCardName: { flex: 1, fontSize: 16, fontFamily: font.semibold, letterSpacing: -0.2, color: colors.black, lineHeight: 20 },
  mealCardKcal: { fontSize: 20, fontFamily: font.semibold, letterSpacing: -0.3, color: colors.black },
  mealCardKcalUnit: { fontSize: 10, color: colors.textFaint },
  mealItemChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.fillSoft },
  mealItemText: { fontSize: 11.5, color: '#3c3c40', fontFamily: font.regular },
  mealCardMacros: { fontSize: 11.5, color: colors.textFaint, flex: 1, fontFamily: font.regular },
  addBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.black },
  addBtnText: { color: colors.white, fontSize: 12.5, fontFamily: font.semibold },
  thinkDot: { width: 6, height: 6, borderRadius: 6, backgroundColor: '#c9c9ce' },
  promptsRow: { paddingTop: 8 },
  promptChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.white },
  promptChipText: { fontSize: 12, fontFamily: font.medium, color: '#3c3c40' },
  inputRow: { flexDirection: 'row', gap: 9, alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10 },
  input: { flex: 1, height: 48, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.borderSoft, backgroundColor: '#fafafa', paddingHorizontal: 18, fontSize: 14, color: colors.black, fontFamily: font.regular },
  sendBtn: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
});
