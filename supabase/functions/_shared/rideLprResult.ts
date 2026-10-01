/**
 * Shapes ride-lpr model JSON into the response the app reads. Pure (no Deno / npm imports) so
 * node tests can feed it mocked model output. Moved out of ride-lpr/index.ts unchanged except for
 * the closest-vehicle guard (other_plates_seen + "multiple vehicles").
 */
import {
  applyClosestVehicleGuard,
  cleanOtherPlates,
  cleanPlateText,
  isMultipleVehiclesReason,
  MULTIPLE_VEHICLES,
} from './closestVehicle.ts';

function cleanText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.replace(/\s+/g, ' ').trim();
  return value || null;
}

function cleanSide(raw: unknown): 'front' | 'back' | 'unknown' {
  const value = typeof raw === 'string' ? raw.toLowerCase().trim() : '';
  if (value === 'front' || value === 'back') return value;
  return 'unknown';
}

export const KINDS = [
  'vehicle_photo',
  'hang_tag',
  'check_in_sheet',
  'authorized_pickup',
  'rejected',
  'unknown',
] as const;
export type DocKind = (typeof KINDS)[number];

function cleanKind(raw: unknown): DocKind {
  const v = typeof raw === 'string' ? raw.toLowerCase().trim() : '';
  if ((KINDS as readonly string[]).includes(v)) return v as DocKind;
  return 'unknown';
}

function cleanNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const t = cleanText(item);
    if (t) out.push(t);
  }
  return out;
}

function cleanTag(raw: unknown): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(Math.trunc(raw));
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return digits || null;
}

export type RideLprResponse = {
  document_kind: DocKind;
  plate: string | null;
  plateFront: string | null;
  plateBack: string | null;
  make: string | null;
  model: string | null;
  side: 'front' | 'back' | 'unknown';
  tag_number: string | null;
  riders: string[];
  authorized_pickups: string[];
  unreadable: boolean;
  confidence: number;
  reject_reason: string | null;
  other_plates_seen: string[];
  error?: string;
};

export function emptyResult(extra: Partial<RideLprResponse> = {}): RideLprResponse {
  return {
    document_kind: 'unknown',
    plate: null,
    plateFront: null,
    plateBack: null,
    make: null,
    model: null,
    side: 'unknown',
    tag_number: null,
    riders: [],
    authorized_pickups: [],
    unreadable: true,
    confidence: 0,
    reject_reason: null,
    other_plates_seen: [],
    ...extra,
  };
}

export function shapeRideLprResult(parsed: Record<string, unknown>): RideLprResponse {
  let document_kind = cleanKind(parsed.document_kind);
  const plate = cleanPlateText(parsed.plate);
  let plateFront = cleanPlateText(parsed.plateFront) || null;
  let plateBack = cleanPlateText(parsed.plateBack) || null;
  const side = cleanSide(parsed.side);
  if (!plateFront && side === 'front' && plate) plateFront = plate;
  if (!plateBack && side === 'back' && plate) plateBack = plate;

  let make = cleanText(parsed.make);
  let model = cleanText(parsed.model);
  const tag_number = cleanTag(parsed.tag_number ?? parsed.tagNumber);
  const riders = cleanNames(parsed.riders);
  const authorized_pickups = cleanNames(parsed.authorized_pickups ?? parsed.authorizedPickups);
  const rawReject = cleanText(parsed.reject_reason ?? parsed.rejectReason);
  const multipleVehicles = isMultipleVehiclesReason(rawReject);
  const reject_reason = multipleVehicles ? null : rawReject;
  const other_plates_seen = cleanOtherPlates(parsed.other_plates_seen ?? parsed.otherPlatesSeen);
  const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;

  // "multiple vehicles" is a car photo we refuse to read, not a non-ride document.
  if (multipleVehicles && (document_kind === 'unknown' || document_kind === 'rejected')) {
    document_kind = 'vehicle_photo';
  }

  if (document_kind === 'unknown') {
    if (reject_reason) document_kind = 'rejected';
    else if (tag_number || (riders.length && !plate && !make)) document_kind = 'hang_tag';
    else if (authorized_pickups.length) document_kind = 'authorized_pickup';
    else if (riders.length > 1) document_kind = 'check_in_sheet';
    else if (plate || plateFront || plateBack) document_kind = 'vehicle_photo';
  }

  if (document_kind === 'rejected') {
    return {
      ...emptyResult(),
      document_kind,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      reject_reason: reject_reason || 'not a vehicle or rider document',
    };
  }

  if (document_kind === 'vehicle_photo') {
    const guardOk = multipleVehicles
      ? false
      : applyClosestVehicleGuard({ plates: [plate, plateFront, plateBack], other_plates_seen, confidence }).ok;
    if (!guardOk) {
      return {
        ...emptyResult(),
        document_kind,
        side,
        confidence,
        reject_reason: MULTIPLE_VEHICLES,
        other_plates_seen,
      };
    }
  }

  const primary =
    plateBack && plateFront && plateBack !== plateFront ? plateBack : plate || plateBack || plateFront || '';
  let unreadable = Boolean(parsed.unreadable);
  if (document_kind === 'vehicle_photo') {
    if (!primary) {
      unreadable = true;
      make = null;
      model = null;
    }
  }
  if (document_kind === 'hang_tag' && !primary && !tag_number) unreadable = true;

  return {
    document_kind,
    plate: document_kind === 'vehicle_photo' && unreadable ? null : primary || null,
    plateFront,
    plateBack,
    make,
    model,
    side,
    tag_number,
    riders,
    authorized_pickups,
    unreadable:
      document_kind === 'vehicle_photo'
        ? unreadable || !primary
        : Boolean(unreadable) && !tag_number && riders.length === 0 && !primary,
    confidence,
    reject_reason: null,
    other_plates_seen,
  };
}
