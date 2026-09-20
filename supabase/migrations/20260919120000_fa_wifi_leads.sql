-- Leads do portal Wi-Fi (hotspot MikroTik hEX S) instalado na clínica
-- (Rua Boaventura da Silva, 1573 · Fátima). Espelha o padrão de
-- fa_leads_teste_comportamento: RLS habilitado, sem policy para
-- anon/authenticated — só a Edge Function wifi-lead-webhook (service role)
-- lê e escreve. Ver hotspot/LEIA-ME-HOTSPOT.md para o fluxo completo.

create table if not exists public.fa_wifi_leads (
  id uuid primary key default gen_random_uuid(),

  guardian_name text not null,
  guardian_phone text not null,
  guardian_email text not null,
  mac text,

  -- Cupom "Sala de Espera" (ver plano: meia inclusiva + fidelidade + 5 min
  -- Circuito, um benefício por resgate, no máximo um resgate por dia).
  coupon_code text not null unique,
  coupon_status text not null default 'issued'
    check (coupon_status in ('issued', 'redeemed', 'expired')),
  coupon_operation text
    check (coupon_operation in ('playground', 'circuito')),
  coupon_expires_at timestamptz not null,
  last_redeemed_at timestamptz,
  redeemed_count integer not null default 0,

  visit_count integer not null default 1,

  -- LGPD
  consent_at timestamptz not null,
  marketing_opt_in_whatsapp boolean not null default false,
  marketing_opt_in_email boolean not null default false,

  -- A/B e segmentação (ver alogin.html)
  variant text,

  -- Atribuição de marketing
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  landing_page text,
  ip text,
  user_agent text,

  -- Rastreio do e-mail transacional (Brevo)
  email_sent_at timestamptz,
  email_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fa_wifi_leads_guardian_phone_idx
  on public.fa_wifi_leads (guardian_phone);
create index if not exists fa_wifi_leads_guardian_email_idx
  on public.fa_wifi_leads (guardian_email);
create index if not exists fa_wifi_leads_mac_idx
  on public.fa_wifi_leads (mac);
create index if not exists fa_wifi_leads_coupon_code_idx
  on public.fa_wifi_leads (coupon_code);
create index if not exists fa_wifi_leads_created_at_idx
  on public.fa_wifi_leads (created_at desc);

alter table public.fa_wifi_leads enable row level security;
-- Sem policies: anon/authenticated não têm acesso nenhum. Só a service role
-- (usada pela Edge Function wifi-lead-webhook e pelo lookup de cupom do
-- balcão) lê e escreve.

create or replace function public.fa_wifi_leads_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fa_wifi_leads_updated_at on public.fa_wifi_leads;
create trigger fa_wifi_leads_updated_at
  before update on public.fa_wifi_leads
  for each row
  execute function public.fa_wifi_leads_set_updated_at();
