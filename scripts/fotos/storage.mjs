// Supabase Storage via REST (sem SDK). Dois buckets:
//   fotos-site   (público): imagens publicadas + manifest.json, que as TVs e as landings leem.
//   fotos-estado (privado): estado.json com a classificação de cada foto, inclusive as recusadas.
// Os buckets são criados na primeira execução, se ainda não existirem.

export const BUCKET_PUBLICO = 'fotos-site';
export const BUCKET_PRIVADO = 'fotos-estado';

export function criarStorage(urlProjeto, chaveServico) {
  const base = `${urlProjeto.replace(/\/$/, '')}/storage/v1`;
  const h = { Authorization: `Bearer ${chaveServico}`, apikey: chaveServico };

  async function req(metodo, caminho, { corpo, tipo, extra } = {}) {
    for (let tentativa = 0; ; tentativa++) {
      const r = await fetch(`${base}${caminho}`, {
        method: metodo,
        headers: { ...h, ...(tipo ? { 'Content-Type': tipo } : {}), ...(extra || {}) },
        body: corpo,
      });
      if (r.ok || r.status === 404 || r.status === 400 && metodo === 'GET') return r;
      if (tentativa < 3 && (r.status === 429 || r.status >= 500)) {
        await new Promise((ok) => setTimeout(ok, 1000 * 2 ** tentativa));
        continue;
      }
      throw new Error(`Supabase Storage ${r.status} em ${metodo} ${caminho}: ${(await r.text()).slice(0, 300)}`);
    }
  }

  return {
    async garantirBuckets() {
      for (const [id, publico] of [[BUCKET_PUBLICO, true], [BUCKET_PRIVADO, false]]) {
        const r = await req('GET', `/bucket/${id}`);
        if (r.ok) continue;
        await req('POST', '/bucket', {
          tipo: 'application/json',
          corpo: JSON.stringify(publico ? { id, name: id, public: true, file_size_limit: 5 * 1024 * 1024 } : { id, name: id, public: false }),
        });
      }
    },
    async lerJson(bucket, caminho) {
      const r = await req('GET', `/object/${bucket}/${caminho}`);
      if (!r.ok) return null;
      return r.json();
    },
    async gravar(bucket, caminho, dados, tipo, cache) {
      await req('POST', `/object/${bucket}/${caminho}`, {
        corpo: dados, tipo, extra: { 'x-upsert': 'true', 'cache-control': cache },
      });
    },
    async apagar(bucket, caminhos) {
      if (!caminhos.length) return;
      await req('DELETE', `/object/${bucket}`, { tipo: 'application/json', corpo: JSON.stringify({ prefixes: caminhos }) });
    },
    urlPublica(caminho) {
      return `${base}/object/public/${BUCKET_PUBLICO}/${caminho}`;
    },
  };
}
