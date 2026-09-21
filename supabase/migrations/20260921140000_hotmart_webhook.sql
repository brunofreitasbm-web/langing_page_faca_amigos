-- Webhook oficial da Hotmart (hotmart-webhook): log de eventos, carrinhos abandonados e colunas extras nas compras.
-- Sem policy de propósito: só a service role (Edge Functions) lê e escreve.

alter table public.fa_ebook_compras
  add column if not exists valor numeric(10, 2),
  add column if not exists origem_src text,
  add column if not exists origem_sck text,
  add column if not exists welcome_sent_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Todo evento recebido, cru, antes de qualquer processamento. event_id único = reentrega da Hotmart não duplica.
create table if not exists public.fa_hotmart_eventos (
  event_id text primary key,
  event text not null,
  transaction text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  payload jsonb not null
);
create index if not exists fa_hotmart_eventos_received_idx on public.fa_hotmart_eventos (received_at desc);
create index if not exists fa_hotmart_eventos_event_idx on public.fa_hotmart_eventos (event, received_at desc);

-- Quem abriu o checkout e não concluiu (PURCHASE_OUT_OF_SHOPPING_CART).
create table if not exists public.fa_ebook_carrinhos (
  id bigint generated always as identity primary key,
  email text not null,
  nome text,
  telefone text,
  product_id bigint,
  created_at timestamptz not null default now(),
  recuperado_at timestamptz
);
create index if not exists fa_ebook_carrinhos_email_idx on public.fa_ebook_carrinhos (lower(email), created_at desc);

alter table public.fa_hotmart_eventos enable row level security;
alter table public.fa_ebook_carrinhos enable row level security;
