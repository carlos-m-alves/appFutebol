-- ============================================
-- MIGRATION: Add modality column to matches
-- ============================================

alter table public.matches
add column if not exists modality text not null default 'SUICO'
  check (modality in ('SUICO', 'CAMPO', 'FUTSAL'));
