import { finite, list, record } from '../../shared/lag-model';
export interface NetworkSite { code: string; baseline: number; traffic: number; road: number; nearestKm: number }
export function parseNetwork(raw: unknown): readonly NetworkSite[] {
  const source = record(raw); if (source['version'] !== 1) throw new Error('Versi jaringan tidak didukung.');
  const seen = new Set<string>();
  const sites = list(source['sites']); if (!sites.length) throw new Error('Katalog jaringan kosong.');
  return sites.map(value => {
    const row = record(value), code = row['code'];
    if (typeof code !== 'string' || !/^AQMS-[A-Z0-9]+-\d{2}$/.test(code) || seen.has(code)) throw new Error('Identitas jaringan tidak valid.'); seen.add(code);
    return { code, baseline: finite(row['baseline'], 0), traffic: finite(row['traffic'], 0), road: finite(row['road'], 0), nearestKm: finite(row['nearestKm'], 0) };
  });
}
export function rankNetwork(all: readonly NetworkSite[], codes: readonly string[], weights: readonly number[]): { site: NetworkSite; score: number; parts: number[] }[] {
  if (weights.length !== 3 || weights.some(n => !Number.isFinite(n) || n < 0) || weights.reduce((a, b) => a + b, 0) === 0) return [];
  const fields = ['baseline', 'traffic', 'nearestKm'] as const;
  const ranges = fields.map(field => [Math.min(...all.map(site => site[field])), Math.max(...all.map(site => site[field]))]);
  const sum = weights.reduce((a, b) => a + b, 0);
  return all.filter(site => codes.includes(site.code)).map(site => {
    const parts = fields.map((field, i) => { const low = ranges[i]?.[0], high = ranges[i]?.[1]; return low !== undefined && high !== undefined && high > low ? (site[field] - low) / (high - low) : 0; });
    return { site, parts, score: parts.reduce((total, n, i) => total + n * (weights[i] ?? 0), 0) / sum * 100 };
  }).sort((a, b) => b.score - a.score || a.site.code.localeCompare(b.site.code));
}
