import { uploadPhotoPair } from '@/lib/media/upload';
import { pickupRestrictionClearTargets } from '@/lib/ride/restriction';
import { requireSupabase } from '@/lib/supabase/client';

export type DismissalLine = { id: string; name: string; sort: number; status: string };

export type ParentVehicle = {
  id: string;
  plate_raw: string;
  plate_norm: string;
  make: string | null;
  model: string | null;
  year: number | null;
  label: string | null;
  validity_kind: 'today' | 'range' | 'indefinite';
  valid_from: string | null;
  valid_to: string | null;
  status: string;
  valid_today?: boolean;
};

export type MyTrip = {
  ok: boolean;
  status?: string;
  position_xx?: number | null;
  line_id?: string | null;
  student_ids?: string[];
  message?: string;
};

export type CheckInResult = {
  ok: boolean;
  message?: string;
  position_xx?: number | null;
  line_id?: string;
  student_ids?: string[];
};

export type LeaveResult = {
  ok: boolean;
  message?: string;
  kind?: string;
  line_id?: string;
  student_ids?: string[];
};

export async function listDismissalLines(): Promise<DismissalLine[]> {
  const { data, error } = await requireSupabase().rpc('dismissal_list_lines');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function listParentVehicles(): Promise<ParentVehicle[]> {
  const { data, error } = await requireSupabase().rpc('parent_list_vehicles');
  if (error) throw error;
  return Array.isArray(data) ? (data as ParentVehicle[]) : [];
}

export async function upsertParentVehicle(input: {
  id?: string | null;
  plateRaw: string;
  make?: string;
  model?: string;
  year?: number | null;
  label?: string;
  validityKind: 'today' | 'range' | 'indefinite';
  validFrom?: string | null;
  validTo?: string | null;
  void?: boolean;
}): Promise<ParentVehicle> {
  const { data, error } = await requireSupabase().rpc('parent_upsert_vehicle', {
    p_id: input.id ?? null,
    p_plate_raw: input.plateRaw,
    p_make: input.make ?? null,
    p_model: input.model ?? null,
    p_year: input.year ?? null,
    p_label: input.label ?? null,
    p_validity_kind: input.validityKind,
    p_valid_from: input.validFrom ?? null,
    p_valid_to: input.validTo ?? null,
    p_void: Boolean(input.void),
  });
  if (error) throw error;
  const row = data as { ok?: boolean; vehicle?: ParentVehicle };
  if (!row?.vehicle) throw new Error('Could not save vehicle');
  return row.vehicle;
}

export async function myTrip(lineId?: string | null): Promise<MyTrip> {
  const { data, error } = await requireSupabase().rpc('dismissal_my_trip', {
    p_line_id: lineId ?? null,
  });
  if (error) throw error;
  return (data ?? { ok: false }) as MyTrip;
}

export async function uploadRidePhoto(ownerId: string, uri: string, mimeType: string): Promise<string> {
  const uploaded = await uploadPhotoPair({
    ownerId,
    uri,
    mimeType,
    prefix: 'ride',
    skipThumb: true,
  });
  return uploaded.storagePath;
}

export async function parentCheckIn(input: {
  lineId: string;
  studentIds: string[];
  imFirst?: boolean;
  storagePath?: string | null;
  aheadPlateRaw?: string | null;
  aheadPlateSource?: 'lpr' | 'typed' | 'stt' | null;
}): Promise<CheckInResult> {
  const { data, error } = await requireSupabase().rpc('dismissal_parent_check_in', {
    p_line_id: input.lineId,
    p_student_ids: input.studentIds,
    p_im_first: Boolean(input.imFirst),
    p_storage_path: input.storagePath ?? null,
    p_ahead_plate_raw: input.aheadPlateRaw ?? null,
    p_ahead_plate_source: input.aheadPlateSource ?? null,
  });
  if (error) {
    return { ok: false, message: 'Check in failed' };
  }
  const row = (data ?? { ok: false }) as CheckInResult;
  if (!row.ok) return { ok: false, message: 'Check in failed' };
  return row;
}

/** Parent ends waiting on this line — queue_events.kind=left only. Never released. */
export async function parentLeave(lineId: string): Promise<LeaveResult> {
  const { data, error } = await requireSupabase().rpc('dismissal_parent_leave', {
    p_line_id: lineId,
  });
  if (error) {
    return { ok: false, message: 'Leave failed' };
  }
  const row = (data ?? { ok: false }) as LeaveResult;
  if (!row.ok) return { ok: false, message: 'Leave failed' };
  return row;
}

export type RideLprResult = {
  plate: string | null;
  plateFront: string | null;
  plateBack: string | null;
  make: string | null;
  model: string | null;
  side: 'front' | 'back' | 'unknown';
  unreadable: boolean;
  document_kind?: string | null;
  tag_number?: string | null;
  riders?: string[];
  authorized_pickups?: string[];
  confidence?: number;
  /** 'multiple vehicles' when ride-lpr could not tell which car is the closest one (not a reject). */
  reject_reason?: string | null;
  /** Plates of other vehicles / reflections the model saw (never this car's plate). */
  other_plates_seen?: string[];
};

/** ride-lpr reject_reason when several cars were in frame and the closest one was not trusted. */
export const RIDE_LPR_MULTIPLE_VEHICLES = 'multiple vehicles';

export function isMultipleVehiclesRead(lpr: Pick<RideLprResult, 'reject_reason'>): boolean {
  return lpr.reject_reason === RIDE_LPR_MULTIPLE_VEHICLES;
}

export async function invokeRideLpr(storagePath: string): Promise<RideLprResult> {
  const empty: RideLprResult = {
    plate: null,
    plateFront: null,
    plateBack: null,
    make: null,
    model: null,
    side: 'unknown',
    unreadable: true,
  };
  const { data, error } = await requireSupabase().functions.invoke('ride-lpr', {
    body: { storagePath },
  });
  if (error || !data) return empty;
  const plate = typeof data.plate === 'string' ? data.plate : null;
  const plateFront = typeof data.plateFront === 'string' ? data.plateFront : null;
  const plateBack = typeof data.plateBack === 'string' ? data.plateBack : null;
  const make = typeof data.make === 'string' ? data.make : null;
  const model = typeof data.model === 'string' ? data.model : null;
  const side =
    data.side === 'front' || data.side === 'back' ? data.side : ('unknown' as const);
  const unreadable = Boolean(data.unreadable) || !plate;
  return {
    plate: unreadable ? null : plate,
    plateFront,
    plateBack,
    make,
    model,
    side,
    unreadable,
    document_kind: typeof data.document_kind === 'string' ? data.document_kind : null,
    tag_number: typeof data.tag_number === 'string' ? data.tag_number : null,
    riders: Array.isArray(data.riders) ? data.riders.filter((x: unknown) => typeof x === 'string') : [],
    authorized_pickups: Array.isArray(data.authorized_pickups)
      ? data.authorized_pickups.filter((x: unknown) => typeof x === 'string')
      : [],
    confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
    reject_reason: typeof data.reject_reason === 'string' ? data.reject_reason : null,
    other_plates_seen: Array.isArray(data.other_plates_seen)
      ? data.other_plates_seen.filter((x: unknown) => typeof x === 'string')
      : [],
  };
}

export async function queueLive(lineId: string): Promise<{
  ok: boolean;
  conflict_first?: boolean;
  slots?: Array<Record<string, unknown>>;
}> {
  const { data, error } = await requireSupabase().rpc('dismissal_queue_live', { p_line_id: lineId });
  if (error) throw error;
  return (data ?? { ok: false }) as { ok: boolean; conflict_first?: boolean; slots?: Array<Record<string, unknown>> };
}

export async function staffWalkPhoto(input: {
  lineId: string;
  storagePath: string;
  staffSeq: number;
  walkId?: string | null;
  plateRaw?: string | null;
  plateSource?: string | null;
  parentId?: string | null;
  studentIds?: string[];
  unknownFlag?: boolean;
}): Promise<Record<string, unknown>> {
  const { data, error } = await requireSupabase().rpc('dismissal_staff_walk_photo', {
    p_line_id: input.lineId,
    p_storage_path: input.storagePath,
    p_staff_seq: input.staffSeq,
    p_walk_id: input.walkId ?? null,
    p_plate_raw: input.plateRaw ?? null,
    p_plate_source: input.plateSource ?? null,
    p_parent_id: input.parentId ?? null,
    p_student_ids: input.studentIds ?? null,
    p_unknown_flag: Boolean(input.unknownFlag),
  });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

export async function orderFix(lineId: string, orderedParentIds: string[]): Promise<Record<string, unknown>> {
  const { data, error } = await requireSupabase().rpc('dismissal_order_fix', {
    p_line_id: lineId,
    p_ordered_parent_ids: orderedParentIds,
  });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

export async function releasePickup(lineId: string, parentId: string, studentIds?: string[]): Promise<void> {
  const { error } = await requireSupabase().rpc('dismissal_release', {
    p_line_id: lineId,
    p_parent_id: parentId,
    p_student_ids: studentIds ?? null,
  });
  if (error) throw error;
}

export async function nudgeParent(lineId: string, parentId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('dismissal_nudge', {
    p_line_id: lineId,
    p_parent_id: parentId,
  });
  if (error) throw error;
}

export async function staffAttachVehicle(input: {
  parentId: string;
  plateRaw: string;
  plateSource?: 'lpr' | 'typed' | 'stt';
  make?: string;
  model?: string;
  year?: number | null;
  label?: string;
}): Promise<void> {
  const { error } = await requireSupabase().rpc('staff_attach_vehicle', {
    p_parent_id: input.parentId,
    p_plate_raw: input.plateRaw,
    p_plate_source: input.plateSource ?? 'typed',
    p_make: input.make ?? null,
    p_model: input.model ?? null,
    p_year: input.year ?? null,
    p_label: input.label ?? null,
  });
  if (error) throw error;
}

export async function ensureDefaultLines(): Promise<DismissalLine[]> {
  const { data, error } = await requireSupabase().rpc('office_ensure_default_dismissal_lines');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function setPickupRestriction(input: {
  id?: string | null;
  studentId: string;
  parentId?: string | null;
  vehicleId?: string | null;
  reason?: string | null;
  active?: boolean;
}): Promise<void> {
  const { error } = await requireSupabase().rpc('office_set_pickup_restriction', {
    p_id: input.id ?? null,
    p_student_id: input.studentId,
    p_parent_id: input.parentId ?? null,
    p_vehicle_id: input.vehicleId ?? null,
    p_reason: input.reason ?? null,
    p_active: input.active ?? true,
  });
  if (error) throw error;
}

/**
 * Clear the saved restriction for student + optional parent.
 * Must pass p_id: office_set_pickup_restriction inserts when p_id is null even if active false.
 * Already-cleared pair: no-op (does not insert).
 */
export async function clearPickupRestriction(input: {
  studentId: string;
  parentId?: string | null;
}): Promise<void> {
  const studentId = input.studentId.trim();
  if (!studentId) throw new Error('student required');
  const parentId = input.parentId?.trim() ? input.parentId.trim() : null;

  let query = requireSupabase()
    .from('pickup_restrictions')
    .select('id, student_id, parent_id, active')
    .eq('student_id', studentId)
    .eq('active', true);
  query = parentId == null ? query.is('parent_id', null) : query.eq('parent_id', parentId);

  const { data, error } = await query;
  if (error) throw error;

  const ids = pickupRestrictionClearTargets(data ?? [], studentId, parentId);
  for (const id of ids) {
    await setPickupRestriction({
      id,
      studentId,
      parentId,
      active: false,
    });
  }
}

export async function archiveDayPhotos(schoolDate: string): Promise<{ archived_count?: number }> {
  const { data, error } = await requireSupabase().rpc('superintendent_archive_day_photos', {
    p_school_date: schoolDate,
  });
  if (error) throw error;
  return (data ?? {}) as { archived_count?: number };
}

export async function purgeOldRide(): Promise<Record<string, unknown>> {
  const { data, error } = await requireSupabase().rpc('dismissal_purge_old');
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}
