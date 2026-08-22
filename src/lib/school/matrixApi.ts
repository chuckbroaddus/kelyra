import AsyncStorage from '@react-native-async-storage/async-storage';

import { writeAudit } from '@/lib/school/api';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { SchoolRole } from '@/lib/supabase/types';
import {
  type Access,
  type Capability,
  type GrantMap,
  applyGrants,
  CAPABILITIES,
  grantsFromCapabilities,
} from '@/lib/school/matrix';

const STORAGE_KEY = 'kelyra.capability_grants';
const GRANT_TTL_MS = 30_000;
let grantCache: { at: number; map: GrantMap } | null = null;

function emptyMap(): GrantMap {
  return grantsFromCapabilities();
}

function parseMap(raw: unknown): GrantMap | null {
  if (!raw || typeof raw !== 'object') return null;
  const next = emptyMap();
  for (const [cap, roles] of Object.entries(raw as GrantMap)) {
    if (!next[cap] || !roles) continue;
    next[cap] = { ...next[cap], ...roles };
  }
  return next;
}

export async function loadCapabilityRows(): Promise<Capability[]> {
  const grants = await loadGrants();
  return applyGrants(CAPABILITIES, grants);
}

export async function loadGrants(): Promise<GrantMap> {
  if (grantCache && Date.now() - grantCache.at < GRANT_TTL_MS) return grantCache.map;
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from('capability_grants').select('capability_id, role, access');
    if (!error && data && data.length > 0) {
      const map = emptyMap();
      for (const row of data) {
        if (!map[row.capability_id]) continue;
        map[row.capability_id]![row.role as SchoolRole] = row.access as Access;
      }
      grantCache = { at: Date.now(), map };
      return map;
    }
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return parseMap(JSON.parse(raw)) ?? emptyMap();
  } catch {
    // fall through
  }
  return emptyMap();
}

export async function saveGrant(capabilityId: string, role: SchoolRole, access: Access): Promise<void> {
  grantCache = null;
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.rpc('set_capability_grant', {
      p_capability: capabilityId,
      p_role: role,
      p_access: access,
    });
    if (!error) {
      const current = await loadGrants();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      await writeAudit({
        action: 'set_capability_grant',
        entityType: 'capability',
        entityId: capabilityId,
        after: { capability_id: capabilityId, role, access },
      }).catch(() => undefined);
      return;
    }
  }
  const current = await loadGrants();
  if (!current[capabilityId]) current[capabilityId] = emptyMap()[capabilityId]!;
  current[capabilityId]![role] = access;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export async function resetGrantsToDefaults(): Promise<Capability[]> {
  const defaults = emptyMap();
  const supabase = getSupabaseClient();
  if (supabase) {
    for (const row of CAPABILITIES) {
      for (const role of ['superintendent', 'administrator', 'teacher', 'parent', 'student'] as SchoolRole[]) {
        await supabase.rpc('set_capability_grant', {
          p_capability: row.id,
          p_role: role,
          p_access: row[role],
        });
      }
    }
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  return CAPABILITIES.map((row) => ({ ...row }));
}
