// Free, keyless product lookup — https://world.openfoodfacts.org

export interface OffProduct {
  name: string;
  brand?: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export async function lookupBarcode(code: string): Promise<OffProduct | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const n = p.nutriments || {};
    const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : undefined);
    if (kcal == null) return null;
    return {
      name: p.product_name || p.generic_name || 'Producto sin nombre',
      brand: p.brands,
      kcalPer100g: Math.round(kcal),
      proteinPer100g: n.proteins_100g ?? 0,
      carbsPer100g: n.carbohydrates_100g ?? 0,
      fatPer100g: n.fat_100g ?? 0,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
