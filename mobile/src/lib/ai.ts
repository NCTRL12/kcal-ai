// The prototype's assistant called `window.claude.complete` directly from the
// browser with a system prompt + tool definitions (see systemPrompt()/tools()
// in project/Kcal AI.dc.html). A shipped mobile app can't hold that call
// client-side — it needs a secret API key, which means a backend.
//
// This module is the swap point: `runAssistant` is the only thing the UI
// calls. Today it's a small local rule-matcher that still does what the
// design asked for ("que le digas y la IA lo haga" — actions execute for
// real, against real local state). To go live, replace the body of
// `runAssistant` with a fetch() to your backend endpoint, which in turn calls
// the Claude API server-side with this same system prompt shape and tool
// list, and returns { reply, actions } in the same shape used below.

import { BuiltMeal, Diet, Goal, Meal, Plan, Profile, buildMeal, computePlan, matchFood } from './nutrition';
import { AiSettings, runAssistantOllama } from './ollama';

export interface AssistantContext {
  profile: Profile;
  likes: string[];
  dislikes: string[];
  extraDislikes: string[];
  diets: Diet[];
  meals: Meal[];
  plan: Plan;
}

export type AssistantAction =
  | { type: 'ajustar_calorias'; delta: number }
  | { type: 'excluir_alimento'; foodId?: string; raw?: string }
  | { type: 'marcar_favorito'; foodId: string }
  | { type: 'aplicar_restriccion'; diet: Diet }
  | { type: 'cambiar_objetivo'; goal: Goal; descripcion?: string }
  | { type: 'proponer_comida'; meal: BuiltMeal }
  | { type: 'registrar_comida'; meal: BuiltMeal };

export interface AssistantResult {
  reply: string;
  actions: AssistantAction[];
}

const KCAL_RE = /(sub|baj|añad|quita|resta)[a-zé]*\s*(\d+)\s*kcal/i;
const DIET_MAP: Record<string, Diet> = {
  lactosa: 'Sin lactosa',
  lácteo: 'Sin lactosa',
  gluten: 'Sin gluten',
  celiaco: 'Sin gluten',
  celíaco: 'Sin gluten',
  vegetarian: 'Vegetariano',
  pescado: 'Sin pescado',
  cerdo: 'Sin cerdo',
};
const MEAL_SLOT_MAP: Record<string, BuiltMeal['slot']> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  almuerzo: 'Comida',
  snack: 'Snack',
  merienda: 'Snack',
  cena: 'Cena',
};

function detectMealSlot(text: string): BuiltMeal['slot'] {
  const n = text.toLowerCase();
  for (const key of Object.keys(MEAL_SLOT_MAP)) {
    if (n.includes(key)) return MEAL_SLOT_MAP[key];
  }
  return 'Cena';
}

async function runAssistantLocal(text: string, ctx: AssistantContext): Promise<AssistantResult> {
  // Simulate the model taking a beat, same feel as the prototype's typing dots.
  await new Promise((r) => setTimeout(r, 550 + Math.random() * 450));

  const n = text.toLowerCase().trim();
  const actions: AssistantAction[] = [];

  const kcalMatch = n.match(KCAL_RE);
  if (kcalMatch) {
    const up = /sub|añad/.test(kcalMatch[1]);
    const delta = (up ? 1 : -1) * parseInt(kcalMatch[2], 10);
    actions.push({ type: 'ajustar_calorias', delta });
    const plan = computePlan({ ...ctx.profile, kcalDelta: ctx.profile.kcalDelta + delta });
    return { reply: `Objetivo diario ahora ${plan.kcal.toLocaleString('es-ES')} kcal.`, actions };
  }

  const dietHit = Object.keys(DIET_MAP).find((k) => n.includes(k));
  if (dietHit && /intoleran|no (puedo|como)|soy|vegetarian/.test(n)) {
    const diet = DIET_MAP[dietHit];
    actions.push({ type: 'aplicar_restriccion', diet });
    return { reply: `${diet} aplicado a todo el plan. No volverá a aparecer nada que lo lleve.`, actions };
  }

  if (/no soporto|no aguanto|odio|quítame|quitame|sin\s+\w+/.test(n) && !dietHit) {
    const after = n
      .replace(/.*(no soporto|no aguanto|odio|quítame|quitame)\s*(el|la|los|las)?\s*/i, '')
      .replace(/\s+del?\s+(plan|diario).*/i, '')
      .trim();
    const f = matchFood(after);
    actions.push({ type: 'excluir_alimento', foodId: f?.id, raw: f ? undefined : after });
    return { reply: `Excluido ${f ? f.label : after || 'ese alimento'}. No te lo volveré a proponer.`, actions };
  }

  if (/me gusta|favorito/.test(n)) {
    const after = n.replace(/.*(me gusta|favorito)\s*(el|la|los|las)?\s*/i, '').trim();
    const f = matchFood(after);
    if (f) {
      actions.push({ type: 'marcar_favorito', foodId: f.id });
      return { reply: `${f.label} marcado como favorito. Lo priorizaré en las propuestas.`, actions };
    }
    return { reply: 'Ese alimento no está en la lista de la app, pero lo tendré en cuenta.', actions };
  }

  if (/proteína|proteina/.test(n) && /falta|cu[aá]nt/.test(n)) {
    const plan = computePlan(ctx.profile);
    return {
      reply: `Tu objetivo es ${plan.prot} g de proteína al día. Pregúntame otra vez después de registrar una comida y te digo cuánta te falta ya comida.`,
      actions,
    };
  }

  const mealTarget = n.match(/(\d+)\s*kcal/);
  if (/dame|prop[oó]n|una (cena|comida|snack|desayuno)/.test(n)) {
    const target = mealTarget ? parseInt(mealTarget[1], 10) : undefined;
    const slot = detectMealSlot(n);
    const meal = buildMeal(slot, target, ctx.likes, ctx.dislikes, ctx.diets);
    if (!meal) {
      return { reply: 'No me quedan alimentos que encajen con tus exclusiones para montar algo. Prueba a soltar alguna restricción.', actions };
    }
    actions.push({ type: 'proponer_comida', meal });
    return { reply: `${slot} a tu medida:`, actions };
  }

  if (/objetivo/.test(n) && /(cambia|quiero|pasar a|perder|ganar|mantener)/.test(n)) {
    let goal: Goal | undefined;
    if (/perder/.test(n)) goal = 'perder';
    else if (/ganar|masa/.test(n)) goal = 'ganar';
    else if (/mantener|recomposici/.test(n)) goal = 'mantener';
    if (goal) {
      actions.push({ type: 'cambiar_objetivo', goal });
      const plan = computePlan({ ...ctx.profile, goal });
      return { reply: `Objetivo cambiado. Nuevo plan: ${plan.kcal.toLocaleString('es-ES')} kcal, ${plan.prot} g de proteína.`, actions };
    }
    const descripcion = text;
    actions.push({ type: 'cambiar_objetivo', goal: 'custom', descripcion });
    return { reply: 'Objetivo personalizado guardado. He recalculado tu plan a partir de lo que has escrito.', actions };
  }

  if (/ya (me )?(he )?comido|acabo de comer|registra/.test(n)) {
    const slot = detectMealSlot(n);
    const target = mealTarget ? parseInt(mealTarget[1], 10) : 500;
    const meal = buildMeal(slot, target, ctx.likes, ctx.dislikes, ctx.diets) ?? {
      slot,
      name: text,
      kcal: target,
      p: Math.round((target * 0.25) / 4),
      items: [],
    };
    actions.push({ type: 'registrar_comida', meal });
    return { reply: `Registrado en ${slot.toLowerCase()}. Actualizo tu diario de hoy.`, actions };
  }

  return {
    reply:
      'Puedo cambiar tus calorías, excluir o priorizar alimentos, aplicar restricciones, proponerte comidas o cambiar tu objetivo — dime qué necesitas. (Sin un modelo local conectado en Ajustes, solo entiendo estas frases concretas.)',
    actions,
  };
}

/**
 * Single entry point the UI calls. Uses the user's local Ollama server when
 * configured (Ajustes, in the IA screen), falling back to the built-in
 * rule-matcher — with a short note appended — if the server is unreachable.
 */
export async function runAssistant(text: string, ctx: AssistantContext, aiSettings?: AiSettings): Promise<AssistantResult> {
  if (aiSettings?.baseUrl) {
    try {
      return await runAssistantOllama(text, ctx, aiSettings);
    } catch (err) {
      const fallback = await runAssistantLocal(text, ctx);
      const reason = err instanceof Error ? err.message : String(err);
      return {
        ...fallback,
        reply: `No pude hablar con tu modelo en ${aiSettings.baseUrl} (${reason}). Uso el asistente básico mientras tanto.\n\n${fallback.reply}`,
      };
    }
  }
  return runAssistantLocal(text, ctx);
}
