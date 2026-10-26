// Classificação de uma foto com a API do Claude (visão + saída em JSON estruturado).
import Anthropic from '@anthropic-ai/sdk';
import { TEMAS, SFX, LIMITES } from './regras.mjs';

const LISTA_TEMAS = Object.entries(TEMAS).map(([k, t]) => `- ${k} (${t.unidade}): ${t.descricao}`).join('\n');

export const MODELO_PADRAO = 'claude-opus-5-5';

// Texto fixo (fica em cache entre as fotos da mesma rodada).
const SISTEMA = `Você classifica fotos enviadas pela fotógrafa do FaçaAmigos, em Belém (PA), para decidir se e onde elas aparecem nas TVs e no site. Responda só com o JSON pedido, em português do Brasil.

As unidades:
- playground: FaçaAmigos Playground, playground inclusivo dentro de shopping. Piscina de bolinhas, casa na árvore, tapetes, amarelinha, oficinas de pintura e de camiseta, cantinho da leitura, festas, mediadoras de uniforme acolhendo crianças.
- circuito: FaçaAmigos Circuito, quiosque no corredor do Parque Shopping Belém com carrinhos elétricos infantis (Lamborghini, Range Rover, jeep, moto, caminhão de bombeiro) e pelúcias motorizadas gigantes (capivara, unicórnio, cachorro, Stitch, macaco). Placas "Faça Amigos" nos carrinhos.
- clinica: Clínica FaçaAmigos, clínica de terapias infantis (fono, TO, psicologia, ABA). Salas de atendimento, painel sensorial, materiais terapêuticos, recepção da clínica, fachada.

Temas (escolha o assunto principal da foto; é ele que decide em qual slide de qual TV a foto entra):
${LISTA_TEMAS}

Critérios:
- tema: o que a foto mostra de fato, não onde foi tirada. Foto no quiosque do circuito sem carrinho em destaque é quiosque_circuito, não crianca_dirigindo. Na dúvida entre dois temas, escolha o mais específico; se nenhum serve, outro.
- e_foto: true só para fotografia real. Logo, arte do Canva, montagem com texto, print de tela, figurinha ou recorte com fundo removido é false.
- qualidade (1 a 5): 5 é foto de vitrine; 3 é aceitável numa TV; 1 ou 2 é desfocada, tremida, escura, cortada no rosto, com dedo na lente, ou sem assunto. Liste os defeitos em problemas.
- crianca_identificavel: true se o rosto de alguma criança dá para reconhecer (de frente ou de perfil nítido). De costas, de longe, desfocado ou só mãos é false.
- sensivel: true se a cena constrange ou expõe: criança chorando ou em crise, troca de roupa, pouca roupa, machucado, documento, tela com dados pessoais, placa de carro de cliente, adulto em situação constrangedora. Explique em motivo_sensivel.
- descricao: o que acontece na foto, objetivo, 1 ou 2 frases.
- alt: texto alternativo para quem usa leitor de tela, até ${LIMITES.alt} caracteres, descreve a cena sem nomes próprios.
- rotulo (até ${LIMITES.rotulo}) e legenda (até ${LIMITES.legenda}): título curto e frase de apoio para o cartão da foto.
- kicker (até ${LIMITES.kicker}) começa com um emoji; headline (até ${LIMITES.headline}) pode ter um único trecho entre <em> e </em>. Os dois vão na TV da unidade, em cima da foto, para pais que passam em frente. Tom acolhedor, frases curtas, falando com o pai ou a mãe. Para o circuito, siga este estilo: kicker "🏎️ Lamborghini do tamanho dele", headline "Olha a cara de quem <em>chegou</em>." Sem ponto de exclamação, sem travessão, sem prometer resultado, sem as palavras "normal" ou "especial" para criança, sem nomes próprios.
- plano: só para o circuito. 20 se o destaque é pelúcia ou jeep, 30 se é carro ou moto. 0 nos outros temas.
- sfx: som que combina com a foto (vroom carro andando, buzina, sirene bombeiro, plim pelúcia ou algo fofo, tada comemoração).
- foco_x e foco_y: ponto de interesse principal (rosto ou ação) em porcentagem da largura e da altura, para recortar a foto sem cortar o assunto.
- slug: 2 a 5 palavras em minúsculas separadas por hífen, sem acento, descrevendo a foto (ex.: menino-lamborghini-amarela).`;

const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['e_foto', 'tema', 'qualidade', 'problemas', 'crianca_identificavel', 'sensivel', 'motivo_sensivel',
    'descricao', 'alt', 'rotulo', 'legenda', 'kicker', 'headline', 'plano', 'sfx', 'foco_x', 'foco_y', 'slug'],
  properties: {
    e_foto: { type: 'boolean' },
    tema: { type: 'string', enum: Object.keys(TEMAS) },
    qualidade: { type: 'integer', enum: [1, 2, 3, 4, 5] },
    problemas: { type: 'array', items: { type: 'string' } },
    crianca_identificavel: { type: 'boolean' },
    sensivel: { type: 'boolean' },
    motivo_sensivel: { type: 'string' },
    descricao: { type: 'string' },
    alt: { type: 'string' },
    rotulo: { type: 'string' },
    legenda: { type: 'string' },
    kicker: { type: 'string' },
    headline: { type: 'string' },
    plano: { type: 'integer', enum: [0, 20, 30] },
    sfx: { type: 'string', enum: SFX },
    foco_x: { type: 'integer' },
    foco_y: { type: 'integer' },
    slug: { type: 'string' },
  },
};

export function criarClassificador({ apiKey, modelo = MODELO_PADRAO }) {
  const client = new Anthropic({ apiKey, maxRetries: 4 });

  return async function classificar(jpegBase64, contexto) {
    const r = await client.beta.messages.create({
      model: modelo,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: ESQUEMA } },
      system: [{ type: 'text', text: SISTEMA, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpegBase64 } },
          { type: 'text', text: `Arquivo: ${contexto.nome}. Pasta no Drive: ${contexto.pasta || '(raiz)'}. Classifique esta foto.` },
        ],
      }],
    });
    if (r.stop_reason === 'refusal') {
      // Recusa da IA não publica nada: a foto fica aguardando revisão humana.
      return { recusada: true, motivo: r.stop_details?.explanation || r.stop_details?.category || 'recusada' };
    }
    const texto = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    try {
      return { dados: JSON.parse(texto), uso: r.usage };
    } catch {
      throw new Error(`resposta da IA não é JSON (stop_reason ${r.stop_reason}): ${texto.slice(0, 200)}`);
    }
  };
}
