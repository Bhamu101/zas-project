import { Platform, Share } from 'react-native';

import type { DashboardResponse } from '@/types';

// CSV export with no new dependencies.
//
// expo-file-system and expo-sharing are NOT in this project, so there is no way
// to write a real file on device. The two platforms therefore deliver the same
// CSV string differently:
//   web    — a Blob + a synthetic <a download> click, which is a genuine file
//            save (and is what the Mobile View preview exercises).
//   native — Share.share({ message }), which hands the CSV to the OS share
//            sheet so it can go to email, Drive, WhatsApp and so on.
// If a real .csv file on device is ever needed, that is the point to add
// expo-file-system + expo-sharing rather than to work around it here.

export type ExportKind = 'beds' | 'alerts' | 'energy' | 'water';

/** RFC 4180: wrap in quotes when the value contains a comma, quote or newline. */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export function buildCsv(kind: ExportKind, data: DashboardResponse): string {
  switch (kind) {
    case 'beds':
      return toCsv(
        ['bed_id', 'name', 'crop', 'vwc_pct', 'state', 'trigger_pct', 'optimal_min_pct', 'optimal_max_pct', 'last_irrigation', 'duration_min', 'water_used_l', 'soil_temp_c', 'air_temp_c', 'humidity_pct', 'pump', 'valve'],
        data.beds.map((b) => [b.id, b.name, b.crop, b.vwc, b.state, b.vwcTrigger, b.vwcOptimalMin, b.vwcOptimalMax, b.lastIrrigation, b.durationMin, b.waterUsedL, b.soilTempC, b.airTempC, b.humidityPct, b.pumpStatus, b.valveStatus])
      );
    case 'alerts':
      return toCsv(
        ['alert_id', 'level', 'category', 'time', 'message'],
        data.alerts.map((a) => [a.id, a.level, a.category, a.time, a.text])
      );
    case 'energy': {
      const s = data.energyOverview.powerConsumption.series;
      return toCsv(
        ['hour', 'today_kw', 'yesterday_kw'],
        s.hours.map((h, i) => [h, s.today[i] ?? '', s.yesterday[i] ?? ''])
      );
    }
    case 'water': {
      const { dailyUsageLabels, dailyUsageSeriesL } = data.mobileExtras;
      return toCsv(
        ['day', 'water_used_l'],
        dailyUsageLabels.map((d, i) => [d, dailyUsageSeriesL[i] ?? ''])
      );
    }
  }
}

export function rowCount(kind: ExportKind, data: DashboardResponse): number {
  switch (kind) {
    case 'beds':
      return data.beds.length;
    case 'alerts':
      return data.alerts.length;
    case 'energy':
      return data.energyOverview.powerConsumption.series.hours.length;
    case 'water':
      return data.mobileExtras.dailyUsageLabels.length;
  }
}

export function fileNameFor(kind: ExportKind): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `goho-${kind}-${stamp}.csv`;
}

/**
 * Delivers the CSV. Resolves to a short past-tense description of what
 * happened so the caller can show it, or throws with a usable message.
 */
export async function deliverCsv(fileName: string, csv: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return `Downloaded ${fileName}`;
  }

  const result = await Share.share({ message: csv, title: fileName });
  return result.action === Share.dismissedAction ? 'Export cancelled' : 'Export shared';
}
