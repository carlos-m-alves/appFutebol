-- ============================================
-- SCRIPT: seed_financas.sql
-- Insere dados falsos de financeiro para teste
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- Limpa dados financeiros existentes primeiro
delete from public.payments;
delete from public.group_expenses;
delete from public.player_fee_settings;
delete from public.group_finance_config;

-- ============================================
-- 1. CONFIGURAÇÃO FINANCEIRA DOS GRUPOS
-- ============================================
insert into public.group_finance_config (group_id, default_monthly_fee, default_match_fee, pix_key)
select
  g.id,
  30.00 as default_monthly_fee,
  15.00 as default_match_fee,
  '11999999999' as pix_key
from public.groups g
where not exists (
  select 1 from public.group_finance_config fc where fc.group_id = g.id
);

-- ============================================
-- 2. CONFIGURAÇÃO INDIVIDUAL DOS JOGADORES
-- ============================================
-- Define alguns como mensalistas com valor personalizado
insert into public.player_fee_settings (group_member_id, is_monthly_player, monthly_fee, match_fee)
select
  gm.id,
  true,
  40.00,
  null
from public.group_members gm
where gm.role = 'ADMIN'
  and not exists (
    select 1 from public.player_fee_settings pfs where pfs.group_member_id = gm.id
  );

-- Membros normais como rateio por partida
insert into public.player_fee_settings (group_member_id, is_monthly_player, monthly_fee, match_fee)
select
  gm.id,
  false,
  null,
  15.00
from public.group_members gm
where gm.role = 'MEMBER'
  and not exists (
    select 1 from public.player_fee_settings pfs where pfs.group_member_id = gm.id
  );

-- ============================================
-- 3. PAGAMENTOS (últimos 3 meses)
-- ============================================
-- Para cada grupo, cria pagamentos de mensalidade para os últimos 3 meses
-- e pagamentos de partida

do $$
declare
  grp record;
  mbr record;
  mes_ref text;
  data_pag timestamptz;
  admin_id uuid;
begin
  for grp in select * from public.groups loop
    -- Pega um admin do grupo para ser o "paid_by"
    select gm.profile_id into admin_id
    from public.group_members gm
    where gm.group_id = grp.id and gm.role = 'ADMIN'
    limit 1;

    if admin_id is null then continue; end if;

    -- Mensalidades: 3 meses atrás
    for mbr in
      select gm.id as member_id, pfs.is_monthly_player
      from public.group_members gm
      left join public.player_fee_settings pfs on pfs.group_member_id = gm.id
      where gm.group_id = grp.id
    loop
      for mes in 0..2 loop
        mes_ref := to_char(date_trunc('month', current_date - (mes || ' months')::interval), 'YYYY-MM');
        data_pag := date_trunc('month', current_date - (mes || ' months')::interval) + interval '5 days';

        -- Só insere pagamento se não existir (evita duplicar ao rodar de novo)
        if not exists (
          select 1 from public.payments p
          join public.group_members gm2 on gm2.id = p.group_member_id
          where gm2.group_id = grp.id and gm2.id = mbr.member_id
            and p.payment_type = 'MONTHLY' and p.reference_month = mes_ref
        ) then
          -- 80% dos membros pagaram
          if random() < 0.8 then
            insert into public.payments (group_member_id, payment_type, amount, reference_month, paid_at, paid_by, notes)
            values (
              mbr.member_id,
              'MONTHLY',
              case when mbr.is_monthly_player then 40.00 else 30.00 end,
              mes_ref,
              data_pag,
              admin_id,
              'Pagamento mensalidade ' || mes_ref
            );
          end if;
        end if;
      end loop;
    end loop;

    -- Pagamentos de partida (últimas partidas finalizadas)
    insert into public.payments (group_member_id, match_id, payment_type, amount, paid_at, paid_by, notes)
    select
      gm.id,
      m.id,
      'MATCH',
      15.00,
      m.match_date + interval '1 day',
      admin_id,
      'Taxa partida ' || to_char(m.match_date, 'DD/MM/YYYY')
    from public.matches m
    join public.group_members gm on gm.group_id = m.group_id
    where m.group_id = grp.id and m.status = 'FINISHED'
      and gm.role = 'MEMBER'
      and random() < 0.7
      and not exists (
        select 1 from public.payments p
        where p.group_member_id = gm.id and p.match_id = m.id
      );
  end loop;
end $$;

-- ============================================
-- 4. DESPESAS DO GRUPO
-- ============================================
do $$
declare
  grp record;
  admin_id uuid;
begin
  for grp in select * from public.groups loop
    select gm.profile_id into admin_id
    from public.group_members gm
    where gm.group_id = grp.id and gm.role = 'ADMIN'
    limit 1;

    if admin_id is null then continue; end if;

    -- Despesas variadas nos últimos 3 meses
    if not exists (select 1 from public.group_expenses where group_id = grp.id) then
      insert into public.group_expenses (group_id, description, amount, category, created_by, created_at) values
        (grp.id, 'Aluguel do campo', 120.00, 'FIELD', admin_id, current_date - interval '80 days'),
        (grp.id, 'Churrasco pós-jogo', 85.50, 'SNACKS', admin_id, current_date - interval '75 days'),
        (grp.id, 'Árbitro', 60.00, 'REFEREE', admin_id, current_date - interval '60 days'),
        (grp.id, 'Compra de bola nova', 89.90, 'EQUIPMENT', admin_id, current_date - interval '55 days'),
        (grp.id, 'Aluguel do campo', 120.00, 'FIELD', admin_id, current_date - interval '50 days'),
        (grp.id, 'Água e isotônico', 32.00, 'SNACKS', admin_id, current_date - interval '45 days'),
        (grp.id, 'Árbitro', 60.00, 'REFEREE', admin_id, current_date - interval '30 days'),
        (grp.id, 'Aluguel do campo', 120.00, 'FIELD', admin_id, current_date - interval '25 days'),
        (grp.id, 'Material de treino', 45.00, 'EQUIPMENT', admin_id, current_date - interval '15 days'),
        (grp.id, 'Aluguel do campo', 120.00, 'FIELD', admin_id, current_date - interval '5 days'),
        (grp.id, 'Camisas personalizadas', 250.00, 'OTHER', admin_id, current_date - interval '60 days'),
        (grp.id, 'Churrasco confraternização', 130.00, 'SNACKS', admin_id, current_date - interval '10 days');
    end if;
  end loop;
end $$;

-- ============================================
-- 5. RESUMO - VERIFICAÇÃO
-- ============================================
select 'group_finance_config' as tabela, count(*) as qtd from public.group_finance_config
union all select 'player_fee_settings', count(*) from public.player_fee_settings
union all select 'payments', count(*) from public.payments
union all select 'group_expenses', count(*) from public.group_expenses;
