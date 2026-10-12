-- Tabela de Avaliações / Depoimentos e NPS do Playground FaçaAmigos
-- Criada em 12/10/2026 para automação da Prova Social vinda do Sistema App Playground

create table if not exists public.fa_playground_reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_role text, -- ex: '3ª visita', '5ª visita'
  visit_count integer not null default 1 check (visit_count >= 1),
  rating integer not null default 5 check (rating >= 1 and rating <= 5),
  nps_score integer check (nps_score is null or (nps_score >= 0 and nps_score <= 10)),
  comment text not null check (length(comment) > 2),
  unit text default 'Playground (Parque Shopping)',
  source text not null default 'app_nps', -- 'app_nps', 'google', 'totem'
  visit_date text, -- ex: 'ago/2026', 'out/2026'
  approved boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text
);

-- Índices para consulta rápida da landing page e do admin
create index if not exists idx_fa_playground_reviews_approved on public.fa_playground_reviews(approved, featured desc, created_at desc);
create index if not exists idx_fa_playground_reviews_source on public.fa_playground_reviews(source);

-- RLS
alter table public.fa_playground_reviews enable row level security;

-- Leitura pública (anon / authenticated): somente avaliações aprovadas pela moderação
drop policy if exists fa_playground_reviews_public_read on public.fa_playground_reviews;
create policy fa_playground_reviews_public_read on public.fa_playground_reviews
  for select using (approved = true);

-- Inserção pública/anon (ex.: automação do App Playground enviando novo NPS):
-- Sempre nasce com approved = false para garantir moderação humana antes de ir para o site.
drop policy if exists fa_playground_reviews_insert on public.fa_playground_reviews;
create policy fa_playground_reviews_insert on public.fa_playground_reviews
  for insert with check (approved = false);

-- Seed inicial com as avaliações reais existentes identificando o número de visitas
insert into public.fa_playground_reviews (author_name, author_role, visit_count, rating, nps_score, comment, unit, source, visit_date, approved, featured, approved_at)
values
  ('Vanessa Santos', '3ª visita', 3, 5, 10, 'Espaço maravilhoso! Acolhedor, brinquedos novos e limpos, equipe nota 10!', 'Playground (Parque Shopping)', 'app_nps', 'ago/2026', true, true, now()),
  ('Eledes Failache', '5ª visita', 5, 5, 10, 'Super amo esse lugar, deixo meus filhos com tranquilidade.', 'Playground (Parque Shopping)', 'google', 'jul/2026', true, true, now()),
  ('Ana Monteiro', '2ª visita', 2, 5, 10, 'Amei muito, meu filho se sentiu muito seguro e brincou bastante! ♥️♥️', 'Playground (Parque Shopping)', 'app_nps', 'jul/2026', true, true, now())
on conflict do nothing;

comment on table public.fa_playground_reviews is 'Depoimentos e avaliações de NPS do Sistema App Playground para exibição na prova social do site com contagem de visitas.';
