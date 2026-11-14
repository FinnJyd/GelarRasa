import type { FilterState } from '../../data/types';
import { ROUTES } from '../../shared/routes';
import type { RouteId } from '../../shared/routes';

export interface ChatActionPatch { navigation?: RouteId; filterPatch?: Partial<FilterState> }
export interface ChatActionResult { applied: string[]; navigated: boolean }
export type ChatApplyActions = (patch: ChatActionPatch) => ChatActionResult;

export const FILTER_LABELS: Record<string, string> = {
  region: 'wilayah',
  siteType: 'tipe lokasi',
  station: 'stasiun',
  pollutant: 'polutan',
  includeSuspect: 'QC SUSPECT',
  startDate: 'tanggal mulai',
  endDate: 'tanggal selesai',
  periodPreset: 'periode',
};

const NAV_ALIASES: Record<string, RouteId> = {
  overview: 'overview',
  ikhtisar: 'overview',
  'ikhtisar nasional': 'overview',
  compliance: 'compliance',
  kepatuhan: 'compliance',
  'kepatuhan regulasi': 'compliance',
  temporal: 'temporal',
  'pola waktu': 'temporal',
  drivers: 'drivers',
  'faktor pemicu': 'drivers',
  health: 'health',
  'dampak kesehatan': 'health',
  recommendations: 'recommendations',
  'rekomendasi kebijakan': 'recommendations',
  kebijakan: 'recommendations',
};

const FILTER_ALIASES: Record<string, keyof FilterState> = {
  region: 'region',
  wilayah: 'region',
  sitetype: 'siteType',
  tipe: 'siteType',
  'tipe lokasi': 'siteType',
  station: 'station',
  stasiun: 'station',
  pollutant: 'pollutant',
  polutan: 'pollutant',
  includesuspect: 'includeSuspect',
  suspect: 'includeSuspect',
  startdate: 'startDate',
  'tanggal mulai': 'startDate',
  enddate: 'endDate',
  'tanggal akhir': 'endDate',
  'tanggal selesai': 'endDate',
  periodpreset: 'periodPreset',
  periode: 'periodPreset',
};

function routeId(raw: string): RouteId | null {
  const key = raw.trim().toLowerCase();
  const alias = NAV_ALIASES[key];
  if (alias) return alias;
  return Object.hasOwn(ROUTES, key) ? (key as RouteId) : null;
}

function filterKey(raw: string): keyof FilterState | null {
  return FILTER_ALIASES[raw.trim().toLowerCase().replace(/\s+/g, ' ')] ?? null;
}

/**
 * Pulls [[NAVIGASI: …]] / [[FILTER: …]] directives out of a model reply.
 * Returns the display text with directives removed plus a typed patch for the app.
 */
export function extractChatActions(content: string): { text: string; patch: ChatActionPatch } {
  const patch: ChatActionPatch = {};
  const filterPatch: Partial<FilterState> = {};
  const directive = /\[\[(NAVIGASI|FILTER):\s*([^\]]+)\]\]/g;
  const text = content.replace(directive, (_match, kind: string, body: string) => {
    if (kind === 'NAVIGASI') {
      const id = routeId(body);
      if (id) patch.navigation = id;
      return '';
    }
    for (const pair of body.split(';')) {
      const separator = pair.indexOf('=');
      if (separator < 1) continue;
      const key = filterKey(pair.slice(0, separator));
      const value = pair.slice(separator + 1).trim();
      if (!key || !value) continue;
      if (key === 'includeSuspect') {
        if (value === 'true' || value === '1') filterPatch.includeSuspect = true;
        else if (value === 'false' || value === '0') filterPatch.includeSuspect = false;
      } else {
        const stringKey = key as Exclude<keyof FilterState, 'includeSuspect'>;
        filterPatch[stringKey] = value;
      }
    }
    return '';
  }).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (Object.keys(filterPatch).length) patch.filterPatch = filterPatch;
  return { text, patch };
}

export function hasActions(patch: ChatActionPatch): boolean {
  return Boolean(patch.navigation || patch.filterPatch);
}