import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BuiltMeal,
  Diet,
  Goal,
  Meal,
  Profile,
  Sexo,
  computePlan,
  findFood,
} from '../lib/nutrition';
import { AssistantAction, runAssistant } from '../lib/ai';
import { AiSettings, DEFAULT_AI_SETTINGS } from '../lib/ollama';

const AI_SETTINGS_KEY = '@kcalai/ai-settings';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text?: string;
  meal?: BuiltMeal;
  change?: string;
  silent?: boolean;
  addedToDiary?: boolean;
}

interface AppState {
  profile: Profile;
  likes: string[];
  dislikes: string[];
  extraDislikes: string[];
  diets: Diet[];
  meals: Meal[];
  chat: ChatMessage[];
  draft: string;
  iaThinking: boolean;
  planReady: boolean;
}

interface AppApi extends AppState {
  plan: ReturnType<typeof computePlan>;
  setProfileField: (key: keyof Profile, value: string) => void;
  setSexo: (sexo: Sexo) => void;
  setAct: (act: number) => void;
  setGoal: (goal: Goal) => void;
  setRitmo: (ritmo: number) => void;
  setCustomGoal: (text: string) => void;
  cycleFood: (foodId: string) => void;
  toggleDiet: (diet: Diet) => void;
  completePlan: () => void;
  addMeal: (meal: Meal) => void;
  addBuiltMeal: (meal: BuiltMeal) => void;
  setDraft: (text: string) => void;
  sendMessage: (text?: string) => Promise<void>;
  aiSettings: AiSettings;
  setAiSettings: (settings: AiSettings) => void;
}

const defaultProfile: Profile = {
  edad: '28',
  peso: '78',
  altura: '180',
  sexo: 'h',
  act: 3,
  goal: 'ganar',
  ritmo: 2,
  customGoal: '',
  kcalDelta: 0,
};

const initialState: AppState = {
  profile: defaultProfile,
  likes: ['pollo', 'arroz', 'huevos', 'aguacate', 'avena', 'yogur'],
  dislikes: ['lentejas'],
  extraDislikes: [],
  diets: [],
  meals: [
    { slot: 'Desayuno', name: 'Avena, plátano y whey', kcal: 520, macroText: '38 P · 72 C · 9 G' },
    { slot: 'Comida', name: 'Salmón con quinoa', kcal: 640, macroText: '44 P · 55 C · 24 G' },
    { slot: 'Snack', name: 'Yogur griego y nueces', kcal: 310, macroText: '24 P · 14 C · 17 G' },
  ],
  chat: [
    {
      id: 'welcome',
      role: 'ai',
      text: 'Soy tu nutricionista de bolsillo. Puedo cambiar tu plan, montarte comidas con lo que te gusta y esquivar lo que no soportas. Dime lo que necesites.',
    },
  ],
  draft: '',
  iaThinking: false,
  planReady: false,
};

const AppCtx = createContext<AppApi | null>(null);

let uid = 0;
const nextId = () => `m${Date.now()}_${uid++}`;

function macroTextFor(kcal: number, protein: number) {
  return `${protein} P · ${Math.round((kcal * 0.4) / 4)} C · ${Math.round((kcal * 0.25) / 9)} G`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [aiSettings, setAiSettingsState] = useState<AiSettings>(DEFAULT_AI_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(AI_SETTINGS_KEY)
      .then((raw) => {
        if (raw) setAiSettingsState(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const setAiSettings = useCallback((settings: AiSettings) => {
    setAiSettingsState(settings);
    AsyncStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
  }, []);

  const plan = useMemo(() => computePlan(state.profile), [state.profile]);

  const setProfileField = useCallback((key: keyof Profile, value: string) => {
    setState((s) => ({ ...s, profile: { ...s.profile, [key]: value } }));
  }, []);
  const setSexo = useCallback((sexo: Sexo) => setState((s) => ({ ...s, profile: { ...s.profile, sexo } })), []);
  const setAct = useCallback((act: number) => setState((s) => ({ ...s, profile: { ...s.profile, act } })), []);
  const setGoal = useCallback((goal: Goal) => setState((s) => ({ ...s, profile: { ...s.profile, goal } })), []);
  const setRitmo = useCallback((ritmo: number) => setState((s) => ({ ...s, profile: { ...s.profile, ritmo } })), []);
  const setCustomGoal = useCallback(
    (customGoal: string) => setState((s) => ({ ...s, profile: { ...s.profile, customGoal } })),
    []
  );

  const cycleFood = useCallback((foodId: string) => {
    setState((s) => {
      const liked = s.likes.includes(foodId);
      const disliked = s.dislikes.includes(foodId);
      if (liked) return { ...s, likes: s.likes.filter((x) => x !== foodId), dislikes: [...s.dislikes, foodId] };
      if (disliked) return { ...s, dislikes: s.dislikes.filter((x) => x !== foodId) };
      return { ...s, likes: [...s.likes, foodId] };
    });
  }, []);

  const toggleDiet = useCallback((diet: Diet) => {
    setState((s) => ({
      ...s,
      diets: s.diets.includes(diet) ? s.diets.filter((x) => x !== diet) : [...s.diets, diet],
    }));
  }, []);

  const completePlan = useCallback(() => setState((s) => ({ ...s, planReady: true })), []);

  const addMeal = useCallback((meal: Meal) => {
    setState((s) => ({ ...s, meals: [...s.meals, meal] }));
  }, []);

  const addBuiltMeal = useCallback((meal: BuiltMeal) => {
    setState((s) => ({
      ...s,
      meals: [...s.meals, { slot: meal.slot, name: meal.name, kcal: meal.kcal, macroText: macroTextFor(meal.kcal, meal.p) }],
    }));
  }, []);

  const setDraft = useCallback((text: string) => setState((s) => ({ ...s, draft: text })), []);

  const applyAction = useCallback((action: AssistantAction, s: AppState): Partial<AppState> => {
    switch (action.type) {
      case 'ajustar_calorias':
        return { profile: { ...s.profile, kcalDelta: s.profile.kcalDelta + action.delta } };
      case 'excluir_alimento': {
        if (action.foodId) {
          return {
            dislikes: s.dislikes.includes(action.foodId) ? s.dislikes : [...s.dislikes, action.foodId],
            likes: s.likes.filter((x) => x !== action.foodId),
          };
        }
        if (action.raw) return { extraDislikes: [...s.extraDislikes, action.raw] };
        return {};
      }
      case 'marcar_favorito':
        return {
          likes: s.likes.includes(action.foodId) ? s.likes : [...s.likes, action.foodId],
          dislikes: s.dislikes.filter((x) => x !== action.foodId),
        };
      case 'aplicar_restriccion':
        return { diets: s.diets.includes(action.diet) ? s.diets : [...s.diets, action.diet] };
      case 'cambiar_objetivo':
        return { profile: { ...s.profile, goal: action.goal, customGoal: action.descripcion || '' } };
      case 'proponer_comida':
        return {}; // rendered as a card in the chat message itself
      case 'registrar_comida':
        return {
          meals: [
            ...s.meals,
            {
              slot: action.meal.slot,
              name: action.meal.name,
              kcal: action.meal.kcal,
              macroText: macroTextFor(action.meal.kcal, action.meal.p),
            },
          ],
        };
      default:
        return {};
    }
  }, []);

  const changeReceiptFor = (action: AssistantAction, s: AppState): string | null => {
    switch (action.type) {
      case 'ajustar_calorias': {
        const p = computePlan({ ...s.profile, kcalDelta: s.profile.kcalDelta + action.delta });
        return `${action.delta > 0 ? '+' : '−'}${Math.abs(action.delta)} kcal · objetivo ${p.kcal.toLocaleString('es-ES')} kcal/día`;
      }
      case 'excluir_alimento':
        return `Excluido: ${action.foodId ? findFood(action.foodId)?.label : action.raw}`;
      case 'marcar_favorito':
        return `Favorito: ${findFood(action.foodId)?.label}`;
      case 'aplicar_restriccion':
        return `Restricción: ${action.diet}`;
      case 'cambiar_objetivo': {
        const p = computePlan({ ...s.profile, goal: action.goal, customGoal: action.descripcion || '' });
        return `Objetivo actualizado · ${p.kcal.toLocaleString('es-ES')} kcal · ${p.prot} g proteína`;
      }
      case 'registrar_comida':
        return `Diario actualizado · ${action.meal.kcal} kcal`;
      default:
        return null;
    }
  };

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? state.draft).trim();
      if (!text) return;

      setState((s) => ({
        ...s,
        chat: [...s.chat, { id: nextId(), role: 'user', text }],
        draft: '',
        iaThinking: true,
      }));

      const ctxSnapshot = state;
      const result = await runAssistant(
        text,
        {
          profile: ctxSnapshot.profile,
          likes: ctxSnapshot.likes,
          dislikes: ctxSnapshot.dislikes,
          extraDislikes: ctxSnapshot.extraDislikes,
          diets: ctxSnapshot.diets,
          meals: ctxSnapshot.meals,
          plan: computePlan(ctxSnapshot.profile),
        },
        aiSettings
      );

      setState((s) => {
        let next = s;
        const newMessages: ChatMessage[] = [];
        let repliedWithCard = false;
        for (const action of result.actions) {
          if (action.type === 'proponer_comida') {
            newMessages.push({ id: nextId(), role: 'ai', text: result.reply, meal: action.meal });
            repliedWithCard = true;
            continue;
          }
          const patch = applyAction(action, next);
          next = { ...next, ...patch };
          const receipt = changeReceiptFor(action, next);
          if (receipt) newMessages.push({ id: nextId(), role: 'ai', change: receipt, silent: true });
        }
        if (!repliedWithCard) newMessages.unshift({ id: nextId(), role: 'ai', text: result.reply });
        return { ...next, iaThinking: false, chat: [...s.chat, ...newMessages] };
      });
    },
    [state, applyAction, aiSettings]
  );

  const value: AppApi = {
    ...state,
    plan,
    setProfileField,
    setSexo,
    setAct,
    setGoal,
    setRitmo,
    setCustomGoal,
    cycleFood,
    toggleDiet,
    completePlan,
    addMeal,
    addBuiltMeal,
    setDraft,
    sendMessage,
    aiSettings,
    setAiSettings,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
