-- Complementa fa_leads_teste_comportamento com o que o painel /admin
-- (behavior-test-admin) e o e-mail automático de resultado
-- (behavior-test-webhook, versão 2026-09-16) usam. Idempotente: pode ser
-- aplicada mesmo que parte disso já exista no projeto remoto.

-- 1) Colunas do painel (insight IA, contato, notas) ------------------------
alter table public.fa_leads_teste_comportamento
  add column if not exists ai_insight text,
  add column if not exists ai_insight_generated_at timestamptz,
  add column if not exists ai_insight_sent_at timestamptz,
  add column if not exists ai_insight_error text,
  add column if not exists admin_notes text,
  add column if not exists contacted_at timestamptz;

-- 2) E-mail automático de resultado enviado ao responsável ------------------
alter table public.fa_leads_teste_comportamento
  add column if not exists result_email_sent_at timestamptz,
  add column if not exists result_email_error text;

-- 2b) Opt-in de marketing (separado do consentimento obrigatório do
--     resultado): base da futura lista de nutrição de conteúdo para
--     pais/mães de crianças autistas e neurodivergentes.
alter table public.fa_leads_teste_comportamento
  add column if not exists marketing_opt_in boolean not null default false;

create index if not exists fa_leads_teste_marketing_opt_in_idx
  on public.fa_leads_teste_comportamento (marketing_opt_in)
  where marketing_opt_in = true;

-- 3) Novo status "abandoned": registro "started" que a mesma família
--    substituiu ao refazer o teste da mesma criança em 24h (evita inflar a
--    taxa de abandono real).
alter table public.fa_leads_teste_comportamento
  drop constraint if exists fa_leads_teste_comportamento_status_check;
alter table public.fa_leads_teste_comportamento
  add constraint fa_leads_teste_comportamento_status_check
  check (status in ('started', 'abandoned', 'completed', 'contacted'));

-- 4) Sessões do painel (login delegado ao Gestor do Sistema da Clínica) ----
create table if not exists public.fa_teste_admin_sessions (
  token text primary key,
  clinica_user_id text not null,
  admin_email text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists fa_teste_admin_sessions_expires_idx
  on public.fa_teste_admin_sessions (expires_at);

alter table public.fa_teste_admin_sessions enable row level security;
-- Sem policies: só a service role (Edge Function) lê/escreve.
