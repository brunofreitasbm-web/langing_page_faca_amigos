-- Eventos do Instituto (palestras, reuniões, treinamentos), 01/10/2026.
-- Inscrição com vagas reais, lista de espera com promoção automática, voucher nominal (EVT-XXXX-XXXX),
-- check-in por QR/código e ingresso pago via Hotmart. Ver PUBLICAR.md (Lote 7) e as funções
-- eventos-public / eventos-admin / eventos-dispatch em supabase/functions/.
--
-- Mesmo padrão das demais tabelas do site: RLS ligado e nenhuma policy (só a service role, usada pelas
-- Edge Functions, lê e escreve). Toda mudança de estado passa por uma função SQL que trava a linha do
-- evento (select ... for update): duas pessoas na última vaga nunca ficam as duas confirmadas.
-- Idempotente: pode ser aplicada mais de uma vez.

-- ---------------------------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------------------------

create table if not exists public.fa_eventos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null,
  categoria text not null check (categoria in ('palestra', 'reuniao', 'treinamento')),
  publico text not null check (publico in ('familias', 'profissionais')),
  formato text not null default 'presencial' check (formato in ('presencial', 'online', 'hibrido')),

  descricao_curta text,
  descricao_longa text,
  -- Promessa concreta do evento ("você sai com..."), 3 a 5 benefícios, para quem é e para quem não é.
  promessa text,
  beneficios text[] not null default '{}' check (cardinality(beneficios) <= 5),
  para_quem text,
  nao_e_para text,

  local_nome text,
  local_endereco text,
  online_url text,               -- NUNCA na view pública: só no ingresso de quem está confirmado
  inicio timestamptz not null,
  fim timestamptz not null,
  inscricoes_ate timestamptz,    -- null = até o início
  capa_url text,
  palestrante_nome text,
  palestrante_bio text,
  palestrante_foto_url text,

  status text not null default 'draft' check (status in ('draft', 'published', 'closed', 'cancelled')),
  comunidade_whatsapp_url text,  -- link da Comunidade WhatsApp (só avisos); nulo usa o padrão da trilha
  cancel_mensagem text,          -- texto do admin no e-mail de cancelamento
  criado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fa_eventos_fim_apos_inicio check (fim > inicio)
);

comment on table public.fa_eventos is
  'Eventos do Instituto (palestra, reunião, treinamento). status published = aparece no site; closed = passou/encerrado; cancelled = cancelado (e-mail em massa).';

create index if not exists fa_eventos_status_inicio_idx on public.fa_eventos (status, inicio);

create table if not exists public.fa_eventos_ingresso_tipos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.fa_eventos (id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('gratuito', 'pago')),
  vagas integer not null default 0 check (vagas >= 0),   -- pago: 0 = quem controla é a Hotmart
  hotmart_product_id bigint unique,
  hotmart_checkout_url text,
  preco_exibicao text,
  ordem smallint not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fa_eventos_ingresso_tipos_nome_unq unique (evento_id, nome),
  constraint fa_eventos_ingresso_tipos_pago_chk check (
    tipo = 'gratuito' or (hotmart_product_id is not null and hotmart_checkout_url is not null)
  )
);

comment on table public.fa_eventos_ingresso_tipos is
  'Tipos de ingresso de um evento. gratuito: vagas controladas aqui (lista de espera). pago: checkout Hotmart, a venda aprovada vira inscrição confirmada.';

create index if not exists fa_eventos_ingresso_tipos_evento_idx on public.fa_eventos_ingresso_tipos (evento_id, ordem);

create table if not exists public.fa_eventos_inscricoes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.fa_eventos (id) on delete cascade,
  tipo_id uuid not null references public.fa_eventos_ingresso_tipos (id),

  nome text not null,
  email text not null check (email = lower(email)),
  whatsapp text,
  perfil text check (perfil in ('mae_pai_responsavel', 'educador', 'terapeuta', 'outro')),

  status text not null check (status in ('confirmada', 'lista_espera', 'promovida', 'cancelada', 'expirada')),
  origem text not null default 'site' check (origem in ('site', 'hotmart', 'admin')),
  codigo text not null unique,   -- EVT-XXXX-XXXX; só vale como ingresso quando status = confirmada

  -- LGPD
  consent_at timestamptz not null,
  marketing_opt_in_email boolean not null default false,
  marketing_opt_in_whatsapp boolean not null default false,

  -- Atribuição (mesmos nomes de fa_leads_teste_comportamento)
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  gclid text, fbclid text, referrer text, landing_page text, ip text, user_agent text,

  -- Pago (Hotmart)
  hotmart_transaction text unique,
  valor_pago numeric(10, 2),

  -- Linha do tempo
  lista_espera_em timestamptz,
  promovida_em timestamptz,
  promocao_prazo timestamptz,
  confirmada_em timestamptz,
  cancelada_em timestamptz,
  cancel_motivo text,
  checkin_at timestamptz,
  checkin_por text,

  brevo_sync_at timestamptz,
  brevo_sync_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.fa_eventos_inscricoes is
  'Uma linha por pessoa por evento. confirmada = tem vaga; lista_espera = aguarda; promovida = ganhou vaga e tem até promocao_prazo para confirmar; expirada = não confirmou; cancelada = desistiu/cancelada.';

create index if not exists fa_eventos_inscricoes_evento_status_idx on public.fa_eventos_inscricoes (evento_id, status);
create index if not exists fa_eventos_inscricoes_tipo_status_idx on public.fa_eventos_inscricoes (tipo_id, status);
create index if not exists fa_eventos_inscricoes_email_idx on public.fa_eventos_inscricoes (email);
create index if not exists fa_eventos_inscricoes_ip_idx on public.fa_eventos_inscricoes (ip, created_at desc);
create index if not exists fa_eventos_inscricoes_promocao_idx on public.fa_eventos_inscricoes (promocao_prazo) where status = 'promovida';
-- Uma inscrição ATIVA por pessoa por evento: resolve duplicata e "está na fila mas já tem vaga".
create unique index if not exists fa_eventos_inscricoes_ativa_unq
  on public.fa_eventos_inscricoes (evento_id, email)
  where status in ('confirmada', 'lista_espera', 'promovida');

-- Reserva-antes-de-enviar (igual a fa_teste_ebook_seq) e fila para envios em massa (status pendente).
create table if not exists public.fa_eventos_envios (
  id bigint generated always as identity primary key,
  inscricao_id uuid not null references public.fa_eventos_inscricoes (id) on delete cascade,
  tipo text not null check (tipo in (
    'voucher', 'voucher_reenvio', 'lista_espera', 'promocao',
    'lembrete_24h', 'lembrete_hoje', 'pos_evento', 'evento_cancelado'
  )),
  status text not null default 'pendente' check (status in ('pendente', 'enviado', 'erro')),
  brevo_message_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

comment on table public.fa_eventos_envios is
  'E-mails da inscrição. A chave única (inscricao_id, tipo) impede envio duplicado; voucher_reenvio pode repetir. status pendente = na fila do eventos-dispatch.';

create unique index if not exists fa_eventos_envios_unq
  on public.fa_eventos_envios (inscricao_id, tipo) where tipo <> 'voucher_reenvio';
create index if not exists fa_eventos_envios_pendente_idx on public.fa_eventos_envios (created_at) where status = 'pendente';
create index if not exists fa_eventos_envios_inscricao_idx on public.fa_eventos_envios (inscricao_id, created_at desc);

alter table public.fa_eventos enable row level security;
alter table public.fa_eventos_ingresso_tipos enable row level security;
alter table public.fa_eventos_inscricoes enable row level security;
alter table public.fa_eventos_envios enable row level security;

-- ---------------------------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------------------------

create or replace function public.fa_eventos_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fa_eventos_updated_at on public.fa_eventos;
create trigger fa_eventos_updated_at before update on public.fa_eventos
  for each row execute function public.fa_eventos_set_updated_at();
drop trigger if exists fa_eventos_ingresso_tipos_updated_at on public.fa_eventos_ingresso_tipos;
create trigger fa_eventos_ingresso_tipos_updated_at before update on public.fa_eventos_ingresso_tipos
  for each row execute function public.fa_eventos_set_updated_at();
drop trigger if exists fa_eventos_inscricoes_updated_at on public.fa_eventos_inscricoes;
create trigger fa_eventos_inscricoes_updated_at before update on public.fa_eventos_inscricoes
  for each row execute function public.fa_eventos_set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- View pública: só contagens, nenhuma coluna de inscrição, sem online_url/comunidade.
-- ---------------------------------------------------------------------------------------------

create or replace view public.fa_eventos_publicos
with (security_invoker = true)
as
select
  e.id, e.slug, e.titulo, e.categoria, e.publico, e.formato,
  e.descricao_curta, e.descricao_longa, e.promessa, e.beneficios, e.para_quem, e.nao_e_para,
  e.local_nome, e.local_endereco, e.inicio, e.fim, e.inscricoes_ate, e.capa_url,
  e.palestrante_nome, e.palestrante_bio, e.palestrante_foto_url, e.status,
  coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', t.id, 'nome', t.nome, 'tipo', t.tipo, 'vagas', t.vagas,
             'preco_exibicao', t.preco_exibicao, 'hotmart_checkout_url', t.hotmart_checkout_url,
             'ordem', t.ordem, 'ocupadas', c.ocupadas, 'lista_espera', c.lista_espera
           ) order by t.ordem, t.nome)
      from public.fa_eventos_ingresso_tipos t
      cross join lateral (
        select count(*) filter (where i.status in ('confirmada', 'promovida')) as ocupadas,
               count(*) filter (where i.status = 'lista_espera') as lista_espera
          from public.fa_eventos_inscricoes i
         where i.tipo_id = t.id
      ) c
     where t.evento_id = e.id and t.ativo
  ), '[]'::jsonb) as tipos
from public.fa_eventos e
where e.status in ('published', 'closed');

comment on view public.fa_eventos_publicos is
  'O que a página pública pode saber: evento + tipos com contagens (count(*)). Nunca expõe dados de inscritos, online_url nem link da comunidade.';

-- ---------------------------------------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------------------------------------

-- Código legível, alfabeto sem O/0/I/1 (mesmo do cupom Wi-Fi).
create or replace function public.fa_eventos_gerar_codigo()
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_out text := '';
  i int;
begin
  for i in 1..8 loop
    v_out := v_out || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
  end loop;
  return 'EVT-' || substr(v_out, 1, 4) || '-' || substr(v_out, 5, 4);
end;
$$;

-- Interna: promove da lista de espera enquanto houver vaga. Quem chama JÁ travou a linha do evento.
create or replace function public.fa_eventos_promover_proximo(p_tipo_id uuid)
returns uuid[]
language plpgsql
set search_path = ''
as $$
declare
  v_tipo record;
  v_inicio timestamptz;
  v_ocupadas int;
  v_proxima uuid;
  v_promovidas uuid[] := '{}';
begin
  select t.*, e.inicio, e.status as evento_status
    into v_tipo
    from public.fa_eventos_ingresso_tipos t
    join public.fa_eventos e on e.id = t.evento_id
   where t.id = p_tipo_id;
  if not found or v_tipo.tipo <> 'gratuito' or v_tipo.evento_status <> 'published' or v_tipo.inicio <= now() then
    return v_promovidas;
  end if;
  v_inicio := v_tipo.inicio;

  loop
    select count(*) into v_ocupadas
      from public.fa_eventos_inscricoes
     where tipo_id = p_tipo_id and status in ('confirmada', 'promovida');
    exit when v_ocupadas >= v_tipo.vagas;

    select id into v_proxima
      from public.fa_eventos_inscricoes
     where tipo_id = p_tipo_id and status = 'lista_espera'
     order by lista_espera_em, created_at
     limit 1;
    exit when v_proxima is null;

    update public.fa_eventos_inscricoes
       set status = 'promovida',
           promovida_em = now(),
           promocao_prazo = least(now() + interval '24 hours', v_inicio)
     where id = v_proxima;
    v_promovidas := v_promovidas || v_proxima;
  end loop;
  return v_promovidas;
end;
$$;

-- Inscrição pelo site (ou pelo admin, p_origem = 'admin'). Confirma se há vaga, senão entra na fila.
create or replace function public.fa_eventos_inscrever(
  p_tipo_id uuid,
  p_nome text,
  p_email text,
  p_whatsapp text,
  p_perfil text,
  p_consent_at timestamptz,
  p_optin_email boolean,
  p_optin_whatsapp boolean,
  p_origem text,
  p_rastreio jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_tipo record;
  v_evento record;
  v_email text := lower(trim(p_email));
  v_existente record;
  v_ocupadas int;
  v_status text;
  v_codigo text;
  v_id uuid;
  v_posicao int;
  v_tentativa int := 0;
begin
  select * into v_tipo from public.fa_eventos_ingresso_tipos where id = p_tipo_id;
  if not found then
    return jsonb_build_object('resultado', 'tipo_indisponivel');
  end if;

  select * into v_evento from public.fa_eventos where id = v_tipo.evento_id for update;

  if not v_tipo.ativo then
    return jsonb_build_object('resultado', 'tipo_indisponivel');
  end if;
  if v_evento.status <> 'published' or now() > coalesce(v_evento.inscricoes_ate, v_evento.inicio) then
    return jsonb_build_object('resultado', 'inscricoes_encerradas');
  end if;
  if v_tipo.tipo <> 'gratuito' and coalesce(p_origem, 'site') <> 'admin' then
    return jsonb_build_object('resultado', 'tipo_pago', 'hotmart_checkout_url', v_tipo.hotmart_checkout_url);
  end if;

  select id, status, codigo into v_existente
    from public.fa_eventos_inscricoes
   where evento_id = v_evento.id and email = v_email
     and status in ('confirmada', 'lista_espera', 'promovida')
   limit 1;
  if found then
    return jsonb_build_object('resultado', 'ja_inscrito', 'inscricao_id', v_existente.id,
                              'status', v_existente.status, 'codigo', v_existente.codigo);
  end if;

  select count(*) into v_ocupadas
    from public.fa_eventos_inscricoes
   where tipo_id = p_tipo_id and status in ('confirmada', 'promovida');
  v_status := case when v_ocupadas < v_tipo.vagas then 'confirmada' else 'lista_espera' end;

  loop
    v_tentativa := v_tentativa + 1;
    v_codigo := public.fa_eventos_gerar_codigo();
    begin
      insert into public.fa_eventos_inscricoes (
        evento_id, tipo_id, nome, email, whatsapp, perfil, status, origem, codigo,
        consent_at, marketing_opt_in_email, marketing_opt_in_whatsapp,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid, fbclid,
        referrer, landing_page, ip, user_agent,
        lista_espera_em, confirmada_em
      ) values (
        v_evento.id, p_tipo_id, trim(p_nome), v_email, nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), ''),
        nullif(p_perfil, ''), v_status, coalesce(p_origem, 'site'), v_codigo,
        coalesce(p_consent_at, now()), coalesce(p_optin_email, false), coalesce(p_optin_whatsapp, false),
        p_rastreio->>'utm_source', p_rastreio->>'utm_medium', p_rastreio->>'utm_campaign',
        p_rastreio->>'utm_content', p_rastreio->>'utm_term', p_rastreio->>'gclid', p_rastreio->>'fbclid',
        p_rastreio->>'referrer', p_rastreio->>'landing_page', p_rastreio->>'ip', p_rastreio->>'user_agent',
        case when v_status = 'lista_espera' then now() end,
        case when v_status = 'confirmada' then now() end
      ) returning id into v_id;
      exit;
    exception when unique_violation then
      -- Colisão de código: tenta outro. Corrida na chave "ativa": devolve a inscrição que ganhou.
      if v_tentativa >= 5 or sqlerrm like '%fa_eventos_inscricoes_ativa_unq%' then
        select id, status, codigo into v_existente
          from public.fa_eventos_inscricoes
         where evento_id = v_evento.id and email = v_email
           and status in ('confirmada', 'lista_espera', 'promovida')
         limit 1;
        if found then
          return jsonb_build_object('resultado', 'ja_inscrito', 'inscricao_id', v_existente.id,
                                    'status', v_existente.status, 'codigo', v_existente.codigo);
        end if;
        raise;
      end if;
    end;
  end loop;

  if v_status = 'lista_espera' then
    select 1 + count(*) into v_posicao
      from public.fa_eventos_inscricoes
     where tipo_id = p_tipo_id and status = 'lista_espera' and id <> v_id
       and (lista_espera_em, created_at) < (
         select lista_espera_em, created_at from public.fa_eventos_inscricoes where id = v_id
       );
    return jsonb_build_object('resultado', 'lista_espera', 'inscricao_id', v_id, 'codigo', v_codigo, 'posicao', v_posicao);
  end if;
  return jsonb_build_object('resultado', 'confirmada', 'inscricao_id', v_id, 'codigo', v_codigo);
end;
$$;

-- Venda aprovada na Hotmart. Sem checagem de vagas (a Hotmart controla o estoque do pago).
-- Se a pessoa já tinha inscrição ativa no evento (ex.: gratuita), vira a paga no mesmo registro e a vaga
-- gratuita volta para a fila.
create or replace function public.fa_eventos_confirmar_hotmart(
  p_tipo_id uuid,
  p_email text,
  p_nome text,
  p_whatsapp text,
  p_transaction text,
  p_valor numeric,
  p_rastreio jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_tipo record;
  v_evento record;
  v_email text := lower(trim(p_email));
  v_existente record;
  v_codigo text;
  v_id uuid;
  v_promovidas uuid[] := '{}';
  v_tentativa int := 0;
begin
  select * into v_tipo from public.fa_eventos_ingresso_tipos where id = p_tipo_id;
  if not found then
    return jsonb_build_object('resultado', 'tipo_indisponivel');
  end if;
  select * into v_evento from public.fa_eventos where id = v_tipo.evento_id for update;

  select id, codigo into v_existente from public.fa_eventos_inscricoes where hotmart_transaction = p_transaction;
  if found then
    return jsonb_build_object('resultado', 'ja_processada', 'inscricao_id', v_existente.id, 'codigo', v_existente.codigo, 'novo', false);
  end if;

  select id, codigo, status, tipo_id into v_existente
    from public.fa_eventos_inscricoes
   where evento_id = v_evento.id and email = v_email
     and status in ('confirmada', 'lista_espera', 'promovida')
   limit 1;
  if found then
    update public.fa_eventos_inscricoes
       set tipo_id = p_tipo_id, status = 'confirmada', origem = 'hotmart',
           hotmart_transaction = p_transaction, valor_pago = p_valor,
           confirmada_em = now(), promocao_prazo = null,
           nome = coalesce(nullif(trim(p_nome), ''), nome),
           whatsapp = coalesce(nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), ''), whatsapp)
     where id = v_existente.id;
    if v_existente.tipo_id <> p_tipo_id and v_existente.status in ('confirmada', 'promovida') then
      v_promovidas := public.fa_eventos_promover_proximo(v_existente.tipo_id);
    end if;
    return jsonb_build_object('resultado', 'confirmada', 'inscricao_id', v_existente.id, 'codigo', v_existente.codigo,
                              'novo', true, 'promovidas', to_jsonb(v_promovidas));
  end if;

  loop
    v_tentativa := v_tentativa + 1;
    v_codigo := public.fa_eventos_gerar_codigo();
    begin
      insert into public.fa_eventos_inscricoes (
        evento_id, tipo_id, nome, email, whatsapp, status, origem, codigo, consent_at,
        hotmart_transaction, valor_pago, confirmada_em,
        utm_source, utm_medium, utm_campaign, utm_content, landing_page
      ) values (
        v_evento.id, p_tipo_id, coalesce(nullif(trim(p_nome), ''), v_email), v_email,
        nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), ''),
        'confirmada', 'hotmart', v_codigo, now(),
        p_transaction, p_valor, now(),
        coalesce(p_rastreio->>'utm_source', 'hotmart'), p_rastreio->>'utm_medium', p_rastreio->>'utm_campaign',
        p_rastreio->>'utm_content', p_rastreio->>'landing_page'
      ) returning id into v_id;
      exit;
    exception when unique_violation then
      if v_tentativa >= 5 then raise; end if;
    end;
  end loop;
  return jsonb_build_object('resultado', 'confirmada', 'inscricao_id', v_id, 'codigo', v_codigo, 'novo', true, 'promovidas', '[]'::jsonb);
end;
$$;

-- Cancela (participante, admin ou reembolso Hotmart) e, se liberou vaga gratuita, promove o próximo da fila.
create or replace function public.fa_eventos_cancelar(p_inscricao_id uuid, p_motivo text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_ins record;
  v_evento record;
  v_tipo record;
  v_promovidas uuid[] := '{}';
begin
  select * into v_ins from public.fa_eventos_inscricoes where id = p_inscricao_id;
  if not found then
    return jsonb_build_object('resultado', 'nao_cancelavel');
  end if;
  select * into v_evento from public.fa_eventos where id = v_ins.evento_id for update;

  update public.fa_eventos_inscricoes
     set status = 'cancelada', cancelada_em = now(), cancel_motivo = left(coalesce(p_motivo, ''), 200)
   where id = p_inscricao_id and status in ('confirmada', 'lista_espera', 'promovida')
   returning * into v_ins;
  if not found then
    return jsonb_build_object('resultado', 'nao_cancelavel');
  end if;

  select * into v_tipo from public.fa_eventos_ingresso_tipos where id = v_ins.tipo_id;
  if v_tipo.tipo = 'gratuito' then
    v_promovidas := public.fa_eventos_promover_proximo(v_ins.tipo_id);
  end if;
  return jsonb_build_object('resultado', 'cancelada', 'inscricao_id', p_inscricao_id, 'promovidas', to_jsonb(v_promovidas));
end;
$$;

-- Promovido da fila confirma a vaga dentro do prazo.
create or replace function public.fa_eventos_confirmar_promocao(p_inscricao_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_ins record;
  v_evento_id uuid;
begin
  select evento_id into v_evento_id from public.fa_eventos_inscricoes where id = p_inscricao_id;
  if v_evento_id is null then
    return jsonb_build_object('resultado', 'invalida');
  end if;
  perform 1 from public.fa_eventos where id = v_evento_id for update;

  update public.fa_eventos_inscricoes
     set status = 'confirmada', confirmada_em = now()
   where id = p_inscricao_id and status = 'promovida' and promocao_prazo >= now()
   returning * into v_ins;
  if found then
    return jsonb_build_object('resultado', 'confirmada', 'inscricao_id', v_ins.id, 'codigo', v_ins.codigo);
  end if;

  select * into v_ins from public.fa_eventos_inscricoes where id = p_inscricao_id;
  if v_ins.status = 'confirmada' then
    return jsonb_build_object('resultado', 'ja_confirmada', 'inscricao_id', v_ins.id, 'codigo', v_ins.codigo);
  elsif v_ins.status = 'promovida' or v_ins.status = 'expirada' then
    return jsonb_build_object('resultado', 'expirada');
  end if;
  return jsonb_build_object('resultado', 'invalida', 'status', v_ins.status);
end;
$$;

-- Admin confirma alguém da fila na mão (ignora prazo e vagas: overbooking consciente).
create or replace function public.fa_eventos_confirmar_manual(p_inscricao_id uuid, p_admin text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_ins record;
  v_evento_id uuid;
begin
  select evento_id into v_evento_id from public.fa_eventos_inscricoes where id = p_inscricao_id;
  if v_evento_id is null then
    return jsonb_build_object('resultado', 'invalida');
  end if;
  perform 1 from public.fa_eventos where id = v_evento_id for update;

  update public.fa_eventos_inscricoes
     set status = 'confirmada', confirmada_em = now(), promocao_prazo = null,
         cancel_motivo = null
   where id = p_inscricao_id and status in ('lista_espera', 'promovida', 'expirada')
   returning * into v_ins;
  if not found then
    select status into v_ins from public.fa_eventos_inscricoes where id = p_inscricao_id;
    return jsonb_build_object('resultado', 'invalida', 'status', v_ins.status);
  end if;
  return jsonb_build_object('resultado', 'confirmada', 'inscricao_id', v_ins.id, 'codigo', v_ins.codigo);
end;
$$;

-- Check-in na porta. Um UPDATE condicional: a segunda leitura do mesmo QR nunca passa.
create or replace function public.fa_eventos_checkin(p_codigo text, p_admin text, p_evento_id uuid default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_ins record;
  v_evento record;
begin
  update public.fa_eventos_inscricoes
     set checkin_at = now(), checkin_por = p_admin
   where codigo = v_codigo and status = 'confirmada' and checkin_at is null
     and (p_evento_id is null or evento_id = p_evento_id)
   returning * into v_ins;
  if found then
    select titulo into v_evento from public.fa_eventos where id = v_ins.evento_id;
    return jsonb_build_object('resultado', 'ok', 'inscricao_id', v_ins.id, 'nome', v_ins.nome,
                              'evento_titulo', v_evento.titulo, 'checkin_at', v_ins.checkin_at,
                              'tipo_nome', (select nome from public.fa_eventos_ingresso_tipos where id = v_ins.tipo_id));
  end if;

  select * into v_ins from public.fa_eventos_inscricoes where codigo = v_codigo;
  if not found then
    return jsonb_build_object('resultado', 'nao_encontrado');
  end if;
  select titulo into v_evento from public.fa_eventos where id = v_ins.evento_id;
  if p_evento_id is not null and v_ins.evento_id <> p_evento_id then
    return jsonb_build_object('resultado', 'evento_diferente', 'nome', v_ins.nome, 'evento_titulo', v_evento.titulo);
  end if;
  if v_ins.status <> 'confirmada' then
    return jsonb_build_object('resultado', 'nao_confirmada', 'nome', v_ins.nome, 'status', v_ins.status);
  end if;
  return jsonb_build_object('resultado', 'ja_fez_checkin', 'nome', v_ins.nome, 'checkin_at', v_ins.checkin_at);
end;
$$;

-- Cron: promoções vencidas viram expiradas e a vaga passa para o próximo.
create or replace function public.fa_eventos_expirar_promocoes()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_evento_id uuid;
  v_tipo_id uuid;
  v_expiradas uuid[] := '{}';
  v_promovidas uuid[] := '{}';
  v_ids uuid[];
begin
  for v_evento_id in
    select distinct evento_id from public.fa_eventos_inscricoes
     where status = 'promovida' and promocao_prazo < now()
  loop
    perform 1 from public.fa_eventos where id = v_evento_id for update;
    with u as (
      update public.fa_eventos_inscricoes
         set status = 'expirada'
       where evento_id = v_evento_id and status = 'promovida' and promocao_prazo < now()
       returning id
    )
    select coalesce(array_agg(id), '{}') into v_ids from u;
    v_expiradas := v_expiradas || v_ids;

    for v_tipo_id in
      select distinct tipo_id from public.fa_eventos_inscricoes where id = any(v_ids)
    loop
      v_promovidas := v_promovidas || public.fa_eventos_promover_proximo(v_tipo_id);
    end loop;
  end loop;
  return jsonb_build_object('expiradas', to_jsonb(v_expiradas), 'promovidas', to_jsonb(v_promovidas));
end;
$$;

-- Admin aumentou as vagas: puxa da fila o que couber.
create or replace function public.fa_eventos_reprocessar_vagas(p_evento_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_tipo_id uuid;
  v_promovidas uuid[] := '{}';
begin
  perform 1 from public.fa_eventos where id = p_evento_id for update;
  for v_tipo_id in
    select id from public.fa_eventos_ingresso_tipos where evento_id = p_evento_id and tipo = 'gratuito' and ativo
  loop
    v_promovidas := v_promovidas || public.fa_eventos_promover_proximo(v_tipo_id);
  end loop;
  return jsonb_build_object('promovidas', to_jsonb(v_promovidas));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Cron: a cada 30 min o eventos-dispatch expira promoções, drena a fila e manda os lembretes.
-- Lê a chave x-ops-key do Vault (secret 'ops_key', criado por supabase/ops/agendar-rotinas.sql).
-- ---------------------------------------------------------------------------------------------

select cron.unschedule(jobid) from cron.job where jobname = 'fa-eventos-dispatch';

select cron.schedule(
  'fa-eventos-dispatch',
  '*/30 * * * *',
  $$
    select net.http_post(
      url := 'https://ivjvpdzsfjdpyabbzzuj.supabase.co/functions/v1/eventos-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-ops-key', (select decrypted_secret from vault.decrypted_secrets where name = 'ops_key')
      ),
      body := '{"action":"run"}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);
