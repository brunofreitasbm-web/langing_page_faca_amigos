-- Leads do "Teste de Comportamento" (Instituto FaçaAmigos), capturado em
-- /teste no hub estático (institutofacaamigos.com.br). Espelha o padrão de
-- fa_kiosk_job_applications: RLS habilitado, sem policy para anon/authenticated
-- — só a Edge Function (service role) lê/escreve. Leitura da idealizadora
-- fica para uma etapa seguinte (painel ou export, como export-job-applications).

create table if not exists public.fa_leads_teste_comportamento (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'started'
    check (status in ('started', 'completed', 'contacted')),

  -- Etapa 0 (fricção mínima, gravada mesmo se abandonar depois)
  child_first_name text not null,
  child_age_range text not null,
  guardian_relation text not null,

  -- Etapa final (gate de contato)
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  preferred_unit text,

  -- Respostas e resultado — score sempre recalculado no servidor
  answers jsonb not null default '[]'::jsonb,
  score integer,
  result_band text,
  test_version text not null,

  -- LGPD
  consent_at timestamptz,

  -- Atribuição de marketing
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  referrer text,
  landing_page text,
  ip text,
  user_agent text,

  -- Rastreio do e-mail transacional (Brevo)
  email_sent_at timestamptz,
  email_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fa_leads_teste_guardian_email_idx
  on public.fa_leads_teste_comportamento (guardian_email);
create index if not exists fa_leads_teste_guardian_phone_idx
  on public.fa_leads_teste_comportamento (guardian_phone);
create index if not exists fa_leads_teste_created_at_idx
  on public.fa_leads_teste_comportamento (created_at desc);
create index if not exists fa_leads_teste_status_idx
  on public.fa_leads_teste_comportamento (status);

alter table public.fa_leads_teste_comportamento enable row level security;
-- Sem policies: anon/authenticated não têm acesso nenhum. Só a service role
-- (usada pela Edge Function behavior-test-webhook) lê e escreve.

create or replace function public.fa_leads_teste_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fa_leads_teste_updated_at on public.fa_leads_teste_comportamento;
create trigger fa_leads_teste_updated_at
  before update on public.fa_leads_teste_comportamento
  for each row
  execute function public.fa_leads_teste_set_updated_at();
