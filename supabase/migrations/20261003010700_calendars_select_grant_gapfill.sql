-- DB gap-fill (2026-10-02): grant from 20260912000000_calendar_r2_phase_a_schema.sql never applied live.
-- Harmless: calendars has RLS enabled and no policies, so direct reads return zero rows.
-- Applied live via apply_migration; this file records it so repo matches DB.

grant select on table public.calendars to authenticated; -- RLS still denies without policy
