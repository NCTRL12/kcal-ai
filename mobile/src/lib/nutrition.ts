// Ported from the `plan()` calc and FOODS table in project/Kcal AI.dc.html.
// Mifflin-St Jeor BMR + activity factor, kept identical to the prototype so
// the numbers a user saw in the design match the real app.

export type FoodKind = 'prot' | 'carb' | 'extra';

export interface Food {
  id: string;
  label: string;
  kind: FoodKind;
  kcal: number;
  p: number;
  qty: string;
  tags?: string[];
}

export const DIETS = ['Sin lactosa', 'Sin gluten', 'Vegetariano', 'Sin pescado', 'Sin cerdo'] as const;
export type Diet = (typeof DIETS)[number];

export const RITMOS = ['muy suave', 'suave', 'moderado', 'rápido', 'agresivo'] as const;

export const FOODS: Food[] = [
  { id: 'pollo', label: 'Pollo', kind: 'prot', kcal: 345, p: 44, qty: '210 g' },
  { id: 'salmon', label: 'Salmón', kind: 'prot', kcal: 370, p: 38, qty: '180 g', tags: ['Sin pescado'] },
  { id: 'ternera', label: 'Ternera', kind: 'prot', kcal: 380, p: 48, qty: '200 g' },
  { id: 'huevos', label: 'Huevos', kind: 'prot', kcal: 220, p: 19, qty: '3 uds' },
  { id: 'atun', label: 'Atún', kind: 'prot', kcal: 200, p: 40, qty: '150 g', tags: ['Sin pescado'] },
  { id: 'lentejas', label: 'Lentejas', kind: 'prot', kcal: 230, p: 16, qty: '200 g' },
  { id: 'yogur', label: 'Yogur griego', kind: 'prot', kcal: 150, p: 25, qty: '250 g', tags: ['Sin lactosa'] },
  { id: 'arroz', label: 'Arroz', kind: 'carb', kcal: 235, p: 5, qty: '180 g' },
  { id: 'pasta', label: 'Pasta', kind: 'carb', kcal: 210, p: 7, qty: '150 g', tags: ['Sin gluten'] },
  { id: 'boniato', label: 'Boniato', kind: 'carb', kcal: 215, p: 4, qty: '250 g' },
  { id: 'avena', label: 'Avena', kind: 'carb', kcal: 300, p: 10, qty: '80 g' },
  { id: 'platano', label: 'Plátano', kind: 'carb', kcal: 105, p: 1, qty: '1 ud' },
  { id: 'aguacate', label: 'Aguacate', kind: 'extra', kcal: 160, p: 2, qty: '½ ud' },
  { id: 'nueces', label: 'Frutos secos', kind: 'extra', kcal: 185, p: 5, qty: '30 g' },
  { id: 'brocoli', label: 'Brócoli', kind: 'extra', kcal: 70, p: 5, qty: '200 g' },
  { id: 'queso', label: 'Queso fresco', kind: 'extra', kcal: 90, p: 11, qty: '100 g', tags: ['Sin lactosa'] },
];

export const findFood = (id: string) => FOODS.find((f) => f.id === id);

export function matchFood(name: string | undefined | null): Food | undefined {
  const n = (name || '').toLowerCase().trim();
  if (!n) return undefined;
  return (
    FOODS.find((f) => f.label.toLowerCase() === n || f.id === n) ||
    FOODS.find((f) => n.includes(f.label.toLowerCase()) || f.label.toLowerCase().includes(n))
  );
}

export type Goal = 'perder' | 'mantener' | 'ganar' | 'custom';
export type Sexo = 'h' | 'm';

export interface Profile {
  edad: string;
  peso: string;
  altura: string;
  sexo: Sexo;
  act: number; // 0..4, entrenamientos/semana bucket
  goal: Goal;
  ritmo: number; // 0..4
  customGoal: string;
  kcalDelta: number; // running adjustment from the AI assistant
}

export interface Plan {
  kcal: number;
  prot: number;
  carb: number;
  fat: number;
  tdee: number;
}

const ACTIVITY_FACTORS = [1.2, 1.375, 1.55, 1.725, 1.9];
export const ACT_LABELS = ['0–1', '2–3', '4', '5–6', '7+'];

export function computePlan(profile: Profile): Plan {
  const p = +profile.peso || 78;
  const a = +profile.altura || 180;
  const e = +profile.edad || 28;
  const bmr = 10 * p + 6.25 * a - 5 * e + (profile.sexo === 'h' ? 5 : -161);
  const tdee = bmr * (ACTIVITY_FACTORS[profile.act] ?? ACTIVITY_FACTORS[3]);
  const shift =
    (profile.goal === 'perder' ? -1 : profile.goal === 'ganar' ? 1 : 0) * (0.04 + profile.ritmo * 0.035);
  const kcal = Math.round((tdee * (1 + shift)) / 10) * 10 + profile.kcalDelta;
  const prot = Math.round(p * (profile.goal === 'perder' ? 2.2 : 2.0));
  const fat = Math.round((kcal * 0.25) / 9);
  const carb = Math.max(0, Math.round((kcal - prot * 4 - fat * 9) / 4));
  return { kcal, prot, fat, carb, tdee: Math.round(tdee) };
}

export const GOAL_LABEL: Record<Goal, string> = {
  perder: 'perder grasa',
  mantener: 'mantener / recomposición',
  ganar: 'ganar masa muscular',
  custom: 'personalizado',
};

export function goalNote(profile: Profile, plan: Plan): string {
  switch (profile.goal) {
    case 'perder':
      return `Déficit de ${Math.abs(plan.kcal - plan.tdee)} kcal sobre tu gasto estimado (${plan.tdee} kcal). Proteína a 2,2 g por kilo para proteger la masa magra.`;
    case 'mantener':
      return `Calorías de mantenimiento sobre un gasto estimado de ${plan.tdee} kcal. Prioriza proteína y entrenamiento de fuerza.`;
    case 'ganar':
      return `Superávit de ${Math.abs(plan.kcal - plan.tdee)} kcal sobre tu gasto estimado (${plan.tdee} kcal), con la proteína a 2 g por kilo.`;
    case 'custom':
      return `${profile.customGoal ? `“${profile.customGoal}”. ` : ''}Traducido a ${plan.kcal} kcal sobre un gasto estimado de ${plan.tdee} kcal, con la proteína alta. Puedes pedirme cambios en cualquier momento desde el asistente.`;
  }
}

export interface Meal {
  slot: 'Desayuno' | 'Comida' | 'Snack' | 'Cena';
  name: string;
  kcal: number;
  macroText: string;
}

export function allowedFoods(kind: FoodKind, dislikes: string[], diets: string[]): Food[] {
  const veg = diets.includes('Vegetariano');
  return FOODS.filter(
    (f) =>
      f.kind === kind &&
      !dislikes.includes(f.id) &&
      !(f.tags || []).some((t) => diets.includes(t)) &&
      !(veg && ['pollo', 'ternera', 'salmon', 'atun'].includes(f.id))
  );
}

export interface BuiltMeal {
  slot: Meal['slot'];
  name: string;
  kcal: number;
  p: number;
  items: string[];
}

export function buildMeal(
  slot: Meal['slot'],
  targetKcal: number | undefined,
  likes: string[],
  dislikes: string[],
  diets: string[]
): BuiltMeal | null {
  const rank = (list: Food[]) =>
    list
      .slice()
      .sort((a, b) => likes.indexOf(b.id) - likes.indexOf(a.id))
      .sort((a, b) => (likes.includes(b.id) ? 1 : 0) - (likes.includes(a.id) ? 1 : 0));
  const prot = rank(allowedFoods('prot', dislikes, diets))[0];
  const carb = rank(allowedFoods('carb', dislikes, diets))[0];
  const extra = rank(allowedFoods('extra', dislikes, diets))[0];
  const picks = [prot, carb, extra].filter(Boolean) as Food[];
  if (!picks.length) return null;
  let kcal = picks.reduce((t, f) => t + f.kcal, 0);
  let p = picks.reduce((t, f) => t + f.p, 0);
  let scale = 1;
  if (targetKcal) {
    scale = targetKcal / kcal;
    kcal = targetKcal;
    p = Math.round(p * scale);
  }
  return {
    slot,
    name: picks.map((f) => f.label).join(', ').replace(/,([^,]*)$/, ' y$1'),
    kcal: Math.round(kcal / 5) * 5,
    p: Math.round(p),
    items: picks.map(
      (f) =>
        f.label +
        ' · ' +
        (scale === 1 ? f.qty : Math.round(parseFloat(f.qty) * scale) + f.qty.replace(/^[\d.,]+/, ''))
    ),
  };
}
