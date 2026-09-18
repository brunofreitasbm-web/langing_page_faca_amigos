-- Suporte ao questionário definitivo de 25 perguntas (versão "2026-09-18"),
-- que substitui o placeholder de 8 perguntas (versão "2026-09-16"). Leads
-- antigos são preservados e continuam legíveis no painel /admin pela
-- coluna test_version. Idempotente.

-- 1) Resultado por área + rate limit de conclusão --------------------------
alter table public.fa_leads_teste_comportamento
  add column if not exists results jsonb,            -- [{key,name,score,max,tier,tier_label}] x5 (v2026-09-18)
  add column if not exists completed_at timestamptz;  -- rate limit do "complete" + tempo de conclusão

comment on column public.fa_leads_teste_comportamento.results is
  'Somente v2026-09-18: resultado por área (5 áreas), sem o texto de feedback (esse é editável via fa_teste_config).';
comment on column public.fa_leads_teste_comportamento.score is
  'v2026-09-18: total de dificuldades, 0-40 (4 áreas não-prosociais, após inversão). v2026-09-16: soma positiva, 0-24.';
comment on column public.fa_leads_teste_comportamento.result_band is
  'v2026-09-18: pior faixa entre as 5 áreas (tier1|tier2|tier3). v2026-09-16: recomendado|observar|esperado.';

create index if not exists fa_leads_teste_test_version_idx
  on public.fa_leads_teste_comportamento (test_version);

-- 2) Textos do resultado, editáveis pelo Gestor no painel /admin -----------
-- Guarda só os overrides (nome de área / rótulo de faixa / texto de
-- orientação); os defaults ficam hardcoded nas Edge Functions. Ausência de
-- override = usa o default. Sem policies: só a service role (Edge Function)
-- lê/escreve.
create table if not exists public.fa_teste_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.fa_teste_config enable row level security;
