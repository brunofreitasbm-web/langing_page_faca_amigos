// Regras puras (sem rede, sem disco) do sincronizador de fotos. Testadas em test/regras.test.mjs.
//
// Quem decide o quê:
//   - TV: a IA decide sozinha (foto real, nítida, sem nada sensível) e o tema escolhe o slide. Clínica com criança reconhecível
//     espera aprovação: foto de criança em terapia revela dado de saúde (LGPD, art. 11).
//   - Site: só com aprovação humana (foto dentro de uma subpasta "Aprovadas" no Drive).
//   - Nada vai para lugar nenhum se o dono do arquivo no Drive não estiver em FOTOS_DONOS: a pasta da
//     fotógrafa está aberta para edição por link, e quem tiver o link poderia subir qualquer imagem.
import { createHash } from 'node:crypto';

export const UNIDADES = ['playground', 'circuito', 'clinica', 'equipe', 'outro'];

// Tema = o assunto da foto. É ele que decide o lugar: cada slide das TVs tem um tema (tirado da foto
// fixa que ele usa, veja temaDaImagem em /assets/fa-fotos.js) e só recebe foto nova do mesmo tema.
// A tv2 (quiosque) só cria slide novo com TEMAS_TV2: carrinho ou pelúcia andando, nada de balcão.
export const TEMAS = {
  piscina_bolinhas: { unidade: 'playground', descricao: 'piscina de bolinhas, casa na árvore com piscina' },
  acolhimento: { unidade: 'playground', descricao: 'mediadora ou monitora acolhendo, brincando ou conversando com criança, no chão ou no tapete' },
  oficina_arte: { unidade: 'playground', descricao: 'oficina de pintura, desenho, camiseta, massinha, trabalho manual' },
  cantinho_calma: { unidade: 'playground', descricao: 'cantinho da leitura ou da calma, criança lendo ou descansando' },
  brincadeira: { unidade: 'playground', descricao: 'outras brincadeiras no salão do playground: amarelinha, brinquedos, festa, grupo de crianças' },
  fachada_playground: { unidade: 'playground', descricao: 'fachada, entrada ou recepção do playground, sem criança em destaque' },
  crianca_dirigindo: { unidade: 'circuito', descricao: 'criança ao volante ou montada em carrinho elétrico, jeep, moto ou caminhão de bombeiro' },
  pelucia_motorizada: { unidade: 'circuito', descricao: 'criança montada em pelúcia motorizada gigante (capivara, unicórnio, cachorro, Stitch, macaco)' },
  frota_carrinhos: { unidade: 'circuito', descricao: 'carrinhos e pelúcias do circuito parados ou alinhados, sem criança, ou detalhe de volante e painel' },
  quiosque_circuito: { unidade: 'circuito', descricao: 'quiosque, balcão, pagamento, fila ou corredor do circuito, sem carrinho em destaque' },
  clinica_terapia: { unidade: 'clinica', descricao: 'atendimento, sessão ou atividade pedagógica na clínica' },
  clinica_materiais: { unidade: 'clinica', descricao: 'materiais e brinquedos terapêuticos da clínica, sem pessoas' },
  clinica_sensorial: { unidade: 'clinica', descricao: 'painel sensorial, sala ou ambiente sensorial da clínica' },
  clinica_fachada: { unidade: 'clinica', descricao: 'fachada, recepção ou sala de espera da clínica' },
  equipe: { unidade: 'equipe', descricao: 'equipe posando ou em bastidor, adultos de uniforme, mascote com a equipe' },
  outro: { unidade: 'outro', descricao: 'nenhum dos temas acima' },
};
export const TEMAS_TV2 = ['crianca_dirigindo', 'pelucia_motorizada', 'frota_carrinhos'];
export const SFX = ['vroom', 'buzina', 'sirene', 'plim', 'tada'];
export const QUALIDADE_MINIMA = 3;


// Limites de caracteres iguais aos que a copy das TVs já usa (scripts/tv3-pool.py).
export const LIMITES = { alt: 140, rotulo: 30, legenda: 80, kicker: 34, headline: 58, descricao: 300 };

// Mesmas proibições da copy da tv3 (scripts/tv3-pool.py), mais termos que não usamos para crianças.
const PROIBIDAS = /promessa|garantid|garantia|\bcura\b|crian[çc]a (normal|especial|problem)|IASEP|PROASA|conv[êe]nio/i;

// Pastas com estes nomes mudam o tratamento de tudo que está dentro (em qualquer nível).
export const PASTA_APROVADAS = /^aprovad/i;
export const PASTA_IGNORAR = /^(recusad|n[ãa]o usar|ignorar|privad)/i;

export const EXTENSOES_FOTO = /\.(jpe?g|png|webp|heic|heif|avif|tiff?)$/i;

export function hashId(id) {
  return createHash('sha256').update(String(id)).digest('hex').slice(0, 24);
}

export function ehHeic(arquivo) {
  return /hei[cf]/i.test(arquivo.mimeType || '') || /\.hei[cf]$/i.test(arquivo.name || '');
}

export function ehImagem(arquivo) {
  return /^image\//.test(arquivo.mimeType || '') || EXTENSOES_FOTO.test(arquivo.name || '');
}

export function donosPermitidos(texto) {
  return String(texto || '').split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function confiavel(arquivo, donos) {
  const emails = (arquivo.owners || []).map((o) => String(o.emailAddress || '').toLowerCase());
  return emails.some((e) => donos.includes(e));
}

/**
 * Agrupa os arquivos listados no Drive pelo conteúdo (md5). A mesma foto pode estar em duas pastas
 * (ex.: original e cópia em "Aprovadas"); o grupo vale como uma foto só.
 * Arquivos de donos fora da lista entram em `ignorados` e não contam para nada.
 */
export function agrupar(arquivos, donos) {
  const grupos = new Map();
  const ignorados = [];
  for (const a of arquivos) {
    if (!ehImagem(a) || a.pastaIgnorada) continue;
    if (!confiavel(a, donos)) { ignorados.push(a); continue; }
    const chave = a.md5Checksum || hashId(a.id);
    const g = grupos.get(chave) || { chave, arquivos: [], aprovada: false };
    g.arquivos.push(a);
    if (a.aprovada) g.aprovada = true;
    grupos.set(chave, g);
  }
  return { grupos, ignorados };
}

/** Escapa HTML e devolve só <em>…</em> e <br>, que as TVs usam na copy. */
export function limparCopy(txt, limite) {
  let s = String(txt || '').replace(/\s+/g, ' ').trim();
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  s = s.replace(/&lt;em&gt;/g, '<em>').replace(/&lt;\/em&gt;/g, '</em>').replace(/&lt;br\s*\/?&gt;/g, '<br>');
  // <em> desbalanceado quebraria o layout da TV: se não fecha, tira todos.
  if ((s.match(/<em>/g) || []).length !== (s.match(/<\/em>/g) || []).length) s = s.replace(/<\/?em>/g, '');
  s = s.replace(/!/g, '.').replace(/\s*—\s*/g, ', ').replace(/\.\.+/g, '.');
  if (limite && textoPlano(s).length > limite) s = cortar(s, limite);
  return s;
}

export function textoPlano(s) {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

function cortar(s, limite) {
  const plano = textoPlano(s);
  const corte = plano.slice(0, limite).replace(/\s+\S*$/, '').replace(/[,;:\s]+$/, '');
  // Ao cortar, perde a marcação (raro: o prompt já pede o limite).
  return corte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function slugificar(txt) {
  return String(txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '') || 'foto';
}

/** Normaliza a resposta da IA: nada que vem dela vai para a página sem passar por aqui. */
export function normalizarClassificacao(c) {
  const n = (v, min, max, pad) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Math.round(Number(v)))) : pad);
  const tema = Object.hasOwn(TEMAS, c.tema) ? c.tema : 'outro';
  const unidade = TEMAS[tema].unidade;
  const out = {
    e_foto: c.e_foto === true,
    tema,
    unidade,
    qualidade: n(c.qualidade, 1, 5, 1),
    problemas: Array.isArray(c.problemas) ? c.problemas.map(String).slice(0, 6) : [],
    crianca_identificavel: c.crianca_identificavel !== false,
    sensivel: c.sensivel === true,
    motivo_sensivel: String(c.motivo_sensivel || '').slice(0, 200),
    descricao: String(c.descricao || '').slice(0, LIMITES.descricao),
    alt: textoPlano(limparCopy(c.alt, LIMITES.alt)),
    rotulo: limparCopy(c.rotulo, LIMITES.rotulo).replace(/<\/?em>|<br>/g, ''),
    legenda: limparCopy(c.legenda, LIMITES.legenda).replace(/<\/?em>|<br>/g, ''),
    kicker: limparCopy(c.kicker, LIMITES.kicker).replace(/<\/?em>|<br>/g, ''),
    headline: limparCopy(c.headline, LIMITES.headline),
    plano: [20, 30].includes(Number(c.plano)) ? Number(c.plano) : (unidade === 'circuito' ? 30 : 0),
    sfx: SFX.includes(c.sfx) ? c.sfx : 'plim',
    foco_x: n(c.foco_x, 0, 100, 50),
    foco_y: n(c.foco_y, 0, 100, 45),
    slug: slugificar(c.slug || c.rotulo || c.descricao),
  };
  // Copy pública que esbarra nas proibições vira copy neutra em vez de ir para o ar.
  for (const k of ['kicker', 'headline', 'legenda', 'rotulo']) {
    if (PROIBIDAS.test(textoPlano(out[k]))) out[k] = '';
  }
  return out;
}

/**
 * Decide onde a foto aparece. `c` é a classificação normalizada; `aprovada` = está em "Aprovadas".
 * Devolve { tv, site, motivo } (motivo explica por que ficou de fora, para o log e o resumo).
 */
export function destinos(c, aprovada) {
  if (!c) return { tv: false, site: false, motivo: 'sem classificação' };
  if (!c.e_foto) return { tv: false, site: false, motivo: 'não é foto (logo, arte ou print)' };
  // Aprovação humana vale mais que a nota da IA (a pessoa olhou), mas não publica o que a IA marcou
  // como sensível: nesse caso alguém precisa tirar a foto de "Aprovadas" ou mover para "Recusadas".
  if (c.sensivel) return { tv: false, site: false, motivo: `sensível: ${c.motivo_sensivel || 'sem detalhe'}` };
  if (aprovada) return { tv: c.tema !== 'outro', site: true, motivo: '' };
  if (c.qualidade < QUALIDADE_MINIMA) return { tv: false, site: false, motivo: `qualidade ${c.qualidade}/5 (${c.problemas.join(', ') || 'baixa'})` };
  if (c.tema === 'outro') return { tv: false, site: false, motivo: 'tema não combina com nenhum slide; aprove para ir ao site' };
  if (c.unidade === 'clinica' && c.crianca_identificavel) return { tv: false, site: false, motivo: 'clínica com criança reconhecível: precisa de aprovação' };
  return { tv: true, site: false, motivo: '' };
}

/** Item público do manifesto (o que as páginas leem). Sem IDs do Drive, sem descrição interna. */
export function itemManifesto({ chave, c, d, arquivo, dims, criadaEm }) {
  return {
    id: chave.slice(0, 12),
    src: arquivo,
    w: dims.w,
    h: dims.h,
    tema: c.tema,
    unidade: c.unidade,
    tv: d.tv,
    site: d.site,
    alt: c.alt,
    rotulo: c.rotulo,
    legenda: c.legenda,
    kicker: c.kicker,
    headline: c.headline,
    plano: c.plano,
    sfx: c.sfx,
    pos: `${c.foco_x}% ${c.foco_y}%`,
    adicionada: criadaEm,
  };
}

/**
 * Trava contra apagar tudo por engano (ex.: a conta de serviço perdeu acesso e a listagem voltou
 * vazia). Remoção em massa só com FOTOS_PERMITIR_REMOCAO_EM_MASSA=1.
 */
export function remocaoSegura(totalAntes, aRemover) {
  if (aRemover === 0) return true;
  if (totalAntes <= 4) return true;
  return aRemover <= Math.max(4, Math.floor(totalAntes / 2));
}
