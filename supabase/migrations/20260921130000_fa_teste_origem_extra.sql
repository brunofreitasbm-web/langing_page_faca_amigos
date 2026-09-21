-- Origem completa do lead do teste (Instagram, Google Ads, QR): termo, click ids.
alter table public.fa_leads_teste_comportamento
  add column if not exists utm_term text,
  add column if not exists gclid text,
  add column if not exists fbclid text;
