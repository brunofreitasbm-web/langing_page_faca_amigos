#!/usr/bin/env bash
# Fecha o deploy da rodada 2: grava os secrets novos, guarda as chaves no Vault, refaz os crons e implanta a guia-sequence.
# Rode UMA vez, do Git Bash na raiz do repositório:   bash supabase/ops/finalizar-deploy.sh
#
# Precisa de: supabase CLI logado (supabase login), openssl e curl. As chaves são geradas aqui e NÃO são impressas.
# Já estão no ar (feito por MCP em 21/09): as 4 migrations e as funções behavior-test-*, wifi-*, hotmart-*, fa-health,
# fa-weekly-report. Falta só o que exige gravar secret e a guia-sequence (que passa a exigir a chave no ?run=1).
#
# Ordem importa: 1) secrets  2) Vault + crons com o cabeçalho (a função antiga ignora)  3) só então a guia-sequence nova.
# Opcional: ALERT_EMAIL="voce@exemplo.com,outra@exemplo.com" bash supabase/ops/finalizar-deploy.sh
set -euo pipefail

REF="ivjvpdzsfjdpyabbzzuj"
BASE="https://${REF}.supabase.co/functions/v1"
cd "$(dirname "$0")/../.."

SEQ="$(openssl rand -hex 32)"
OPS="$(openssl rand -hex 32)"

echo "1/5 Gravando secrets (SEQ_RUN_KEY, OPS_KEY, EBOOK2_URL)..."
SECRETS=(SEQ_RUN_KEY="$SEQ" OPS_KEY="$OPS" EBOOK2_URL="https://institutofacaamigos.com.br/codigo")
if [ -n "${ALERT_EMAIL:-}" ]; then SECRETS+=(ALERT_EMAIL="$ALERT_EMAIL"); fi
supabase secrets set "${SECRETS[@]}" --project-ref "$REF"

echo "2/5 Guardando as chaves no Vault e refazendo os crons..."
SQL="$(mktemp)"
trap 'rm -f "$SQL"' EXIT
cat > "$SQL" <<EOF
do \$\$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'seq_run_key';
  if v_id is null then perform vault.create_secret('${SEQ}', 'seq_run_key', 'chave x-run-key do ?run=1 da guia-sequence');
  else perform vault.update_secret(v_id, '${SEQ}'); end if;
  select id into v_id from vault.secrets where name = 'ops_key';
  if v_id is null then perform vault.create_secret('${OPS}', 'ops_key', 'chave x-ops-key de fa-health e fa-weekly-report');
  else perform vault.update_secret(v_id, '${OPS}'); end if;
end \$\$;

select cron.unschedule(jobid) from cron.job where jobname in ('guia-sequence-hourly', 'fa-health-daily', 'fa-weekly-report-monday');

select cron.schedule('guia-sequence-hourly', '0 * * * *', \$cron\$
  select net.http_post(
    url := 'https://${REF}.supabase.co/functions/v1/guia-sequence?run=1',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-run-key', (select decrypted_secret from vault.decrypted_secrets where name = 'seq_run_key')),
    body := '{}'::jsonb, timeout_milliseconds := 30000);
\$cron\$);

select cron.schedule('fa-health-daily', '0 10 * * *', \$cron\$
  select net.http_post(
    url := 'https://${REF}.supabase.co/functions/v1/fa-health',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-ops-key', (select decrypted_secret from vault.decrypted_secrets where name = 'ops_key')),
    body := '{}'::jsonb, timeout_milliseconds := 30000);
\$cron\$);

select cron.schedule('fa-weekly-report-monday', '0 11 * * 1', \$cron\$
  select net.http_post(
    url := 'https://${REF}.supabase.co/functions/v1/fa-weekly-report',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-ops-key', (select decrypted_secret from vault.decrypted_secrets where name = 'ops_key')),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
\$cron\$);
EOF
supabase db query --linked --file "$SQL" >/dev/null
echo "   crons refeitos."

echo "3/5 Implantando guia-sequence (agora exige x-run-key)..."
supabase functions deploy guia-sequence --no-verify-jwt --use-api --project-ref "$REF"

echo "4/5 Conferindo (sem enviar e-mail: ?dry=1)..."
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
echo "   guia-sequence sem chave (esperado 401): $(code -X POST "$BASE/guia-sequence?run=1&dry=1" -H 'Content-Type: application/json' -d '{}')"
echo "   guia-sequence com chave, dry (esperado 200): $(code -X POST "$BASE/guia-sequence?run=1&dry=1" -H 'Content-Type: application/json' -H "x-run-key: $SEQ" -d '{}')"
echo "   fa-health sem chave (esperado 401): $(code -X POST "$BASE/fa-health?dry=1" -H 'Content-Type: application/json' -d '{}')"
echo "   fa-health com chave, dry (esperado 200): $(code -X POST "$BASE/fa-health?dry=1" -H 'Content-Type: application/json' -H "x-ops-key: $OPS" -d '{}')"
echo "   fa-weekly-report com chave, dry (esperado 200): $(code -X POST "$BASE/fa-weekly-report?dry=1" -H 'Content-Type: application/json' -H "x-ops-key: $OPS" -d '{}')"

echo "5/5 Crons agendados:"
supabase db query --linked "select jobname, schedule, active from cron.job where jobname like 'guia-%' or jobname like 'fa-%' or jobname like 'hotmart-%' order by jobname"
echo
echo "Pronto. Falta, na Hotmart, cadastrar o webhook e gravar o hottok:  supabase secrets set HOTMART_HOTTOK=<hottok> --project-ref $REF"
