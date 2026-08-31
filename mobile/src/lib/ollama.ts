// Talks to a local Ollama server (https://ollama.com) running on the user's
// own machine — no cloud API key, no cost. The phone and the computer
// running `ollama serve` must be reachable on the same network; the user
// sets the server URL and model name in the IA screen's settings.
//
// Uses Ollama's OpenAI-style tool-calling (`/api/chat` with a `tools` array)
// against the same 7 actions the app supports, so a capable local model
// (llama3.1, qwen2.5, mistral-nemo, etc.) can genuinely drive the app
// instead of just chatting.

import { DIETS, Diet, matchFood } from './nutrition';
import type { AssistantAction, AssistantContext, AssistantResult } from './ai';

export interface AiSettings {
  baseUrl: string; // e.g. http://192.168.1.42:11434
  model: string; // e.g. llama3.1
  visionModel?: string; // e.g. llava, qwen2.5vl — used for photo scan recognition
}

export const DEFAULT_AI_SETTINGS: AiSettings = { baseUrl: '', model: 'llama3.1', visionModel: 'llava' };

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[];
  tool_calls?: { function: { name: string; arguments: Record<string, unknown> } }[];
}

const TOOL_SPECS = [
  {
    type: 'function',
    function: {
      name: 'ajustar_calorias',
      description: 'Suma o resta calorías al objetivo diario del usuario. delta positivo sube, negativo baja.',
      parameters: {
        type: 'object',
        properties: { delta: { type: 'number' }, motivo: { type: 'string' } },
        required: ['delta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'excluir_alimento',
      description: 'Marca un alimento como que el usuario no lo soporta. No volverá a aparecer en sugerencias.',
      parameters: { type: 'object', properties: { alimento: { type: 'string' } }, required: ['alimento'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'marcar_favorito',
      description: 'Marca un alimento como favorito del usuario para priorizarlo en las sugerencias.',
      parameters: { type: 'object', properties: { alimento: { type: 'string' } }, required: ['alimento'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'aplicar_restriccion',
      description: 'Aplica una restricción alimentaria al plan completo. Valores válidos: ' + DIETS.join(', '),
      parameters: {
        type: 'object',
        properties: { restriccion: { type: 'string', enum: DIETS as unknown as string[] } },
        required: ['restriccion'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cambiar_objetivo',
      description: 'Cambia el objetivo del usuario. Usa "custom" con descripcion cuando el objetivo sea propio del usuario.',
      parameters: {
        type: 'object',
        properties: {
          objetivo: { type: 'string', enum: ['perder', 'mantener', 'ganar', 'custom'] },
          descripcion: { type: 'string' },
        },
        required: ['objetivo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'proponer_comida',
      description: 'Muestra al usuario una tarjeta con una comida propuesta que puede añadir a su diario con un botón. Respeta sus exclusiones y restricciones.',
      parameters: {
        type: 'object',
        properties: {
          momento: { type: 'string', enum: ['Desayuno', 'Comida', 'Snack', 'Cena'] },
          nombre: { type: 'string' },
          kcal: { type: 'number' },
          proteina_g: { type: 'number' },
          ingredientes: { type: 'array', items: { type: 'string' }, description: 'Ingrediente con cantidad, ej. "Pollo · 210 g"' },
          nota: { type: 'string' },
        },
        required: ['momento', 'nombre', 'kcal', 'proteina_g', 'ingredientes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrar_comida',
      description: 'Añade directamente una comida al diario de hoy (solo si el usuario dice que ya se la ha comido).',
      parameters: {
        type: 'object',
        properties: {
          momento: { type: 'string', enum: ['Desayuno', 'Comida', 'Snack', 'Cena'] },
          nombre: { type: 'string' },
          kcal: { type: 'number' },
          proteina_g: { type: 'number' },
        },
        required: ['momento', 'nombre', 'kcal'],
      },
    },
  },
];

function buildSystemPrompt(ctx: AssistantContext): string {
  const P = ctx.plan;
  const label = { perder: 'perder grasa', mantener: 'mantener / recomposición', ganar: 'ganar masa muscular', custom: 'personalizado' }[ctx.profile.goal];
  return [
    'Eres el asistente de nutrición de Kcal AI, una app de conteo de calorías para gente que entrena. Hablas español de España, en segunda persona, directo y sin paja. Máximo 3 frases por respuesta salvo que te pidan un plan.',
    'Cuando el usuario pida un cambio en su plan, sus gustos o su diario, USA LAS HERRAMIENTAS en lugar de solo describirlo. Después confirma en una frase corta lo que has hecho.',
    'No des consejo médico; si detectas un objetivo peligroso (déficit extremo, pérdida muy rápida), dilo con claridad y propón algo sensato.',
    'Datos actuales del usuario:',
    JSON.stringify(
      {
        edad: +ctx.profile.edad,
        peso_kg: +ctx.profile.peso,
        altura_cm: +ctx.profile.altura,
        sexo: ctx.profile.sexo === 'h' ? 'hombre' : 'mujer',
        objetivo: label,
        objetivo_personalizado: ctx.profile.customGoal || null,
        objetivo_diario: { kcal: P.kcal, proteina_g: P.prot, carbos_g: P.carb, grasas_g: P.fat },
        gasto_estimado_kcal: P.tdee,
        le_gusta: ctx.likes,
        no_soporta: [...ctx.dislikes, ...ctx.extraDislikes],
        restricciones: ctx.diets,
        comidas_de_hoy: ctx.meals,
      },
      null,
      1
    ),
  ].join('\n\n');
}

async function ollamaChat(
  settings: AiSettings,
  messages: OllamaMessage[],
  withTools: boolean,
  timeoutMs = 20000,
  modelOverride?: string
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelOverride || settings.model,
        messages,
        stream: false,
        ...(withTools ? { tools: TOOL_SPECS } : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Ollama respondió ${res.status}`);
    const data = await res.json();
    return data.message as OllamaMessage;
  } finally {
    clearTimeout(timer);
  }
}

function toAction(name: string, args: Record<string, any>): AssistantAction | null {
  switch (name) {
    case 'ajustar_calorias':
      return { type: 'ajustar_calorias', delta: Number(args.delta) || 0 };
    case 'excluir_alimento': {
      const f = matchFood(String(args.alimento || ''));
      return { type: 'excluir_alimento', foodId: f?.id, raw: f ? undefined : String(args.alimento || '') };
    }
    case 'marcar_favorito': {
      const f = matchFood(String(args.alimento || ''));
      return f ? { type: 'marcar_favorito', foodId: f.id } : null;
    }
    case 'aplicar_restriccion':
      return (DIETS as readonly string[]).includes(args.restriccion)
        ? { type: 'aplicar_restriccion', diet: args.restriccion as Diet }
        : null;
    case 'cambiar_objetivo': {
      const goal = args.objetivo;
      if (!['perder', 'mantener', 'ganar', 'custom'].includes(goal)) return null;
      return { type: 'cambiar_objetivo', goal, descripcion: args.descripcion ? String(args.descripcion) : undefined };
    }
    case 'proponer_comida':
    case 'registrar_comida': {
      const slot = args.momento;
      if (!['Desayuno', 'Comida', 'Snack', 'Cena'].includes(slot)) return null;
      return {
        type: name,
        meal: {
          slot,
          name: String(args.nombre || ''),
          kcal: Math.round(Number(args.kcal) || 0),
          p: Math.round(Number(args.proteina_g) || 0),
          items: Array.isArray(args.ingredientes) ? args.ingredientes.map(String) : [],
        },
      } as AssistantAction;
    }
    default:
      return null;
  }
}

export async function runAssistantOllama(text: string, ctx: AssistantContext, settings: AiSettings): Promise<AssistantResult> {
  const system = buildSystemPrompt(ctx);
  const messages: OllamaMessage[] = [{ role: 'system', content: system }, { role: 'user', content: text }];

  const first = await ollamaChat(settings, messages, true);
  const actions: AssistantAction[] = [];

  if (first.tool_calls?.length) {
    messages.push(first);
    for (const call of first.tool_calls) {
      const args = call.function.arguments || {};
      const action = toAction(call.function.name, args);
      if (action) actions.push(action);
      messages.push({ role: 'tool', content: action ? 'ok' : 'no se pudo aplicar' });
    }
    const followUp = await ollamaChat(settings, messages, false, 20000);
    return { reply: (followUp.content || '').trim() || 'Hecho.', actions };
  }

  return { reply: (first.content || '').trim() || 'Hecho.', actions };
}

export async function generatePlanNote(prompt: string, settings: AiSettings): Promise<string | null> {
  try {
    const message = await ollamaChat(
      settings,
      [
        {
          role: 'system',
          content:
            'Eres el asistente de nutrición de Kcal AI. Responde solo con 2-3 frases en español de España explicando el plan al usuario, directo y sin paja, sin markdown.',
        },
        { role: 'user', content: prompt },
      ],
      false,
      15000
    );
    return (message.content || '').trim() || null;
  } catch {
    return null;
  }
}

export interface VisionResult {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  items: { name: string; qty: string }[];
}

/** Sends a captured photo (base64, no data: prefix) to a vision-capable local
 * model (e.g. llava, qwen2.5vl) and parses its kcal/macro estimate. Returns
 * null on any failure so callers can fall back to the simulated result. */
export async function recognizeFoodPhoto(base64: string, settings: AiSettings): Promise<VisionResult | null> {
  try {
    const message = await ollamaChat(
      settings,
      [
        {
          role: 'system',
          content:
            'Eres un nutricionista identificando comida en fotos. Responde ÚNICAMENTE con JSON válido, sin texto ni markdown alrededor, con esta forma exacta: {"name":"nombre del plato","kcal":numero,"protein":numero,"carbs":numero,"fat":numero,"items":[{"name":"ingrediente","qty":"cantidad"}]}. Estima con tu mejor criterio a partir de la imagen; los números son kcal y gramos totales del plato.',
        },
        { role: 'user', content: 'Identifica esta comida y estima sus calorías y macros.', images: [base64] },
      ],
      false,
      45000,
      settings.visionModel || settings.model
    );
    const text = (message.content || '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.kcal !== 'number') return null;
    return {
      name: String(parsed.name || 'Comida detectada'),
      kcal: Math.round(parsed.kcal),
      protein: Math.round(parsed.protein || 0),
      carbs: Math.round(parsed.carbs || 0),
      fat: Math.round(parsed.fat || 0),
      items: Array.isArray(parsed.items)
        ? parsed.items.map((it: any) => ({ name: String(it.name || ''), qty: String(it.qty || '') }))
        : [],
    };
  } catch {
    return null;
  }
}

export async function pingOllama(settings: AiSettings): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
