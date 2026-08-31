import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { DailyLogs } from './log';

function csvEscape(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildDiaryCsv(dailyLogs: DailyLogs): string {
  const rows = [['fecha', 'momento', 'nombre', 'kcal', 'macros']];
  const dates = Object.keys(dailyLogs).sort();
  for (const date of dates) {
    for (const meal of dailyLogs[date]) {
      rows.push([date, meal.slot, meal.name, String(meal.kcal), meal.macroText]);
    }
  }
  return rows.map((r) => r.map(csvEscape).join(',')).join('\n');
}

export async function exportDiaryCsv(dailyLogs: DailyLogs): Promise<void> {
  const csv = buildDiaryCsv(dailyLogs);
  const file = new File(Paths.cache, 'kcal-ai-diario.csv');
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Exportar diario de Kcal AI' });
  }
}
