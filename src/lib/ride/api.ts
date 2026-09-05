import { uploadPhotoPair } from '@/lib/media/upload';
import { requireSupabase } from '@/lib/supabase/client';

export type DismissalLine = { id: string; name: string; sort: number; status: string };

export type ParentVehicle = {
  id: string;
  plate_raw: string;
  plate_norm: string;
  make: string | null;
  model: string | null;
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

export async function listDismissalLines(): Promise<DismissalLine[]> {
  const { data, error } = await requireSupabase().rpc('dismissal_list_lines');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function listParentVehicles(): Promise<ParentVehicle[]> {
  const { data, error } = await requireSupabase().rpc('parent_list_vehicles');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function upsertParentVehicle(input: {
  id?: string | null;
  plateRaw: string;
  make?: string;
  model?: string;
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

export async function invokeRideLpr(storagePath: string): Promise<{
  plate: string | null;
  unreadable: boolean;
}> {
  const { data, error } = await requireSupabase().functions.invoke('ride-lpr', {
    body: { storagePath },
  });
  if (error) return { plate: null, unreadable: true };
  const plate = typeof data?.plate === 'string' ? data.plate : null;
  return { plate, unreadable: Boolean(data?.unreadable) || !plate };
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
  label?: string;
}): Promise<void> {
  const { error } = await requireSupabase().rpc('staff_attach_vehicle', {
    p_parent_id: input.parentId,
    p_plate_raw: input.plateRaw,
    p_plate_source: input.plateSource ?? 'typed',
    p_make: input.make ?? null,
    p_model: input.model ?? null,
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
