-- ============================================
-- MIGRATION: Auto-triggers for betting system
-- ============================================

-- Trigger function to auto-generate markets when match starts
-- and auto-settle when evaluation closes
create or replace function public.handle_match_betting()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Generate markets when match status changes to IN_PROGRESS
  if NEW.status = 'IN_PROGRESS' and (OLD.status is distinct from 'IN_PROGRESS') then
    perform public.generate_match_markets(NEW.id);
  end if;

  -- Settle markets when evaluation closes
  if NEW.evaluation_closed = true and (OLD.evaluation_closed is distinct from true) then
    perform public.settle_match_markets(NEW.id);
  end if;

  return NEW;
end;
$$;

-- Attach trigger to matches table
drop trigger if exists trg_match_betting on public.matches;
create trigger trg_match_betting
  after update on public.matches
  for each row
  when (
    (NEW.status = 'IN_PROGRESS' and OLD.status is distinct from 'IN_PROGRESS')
    or (NEW.evaluation_closed = true and OLD.evaluation_closed is distinct from true)
  )
  execute function public.handle_match_betting();
