-- Registra qual e-book foi oferecido ao lead na tela de resultado do mapa comportamental.
--
-- Por quê: o behavior-test-webhook escolhe entre "O Brincar com Propósito" (/guia) e "O Código do
-- Desenvolvimento Infantil" (/codigo) em tempo de execução, conforme tier3Count e o secret EBOOK2_URL.
-- Essa escolha não ficava gravada em lugar nenhum, então a guia-sequence mandava os e-mails do guia
-- mesmo para quem tinha visto o Código na tela. Com a coluna, a sequência manda o produto certo.
--
-- Sem policy de propósito: só a service role (Edge Functions) lê e escreve. RLS já está habilitado na tabela.

alter table public.fa_leads_teste_comportamento
  add column if not exists ebook_offer text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fa_leads_teste_comportamento_ebook_offer_check'
  ) then
    alter table public.fa_leads_teste_comportamento
      add constraint fa_leads_teste_comportamento_ebook_offer_check
      check (ebook_offer is null or ebook_offer in ('guia', 'codigo'));
  end if;
end $$;

comment on column public.fa_leads_teste_comportamento.ebook_offer is
  'E-book oferecido na tela de resultado: guia | codigo. NULL = nenhuma oferta exibida (EBOOK_URL ausente) ou lead anterior a 22/09/2026.';
