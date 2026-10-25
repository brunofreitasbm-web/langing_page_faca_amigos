// Fluxo completo do sincronizador com Drive, Storage e IA falsos (sem rede). As imagens são de
// verdade: um JPEG gerado com sharp passa por previa() e versoes().
import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import * as imagemReal from '../imagem.mjs';
import { sincronizar } from '../sync.mjs';

const JPEG = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#e44' } }).jpeg().toBuffer();
const imagem = { ...imagemReal, decodificar: async (b) => b };

function storageFalso() {
  const objetos = new Map();
  return {
    objetos,
    async garantirBuckets() {},
    async lerJson(b, c) { const o = objetos.get(`${b}/${c}`); return o ? JSON.parse(o.dados) : null; },
    async gravar(b, c, dados, tipo, cache) { objetos.set(`${b}/${c}`, { dados: dados.toString(), tipo, cache }); },
    async apagar(b, cs) { for (const c of cs) objetos.delete(`${b}/${c}`); },
  };
}

const arq = (id, md5, o = {}) => ({ id, name: `${id}.jpg`, mimeType: 'image/jpeg', md5Checksum: md5, size: '1000',
  createdTime: `2026-10-2${id.length}T10:00:00Z`, owners: [{ emailAddress: 'fotografa@x.com' }], aprovada: false, pastaIgnorada: false, caminho: `${id}.jpg`, ...o });

const respostas = {
  carro: { e_foto: true, tema: 'crianca_dirigindo', qualidade: 5, problemas: [], crianca_identificavel: true, sensivel: false, motivo_sensivel: '',
    descricao: 'menino no carro', alt: 'Menino ao volante', rotulo: 'Lamborghini', legenda: 'No volante', kicker: '🏎️ Lamborghini',
    headline: 'Olha a cara de quem <em>chegou</em>.', plano: 30, sfx: 'vroom', foco_x: 50, foco_y: 40, slug: 'menino-lamborghini' },
  logo: { e_foto: false, tema: 'outro', qualidade: 5, problemas: [], crianca_identificavel: false, sensivel: false, motivo_sensivel: '',
    descricao: 'logo', alt: 'Logo', rotulo: 'Logo', legenda: '', kicker: '', headline: '', plano: 0, sfx: 'plim', foco_x: 50, foco_y: 50, slug: 'logo' },
  clinica: { e_foto: true, tema: 'clinica_terapia', qualidade: 4, problemas: [], crianca_identificavel: true, sensivel: false, motivo_sensivel: '',
    descricao: 'sessão', alt: 'Sala de terapia', rotulo: 'Sala', legenda: 'Sala', kicker: '🧩 Clínica', headline: 'Cuidado', plano: 0, sfx: 'plim', foco_x: 50, foco_y: 50, slug: 'sala-terapia' },
};

function cenario(lista) {
  const chamadas = { classificar: 0, baixar: 0 };
  return {
    chamadas,
    drive: { listar: async () => lista(), baixar: async () => { chamadas.baixar++; return JPEG; } },
    classificar: async (b64, ctx) => { chamadas.classificar++; assert.ok(b64.length > 100); return { dados: respostas[ctx.nome.split('.')[0].replace(/\d+$/, '')] }; },
  };
}

const config = { donos: 'fotografa@x.com', maxPorRodada: 25 };

test('rodada completa: publica na TV certa, descarta logo, segura clínica, aprova para o site', async () => {
  const storage = storageFalso();
  let lista = [arq('carro', 'a'), arq('logo', 'b'), arq('clinica', 'c'), arq('carro2', 'a')];
  const c = cenario(() => lista);
  let r = await sincronizar({ ...c, storage, imagem, config, log: () => {} });

  // carro e carro2 têm o mesmo md5: uma foto só, uma chamada à IA
  assert.equal(c.chamadas.classificar, 3);
  assert.equal(r.manifesto.length, 1);
  const m = r.manifesto[0];
  assert.equal(m.tv, true);
  assert.equal(m.tema, 'crianca_dirigindo');
  assert.equal(m.unidade, 'circuito');
  assert.equal(m.site, false);
  assert.equal(m.plano, 30);
  assert.equal(m.pos, '50% 40%');
  assert.match(m.src, /^img\/menino-lamborghini-/);
  assert.ok(storage.objetos.has(`fotos-site/${m.src}.webp`));
  assert.ok(storage.objetos.has(`fotos-site/${m.src}-p.webp`));
  assert.equal(storage.objetos.get(`fotos-site/${m.src}.webp`).cache, 'max-age=31536000');
  // nada da clínica nem do logo foi enviado ao bucket público
  assert.equal([...storage.objetos.keys()].filter((k) => k.startsWith('fotos-site/img/')).length, 3);
  // o manifesto público não leva ID do Drive nem descrição interna
  const pub = storage.objetos.get('fotos-site/manifest.json').dados;
  assert.ok(!pub.includes('menino no carro') && !pub.includes('"carro"'));

  // 2ª rodada sem mudanças: não chama a IA de novo
  r = await sincronizar({ ...c, storage, imagem, config, log: () => {} });
  assert.equal(c.chamadas.classificar, 3);

  // A clínica vai para "Aprovadas": entra na TV da clínica e no site, sem nova chamada à IA
  lista = [arq('carro', 'a'), arq('logo', 'b'), arq('clinica', 'c', { aprovada: true })];
  r = await sincronizar({ ...c, storage, imagem, config, log: () => {} });
  assert.equal(c.chamadas.classificar, 3);
  const cl = r.manifesto.find((x) => x.unidade === 'clinica');
  assert.equal(cl.tv, true);
  assert.equal(cl.tema, 'clinica_terapia');
  assert.equal(cl.site, true);

  // Sai de "Aprovadas": some do ar e os arquivos são apagados
  lista = [arq('carro', 'a'), arq('logo', 'b'), arq('clinica', 'c')];
  r = await sincronizar({ ...c, storage, imagem, config, log: () => {} });
  assert.equal(r.manifesto.find((x) => x.unidade === 'clinica'), undefined);
  assert.ok(!storage.objetos.has(`fotos-site/${cl.src}.webp`));

  // Fotógrafa apaga o carro do Drive: sai do ar
  lista = [arq('logo', 'b'), arq('clinica', 'c')];
  r = await sincronizar({ ...c, storage, imagem, config, log: () => {} });
  assert.equal(r.manifesto.length, 0);
  assert.ok(!storage.objetos.has(`fotos-site/${m.src}.webp`));
});

test('listagem vazia de repente não apaga tudo', async () => {
  const storage = storageFalso();
  const muitas = Array.from({ length: 8 }, (_, i) => arq(`carro${i}`, `md${i}`));
  let lista = muitas;
  const c = cenario(() => lista);
  await sincronizar({ ...c, storage, imagem, config, log: () => {} });
  lista = [];
  await assert.rejects(sincronizar({ ...c, storage, imagem, config, log: () => {} }), /sumiram da listagem/);
  const r = await sincronizar({ ...c, storage, imagem, config: { ...config, permitirRemocaoEmMassa: true }, log: () => {} });
  assert.equal(r.manifesto.length, 0);
});

test('erro numa foto não derruba as outras e é tentado de novo depois', async () => {
  const storage = storageFalso();
  const c = cenario(() => [arq('carro', 'a'), arq('carro22', 'z')]);
  let falhar = true;
  const classificar = async (b64, ctx) => {
    if (ctx.nome === 'carro22.jpg' && falhar) throw new Error('API fora');
    return c.classificar(b64, ctx);
  };
  let r = await sincronizar({ ...c, classificar, storage, imagem, config, log: () => {} });
  assert.equal(r.resumo.erros.length, 1);
  assert.equal(r.manifesto.length, 1);
  falhar = false;
  r = await sincronizar({ ...c, classificar, storage, imagem, config, log: () => {} });
  assert.equal(r.resumo.erros.length, 0);
  assert.equal(r.manifesto.length, 2);
});

test('sem FOTOS_DONOS não roda', async () => {
  const c = cenario(() => []);
  await assert.rejects(sincronizar({ ...c, storage: storageFalso(), imagem, config: { maxPorRodada: 1 } }), /FOTOS_DONOS/);
});
