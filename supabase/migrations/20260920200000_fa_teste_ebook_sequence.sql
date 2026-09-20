-- Sequência de e-mails do guia "O Brincar com Propósito" (dias 1, 3 e 6 depois do resultado do mapa).
-- Enviada pela Edge Function guia-sequence (chamada de hora em hora por pg_cron), só para quem
-- marcou o opt-in DEPOIS de o texto novo do checkbox ("novidades e ofertas") ir ao ar.
-- Sem policy de propósito: só a service role (Edge Functions) lê e escreve.

alter table public.fa_leads_teste_comportamento
  add column if not exists ebook_seq_stopped_at timestamptz,
  add column if not exists ebook_seq_stop_reason text;

comment on column public.fa_leads_teste_comportamento.ebook_seq_stopped_at is
  'Quando a sequência de e-mails do guia foi interrompida para este lead (descadastro, bloqueio ou saída da lista no Brevo).';

create table if not exists public.fa_teste_ebook_seq (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.fa_leads_teste_comportamento(id) on delete cascade,
  step smallint not null check (step in (1, 2, 3)),
  sent_at timestamptz not null default now(),
  brevo_message_id text,
  unique (lead_id, step)
);

comment on table public.fa_teste_ebook_seq is
  'Um registro por e-mail da sequência do guia enviado a um lead (a chave única impede envio duplicado).';

alter table public.fa_teste_ebook_seq enable row level security;
