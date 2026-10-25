// Google Drive, somente leitura, com conta de serviço (JWT assinado com node:crypto, sem googleapis).
// A conta de serviço precisa estar compartilhada na pasta da fotógrafa como "Leitor".
import { createSign } from 'node:crypto';
import { PASTA_APROVADAS, PASTA_IGNORAR } from './regras.mjs';

const API = 'https://www.googleapis.com/drive/v3';
const ESCOPO = 'https://www.googleapis.com/auth/drive.readonly';
const CAMPOS = 'nextPageToken,files(id,name,mimeType,md5Checksum,size,createdTime,modifiedTime,owners(emailAddress),imageMediaMetadata(width,height,time))';

const b64url = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export async function token(credenciaisJson) {
  let cred;
  try { cred = JSON.parse(credenciaisJson); } catch { throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não é um JSON válido (cole o arquivo .json inteiro da chave).'); }
  if (!cred.client_email || !cred.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON sem client_email/private_key.');
  const agora = Math.floor(Date.now() / 1000);
  const corpo = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
    iss: cred.client_email, scope: ESCOPO, aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600,
  }))}`;
  const assinatura = createSign('RSA-SHA256').update(corpo).sign(cred.private_key);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${corpo}.${b64url(assinatura)}` }),
  });
  if (!r.ok) throw new Error(`Google recusou a conta de serviço (${r.status}): ${(await r.text()).slice(0, 300)}`);
  return { accessToken: (await r.json()).access_token, email: cred.client_email };
}

async function get(tk, url) {
  for (let tentativa = 0; ; tentativa++) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${tk}` } });
    if (r.ok) return r;
    // 403 de cota/limite e 5xx: espera e tenta de novo; o resto é erro de verdade.
    if (tentativa < 4 && (r.status === 429 || r.status >= 500 || r.status === 403 && /rate|quota/i.test(await r.clone().text()))) {
      await new Promise((ok) => setTimeout(ok, 1000 * 2 ** tentativa));
      continue;
    }
    throw new Error(`Drive ${r.status} em ${url.split('?')[0]}: ${(await r.text()).slice(0, 300)}`);
  }
}

/**
 * Lista todas as imagens da pasta e das subpastas (em largura). Cada arquivo volta com:
 *   aprovada: true se está dentro de uma pasta "Aprovadas…" (em qualquer nível)
 *   pastaIgnorada: true se está dentro de "Recusadas…", "Não usar…" etc.
 * Lança erro se qualquer página falhar: uma listagem pela metade faria o sincronizador achar que
 * fotos foram apagadas.
 */
export async function listar(tk, pastaRaiz) {
  const fila = [{ id: pastaRaiz, aprovada: false, ignorada: false, caminho: '' }];
  const arquivos = [];
  const vistas = new Set();
  while (fila.length) {
    const pasta = fila.shift();
    if (vistas.has(pasta.id)) continue;
    vistas.add(pasta.id);
    let pageToken = '';
    do {
      const q = encodeURIComponent(`'${pasta.id}' in parents and trashed = false`);
      const url = `${API}/files?q=${q}&fields=${encodeURIComponent(CAMPOS)}&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const dados = await (await get(tk, url)).json();
      for (const f of dados.files || []) {
        if (f.mimeType === 'application/vnd.google-apps.folder') {
          fila.push({
            id: f.id,
            aprovada: pasta.aprovada || PASTA_APROVADAS.test(f.name),
            ignorada: pasta.ignorada || PASTA_IGNORAR.test(f.name),
            caminho: `${pasta.caminho}${f.name}/`,
          });
        } else {
          arquivos.push({ ...f, aprovada: pasta.aprovada, pastaIgnorada: pasta.ignorada, caminho: pasta.caminho + f.name });
        }
      }
      pageToken = dados.nextPageToken || '';
    } while (pageToken);
  }
  return arquivos;
}

export async function baixar(tk, id) {
  const r = await get(tk, `${API}/files/${id}?alt=media&supportsAllDrives=true`);
  return Buffer.from(await r.arrayBuffer());
}
