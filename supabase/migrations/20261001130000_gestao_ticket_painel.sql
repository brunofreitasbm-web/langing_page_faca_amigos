-- Hub de Gestão -> painel /admin (aba Eventos): ticket de uso único, 60 segundos.
-- gestao-hub (action launch, app "eventos") grava o ticket; gestao-hub (action admin_sso) troca por
-- uma sessão do painel (fa_teste_admin_sessions). Só o SHA-256 do ticket fica no banco.
create table if not exists public.fa_gestao_tickets_painel (
  ticket_hash text primary key,
  email text not null references public.fa_gestao_contas (email) on delete cascade,
  expires_at timestamptz not null,
  usado_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists fa_gestao_tickets_painel_expires_idx
  on public.fa_gestao_tickets_painel (expires_at);

alter table public.fa_gestao_tickets_painel enable row level security;
-- Sem policies: só a service role (Edge Function) lê/escreve.
