# Skills de marketing e SEO (terceiros, MIT)

Copiadas para o Claude Code usar neste repositório (`/cro`, `/copywriting`, `/seo-local` etc.).
Só arquivos Markdown; nenhum script de terceiros foi trazido.

| Pasta | Origem | Para que serve aqui |
|---|---|---|
| cro, copywriting, offers, pricing, marketing-psychology, schema, seo-audit | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT, Corey Haines) | Revisar copy, oferta e preços do /playground; dados estruturados; auditoria SEO |
| seo-local, seo-geo | [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) (MIT, agricidaniel) | SEO local (Google Business Profile, NAP, avaliações) e visibilidade em buscas com IA |
| taste | [senlindesign/taste-skill](https://github.com/senlindesign/taste-skill) (MIT, Senlin; commit 6dce223) | `/taste <url>`: extrai Design Map + Taste DNA de uma página (docs/taste/*) |

Ajustes feitos na cópia:
- Removidas as pastas `evals/` e `seo-audit/references/international-seo.md` (site só em pt-BR).
- `seo-local`: as referências de `../seo/references/` foram copiadas para `seo-local/references/`.
- `seo-geo`: trocada a chamada ao script `claude-seo` (não incluído) pelo Search Status Dashboard do Google.
- Links para skills não incluídas (ex.: revops, ab-testing, seo-agentic) continuam apontando para o original e simplesmente não carregam.

Contexto do negócio para as skills: elas procuram `.claude/product-marketing.md`.

`taste`: copiados só SKILL.md e references/ (sem docs/ e evals/). Exige o Playwright MCP; nesta sessão em nuvem o Playwright local (require('playwright')) faz o mesmo papel com `references/extract.js`.
