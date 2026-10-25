import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agrupar, destinos, limparCopy, normalizarClassificacao, remocaoSegura, slugificar, textoPlano,
} from '../regras.mjs';

const DONOS = ['fotografa@x.com', 'dono@x.com'];
const arq = (o) => ({ id: 'id' + Math.random(), name: 'IMG_1.HEIC', mimeType: 'image/heif', md5Checksum: 'm1',
  createdTime: '2026-10-20T10:00:00Z', owners: [{ emailAddress: 'fotografa@x.com' }], aprovada: false, pastaIgnorada: false, caminho: 'IMG_1.HEIC', ...o });

const boa = (o) => normalizarClassificacao({
  e_foto: true, unidade: 'playground', qualidade: 4, problemas: [], crianca_identificavel: true, sensivel: false,
  motivo_sensivel: '', descricao: 'x', alt: 'Criança pintando', rotulo: 'Oficina', legenda: 'Cores', kicker: '🎨 Oficina',
  headline: 'Hoje tem <em>tinta</em>.', plano: 0, sfx: 'plim', foco_x: 40, foco_y: 30, slug: 'Oficina de Camiseta', ...o,
});

test('arquivo de dono fora da lista nunca entra', () => {
  const { grupos, ignorados } = agrupar([arq({ owners: [{ emailAddress: 'intruso@x.com' }], aprovada: true })], DONOS);
  assert.equal(grupos.size, 0);
  assert.equal(ignorados.length, 1);
});

test('cópia em "Aprovadas" aprova o grupo; cópia de intruso em "Aprovadas" não aprova', () => {
  let { grupos } = agrupar([arq({}), arq({ aprovada: true })], DONOS);
  assert.equal(grupos.size, 1);
  assert.equal(grupos.get('m1').aprovada, true);
  ({ grupos } = agrupar([arq({}), arq({ aprovada: true, owners: [{ emailAddress: 'intruso@x.com' }] })], DONOS));
  assert.equal(grupos.get('m1').aprovada, false);
});

test('pasta ignorada e arquivo que não é imagem ficam de fora', () => {
  const { grupos } = agrupar([arq({ pastaIgnorada: true }), arq({ md5Checksum: 'm2', mimeType: 'application/pdf', name: 'a.pdf' })], DONOS);
  assert.equal(grupos.size, 0);
});

test('destinos: TV automática, site só aprovado', () => {
  assert.deepEqual(destinos(boa(), false), { tv: true, site: false, motivo: '' });
  assert.deepEqual(destinos(boa(), true), { tv: true, site: true, motivo: '' });
});

test('destinos: logo, sensível e baixa qualidade ficam fora', () => {
  assert.equal(destinos(boa({ e_foto: false }), true).site, false);
  assert.equal(destinos(boa({ sensivel: true, motivo_sensivel: 'choro' }), true).tv, false);
  assert.equal(destinos(boa({ qualidade: 2 }), false).tv, false);
  // aprovação humana passa por cima da nota baixa
  assert.equal(destinos(boa({ qualidade: 2 }), true).site, true);
});

test('destinos: clínica com criança reconhecível espera aprovação', () => {
  assert.equal(destinos(boa({ unidade: 'clinica' }), false).tv, false);
  assert.equal(destinos(boa({ unidade: 'clinica', crianca_identificavel: false }), false).tv, true);
  assert.equal(destinos(boa({ unidade: 'clinica' }), true).tv, true);
});

test('destinos: "outro" só vai ao site com aprovação, nunca à TV', () => {
  assert.equal(destinos(boa({ unidade: 'outro' }), false).tv, false);
  assert.deepEqual(destinos(boa({ unidade: 'outro' }), true), { tv: false, site: true, motivo: '' });
});

test('limparCopy escapa HTML e mantém só <em>', () => {
  assert.equal(limparCopy('Oi <script>x</script> <em>já</em>!'), 'Oi &lt;script&gt;x&lt;/script&gt; <em>já</em>.');
  assert.equal(limparCopy('<em>aberto sem fechar'), 'aberto sem fechar');
  assert.equal(limparCopy('Ele dirige — você filma'), 'Ele dirige, você filma');
  assert.ok(textoPlano(limparCopy('palavra '.repeat(20), 30)).length <= 30);
});

test('normalizar: valores fora do esquema viram padrão seguro', () => {
  const c = normalizarClassificacao({ unidade: 'marte', qualidade: 9, foco_x: 300, sfx: 'boom', crianca_identificavel: undefined });
  assert.equal(c.unidade, 'outro');
  assert.equal(c.qualidade, 5);
  assert.equal(c.foco_x, 100);
  assert.equal(c.sfx, 'plim');
  assert.equal(c.e_foto, false);
  // na dúvida, trata como criança reconhecível
  assert.equal(c.crianca_identificavel, true);
});

test('normalizar: copy com termo proibido é descartada', () => {
  assert.equal(boa({ headline: 'Resultado garantido' }).headline, '');
  assert.equal(boa({ legenda: 'Para a criança especial' }).legenda, '');
});

test('slug sem acento e curto', () => {
  assert.equal(slugificar('Menino na Lamborghini Ãmarela!!'), 'menino-na-lamborghini-amarela');
  assert.equal(slugificar(''), 'foto');
});

test('trava de remoção em massa', () => {
  assert.equal(remocaoSegura(20, 3), true);
  assert.equal(remocaoSegura(20, 11), false);
  assert.equal(remocaoSegura(3, 3), true);
});
