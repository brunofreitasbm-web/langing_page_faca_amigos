# Portal Wi-Fi da Clínica — MikroTik hEX S

Guia de instalação dos arquivos desta pasta no roteador e configuração mínima do RouterOS
para o hotspot funcionar como o plano de marketing prevê. Ver o plano completo em
`C:\Users\bruno\.claude\plans\mikrotik-hex-s-roteador-snazzy-rivest.md`.

## O que tem aqui

| Arquivo | Papel |
|---|---|
| `login.html` | Tela de cadastro (nome, WhatsApp, e-mail, LGPD, opt-in) — é o gate de marketing |
| `md5.js` | Suporte a CHAP-MD5, exigido pelo `login.html` |
| `alogin.html` | Tela pós-login — cupom, benefícios, CTAs, A/B, segmentação por horário |
| `status.html` | Reexibida quando o visitante já está logado e reabre o portal |
| `logout.html` | Tela de despedida |
| `error.html` + `errors.txt` | Erros traduzidos, com a voz da marca |
| `rlogin.html` | Login automático para MAC já conhecido (por cookie) |
| `logo.png` | Logo local — funciona mesmo antes do walled garden liberar CDNs externas |

## Importante: como funciona o "cadastro obrigatório" aqui

O RouterOS autentica hotspot por usuário/senha (ou RADIUS). Criar um usuário por família
exigiria RADIUS ou scripts complexos. Este portal usa a abordagem padrão do mercado para
esse cenário: **uma conta compartilhada de visitante** (`visitante` / `visitante`, com
`shared-users` alto) libera a internet de verdade, e o **gate de marketing** — o que faz
o cadastro ser obrigatório na prática — é o formulário do `login.html`: ele só envia o
usuário/senha compartilhados para o roteador *depois* de validar nome, WhatsApp, e-mail e
o aceite de LGPD, e só então grava o lead no backend. Ou seja: sem preencher o formulário,
a família não vê o botão de submeter a conta de visitante. Documento isso explicitamente
para não gerar expectativa de autenticação forte por família — se no futuro for necessário
(ex.: cobrança, RADIUS corporativo), o formulário pode ser adaptado sem tocar no visual.

## 1. Upload dos arquivos

Via WinBox → Files, ou FTP:

```
/flash/hotspot/login.html
/flash/hotspot/md5.js
/flash/hotspot/alogin.html
/flash/hotspot/status.html
/flash/hotspot/logout.html
/flash/hotspot/error.html
/flash/hotspot/errors.txt
/flash/hotspot/rlogin.html
/flash/hotspot/logo.png
```

Ou copie a pasta `hotspot/` inteira para dentro de `flash/hotspot/` mantendo os nomes.

## 2. Rede: isolar visitantes da rede administrativa

**Não coloque o hotspot na mesma rede dos computadores da clínica.** Prontuário e dados
de paciente não podem estar na mesma LAN de um visitante anônimo.

```
/interface bridge add name=bridge-visitantes
/interface bridge port add bridge=bridge-visitantes interface=ether2
/interface bridge port add bridge=bridge-visitantes interface=ether3
;; adicione as portas onde os access points existentes estão conectados

/ip pool add name=pool-visitantes ranges=10.20.0.10-10.20.0.250
/ip address add address=10.20.0.1/24 interface=bridge-visitantes
/ip dhcp-server add name=dhcp-visitantes interface=bridge-visitantes address-pool=pool-visitantes disabled=no
/ip dhcp-server network add address=10.20.0.0/24 gateway=10.20.0.1 dns-server=10.20.0.1
```

Os access points existentes ficam em **modo bridge** — só repassam Wi-Fi para essa rede,
sem autenticar nada por conta própria.

## 3. Criar o hotspot

```
/ip hotspot profile add name=hsprof-facaamigos html-directory=flash/hotspot \
    login-by=http-chap,http-pap use-radius=no

/ip hotspot add name=hotspot-clinica interface=bridge-visitantes \
    address-pool=pool-visitantes profile=hsprof-facaamigos disabled=no
```

O assistente `/ip hotspot setup` faz isso de forma guiada, se preferir — só aponte
`html-directory` para `flash/hotspot` ao final.

## 4. Conta compartilhada de visitante + perfil de sessão

```
/ip hotspot user profile add name=up-visitantes shared-users=254 \
    session-timeout=1h idle-timeout=15m keepalive-timeout=none \
    status-autorefresh=1m transparent-proxy=no

/ip hotspot user add name=visitante password=visitante profile=up-visitantes
```

- `session-timeout=1h` — cada visita renova a exibição do `alogin.html` (proposta 8 do plano).
- `shared-users=254` — permite todas as famílias conectadas ao mesmo tempo usarem a mesma conta.

## 5. Reconexão automática por MAC (proposta 5 do plano)

Para não mostrar o formulário de novo a quem já se cadastrou:

```
/ip hotspot user profile set up-visitantes http-cookie-lifetime=30d
```

O RouterOS grava um cookie no navegador do celular; na próxima conexão ele serve
`rlogin.html` automaticamente, sem passar pelo `login.html`. Funciona enquanto o
visitante usar o mesmo navegador (o botão "abrir no navegador padrão" do alogin.html
ajuda a manter o mesmo app entre visitas, em vez do navegador embutido do sistema).

## 6. Walled garden — o que precisa estar liberado ANTES do login

Sem isso o portal aparece quebrado (sem fonte, sem logo remoto, sem enviar o lead):

```
/ip hotspot walled-garden add dst-host=fonts.googleapis.com action=allow
/ip hotspot walled-garden add dst-host=fonts.gstatic.com action=allow
/ip hotspot walled-garden add dst-host=institutofacaamigos.com.br action=allow
/ip hotspot walled-garden add dst-host=*.institutofacaamigos.com.br action=allow
/ip hotspot walled-garden add dst-host=*.supabase.co action=allow
/ip hotspot walled-garden add dst-host=wa.me action=allow
/ip hotspot walled-garden add dst-host=api.whatsapp.com action=allow
/ip hotspot walled-garden add dst-host=www.googletagmanager.com action=allow
/ip hotspot walled-garden add dst-host=www.google-analytics.com action=allow
/ip hotspot walled-garden add dst-host=*.clarity.ms action=allow
```

Mantenha a lista curta. Cada domínio liberado aqui é acesso à internet **sem** login —
não adicione domínios "por garantia".

## 7. Erros traduzidos

```
/ip hotspot profile set hsprof-facaamigos html-directory=flash/hotspot
```

O RouterOS já lê `errors.txt` automaticamente do `html-directory` — não precisa de
comando adicional.

## 8. Retenção de log (recomendado para uma clínica)

```
/system logging action add name=log-remoto target=remote remote=<IP do seu servidor de log/SIEM>
/system logging add topics=hotspot action=log-remoto
```

Confirme o prazo de retenção adequado com quem cuida do jurídico/LGPD da clínica — isso
aqui é a configuração técnica, não uma orientação legal.

## 9. Teste ponta a ponta

1. Conectar um iPhone e um Android à rede de visitantes.
2. Confirmar que o CNA (Captive Network Assistant) abre sozinho.
3. Preencher o cadastro → confirmar que `alogin.html` aparece com a oferta.
4. Fechar a janela do CNA (comportamento normal do iOS/Android) e confirmar que o
   e-mail do cupom chegou mesmo assim — **este é o teste mais importante do projeto**.
5. Desconectar e reconectar o mesmo aparelho → confirmar que `rlogin.html` pula o
   formulário.
6. Com um aparelho **não logado**, tentar abrir um site fora da allowlist → deve cair
   no portal, não navegar livre.

## Fases 2 e 3 — já implementadas no repositório

- **Backend:** `supabase/migrations/20260919120000_fa_wifi_leads.sql` (tabela
  `fa_wifi_leads`) + `supabase/functions/wifi-lead-webhook/` (grava o lead, gera o
  cupom `ESPERA-XXXX` e envia por Brevo) + `supabase/functions/wifi-coupon-admin/`
  (consulta/resgate do cupom pelo balcão). **Nada disso foi implantado (deploy)** — são
  arquivos no repositório, aguardando `supabase db push` / deploy das functions.
- **Site:** `wifi.html` na raiz do repo, rota `/wifi` (via `cleanUrls` do Vercel),
  `noindex` em `robots.txt` e `vercel.json` — é para onde os botões "Ver todos os
  benefícios" do `alogin.html`/`status.html` apontam.
- **Variáveis de ambiente a configurar no projeto Supabase** (Dashboard → Edge
  Functions → Secrets), além das que `behavior-test-webhook` já usa
  (`BREVO_API_KEY`, `BREVO_FROM`, `BREVO_REPLY_TO`):
  - `WIFI_ADMIN_API_KEY` — segredo fixo usado pelo balcão para consultar/resgatar
    cupons via `wifi-coupon-admin` (`Authorization: Bearer <valor>`).

## Pendência intencional: painel de resgate

`wifi-coupon-admin` é uma API pura (sem tela) — uma solução provisória enquanto não se
integra uma aba "Wi-Fi" ao `admin.html` existente (que já tem login de gestor via
`behavior-test-admin`). Até lá, o resgate no balcão pode ser feito com uma chamada
simples, por exemplo:

```bash
# Consultar
curl -H "Authorization: Bearer $WIFI_ADMIN_API_KEY" \
  "https://ivjvpdzsfjdpyabbzzuj.supabase.co/functions/v1/wifi-coupon-admin?code=ESPERA-AB12"

# Resgatar (escolher UMA operação)
curl -X POST -H "Authorization: Bearer $WIFI_ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"code":"ESPERA-AB12","operation":"playground"}' \
  "https://ivjvpdzsfjdpyabbzzuj.supabase.co/functions/v1/wifi-coupon-admin"
```

Isso é aceitável para operar no dia 1, mas o ideal é uma tela — recomendo abrir isso
como um pedido separado quando o volume de resgates justificar.

## Outras pendências

- **Google Place ID:** o botão de avaliação em `alogin.html` usa um placeholder
  (`SEU_PLACE_ID_AQUI`) — substituir pelo Place ID real da clínica no Google Maps.
- **Alinhar o horário do Horário Inclusivo:** ver aviso na proposta 4 do plano —
  `playground.html` fala em 10h–12h, o portal fala em 10h–16h.
