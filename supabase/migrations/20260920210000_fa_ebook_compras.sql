-- Compras do guia "O Brincar com Propósito" na Hotmart, sincronizadas pela Edge Function hotmart-sync
-- (consulta a API de vendas da Hotmart). Serve para tirar quem já comprou da sequência de e-mails de venda.
-- Sem policy de propósito: só a service role (Edge Functions) lê e escreve.

create table if not exists public.fa_ebook_compras (
  transaction text primary key,
  email text not null,
  buyer_name text,
  product_id bigint,
  status text not null,
  approved_at timestamptz,
  synced_at timestamptz not null default now()
);

create index if not exists fa_ebook_compras_email_idx on public.fa_ebook_compras (lower(email));

comment on table public.fa_ebook_compras is
  'Vendas aprovadas do e-book na Hotmart (uma linha por transação). Alimentada por hotmart-sync.';

alter table public.fa_ebook_compras enable row level security;
