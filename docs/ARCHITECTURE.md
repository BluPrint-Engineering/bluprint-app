# Arquitetura — BluPrint

Este arquivo é a **fonte da verdade das decisões técnicas**. `docs/requisitos.md` é a fonte da verdade das **regras de negócio**. Mudança de decisão aqui entra por **pull request**, não por issue — mesma regra que o `requisitos.md` já usa para si.

## Visão geral

Monorepo com **Bun workspaces**:

- `apps/web` — SPA React.
- `apps/api` — API Bun + Hono.
- `packages/shared` — schemas Zod e tipos usados pelos dois lados.

## A stack

| Camada | Escolha |
| --- | --- |
| Linguagem | TypeScript em tudo, `tsconfig` base estrito |
| Front | React + Vite + Tailwind v4 (`@tailwindcss/vite`) |
| Roteamento | TanStack Router |
| Dados | TanStack Query v5 |
| Formulários | React Hook Form + Zod v4 |
| UI | shadcn/ui sobre Radix |
| Ícones | lucide-react |
| Back | Bun + Hono |
| ORM | Drizzle |
| Banco | Neon (sa-east-1) |
| Auth | Better Auth (self-hosted na API) |
| Storage de imagem | Cloudflare R2 |
| Host da API | Fly.io, região GRU |
| Host do front | Cloudflare Pages |
| Testes | Vitest + Testing Library (web) · `bun test` (api) |
| Lint/format | Biome |
| Doc de API | Bruno, coleção `.bru` versionada |

## Por que cada escolha

- **Neon** — única com região São Paulo, branching grátis por PR e hibernação que não apaga dados. Os descartados falham por **perda de dados**, não por performance: Render deleta o banco free em 30 dias corridos, Railway deleta o volume, Supabase pausa o projeto após 7 dias parado (restore manual), CockroachDB deleta após 6 meses.
- **Better Auth** — grátis, roda dentro da própria API, adapter Drizzle oficial, e o plugin de organização já traz convite com token de uso único e expiração configurável (RF-133). Lucia está deprecado desde março/2025. Nenhum SaaS de auth modela "papel por obra" (RF-121/RF-122), então pagar por um não pouparia trabalho.
- **Cloudflare R2** — único object storage com egress grátis e ilimitado, que é o que torna o custo de foto previsível (RNF-15). S3 e Supabase cobram US$ 0,09–0,15/GB de saída, e no S3 a região São Paulo é ~67% mais cara.
- **Fly.io GRU** — único host com região no Brasil que roda Bun como processo longo com conexão persistente ao Postgres. Cloudflare Workers, Vercel Functions e Deno Deploy não rodam a runtime Bun; Render free hiberna com cold start de 30–60s, inviável para uso em campo.
- **Cloudflare Pages** — banda e seats ilimitados no free. O plano Hobby da Vercel proíbe uso comercial; Netlify dá 1 seat.
- **`bun test` na API** — já vem embutido e é compatível com a API do Jest. Vitest fica só no front, onde DOM e JSX importam.
- **Biome** — um binário para lint e format, no lugar de ESLint + Prettier.
- **Bruno** — coleção fica como arquivo no repo: versionada em git, revisável em PR, sem conta em nuvem nem sync pago.

Os demais itens (React/Vite/Tailwind, TanStack, React Hook Form + Zod, shadcn/ui, Hono, Drizzle) não têm alternativa descartada que valha registrar — são a escolha padrão do ecossistema para o papel que cumprem.

## Estrutura do front

```
apps/web/src/
├── routes/            a árvore de rotas do TanStack Router (file-based)
├── features/<x>/      tudo que pertence a UMA tela: componentes, hooks, queries. Barrel na raiz
├── components/
│   ├── ui/            shadcn/ui — gerado pela CLI, não editar à mão
│   └── ...             componentes reutilizáveis, usados por 2+ features
├── lib/               tem estado ou fala com o mundo: cliente HTTP, queryClient, cn()
├── utils/             funções puras, sem estado nem I/O
└── styles/            globals.css — Tailwind e tokens de tema
```

- **`src/routes/`** é a árvore de rotas, não uma pasta de telas — inclui `__root.tsx` e layout
  routes, que não renderizam UI própria. O arquivo de rota é fino: `validateSearch`, `loader`,
  `beforeLoad` (guarda de auth) e `errorComponent` moram nele; a renderização é importada de
  `features/`.
- **`src/features/<x>/`** — pertence a uma tela só, fica na feature (ex.: `features/health/`).
  Quando uma **segunda** feature precisar do mesmo componente, aí sobe para `components/`. Nunca
  antes: é o que mantém `components/` confiável — tudo que está lá é, por definição, reutilizável.
- **`src/components/ui/`** — shadcn/ui, gerado por `bunx shadcn add <componente>`. Kebab-case por
  imposição da CLI; é a única exceção à convenção de nomenclatura do projeto.
- **Chamadas de API e hooks de TanStack Query** vivem em `features/<x>/api.ts`, usando `queryOptions`
  e o helper `apiFetch` de `src/lib/api.ts`.
- **Promoção para `packages/shared`** — um tipo ou schema sobe quando **front e API precisam
  concordar sobre ele**: contrato de request/response, enum de domínio (ex.: `healthQuerySchema`,
  `healthResponseSchema`). Enquanto for só do front — como o schema de validação de um form —, fica
  local à feature.
- **`lib/` vs `utils/`** — mesma fronteira do back: `lib/` tem estado ou fala com o mundo
  (`api.ts`, `queryClient.ts`, `cn()`); `utils/` é função pura.
- **Rotas, assets e estilos globais** — rotas em `src/routes/`; `index.html` é o entry point que o
  Vite processa (não um asset estático); `src/styles/globals.css` importa o Tailwind e os tokens de
  tema gerados pelo `shadcn init`.

## Estrutura do back

```
apps/api/src/
├── index.ts          entrypoint — export default { port, fetch: app.fetch } (padrão Bun)
├── app.ts             monta o Hono: CORS, rotas, error handling — testável sem abrir porta
├── routes/            uma rota registra um Hono Router e valida entrada com @hono/zod-validator
├── services/          regra de negócio — não conhece o Context do Hono
├── middleware/         error handling (onError + notFound) e outros middlewares Hono
├── lib/               tem estado ou fala com o mundo: env validado, conexão de banco (#18), clientes
└── utils/             funções puras, sem estado nem I/O
```

- **Rota** só valida a entrada, chama a service e dá forma à resposta. Nunca faz query direto.
- **Service** contém a regra de negócio e nunca toca no `Context` do Hono — isso é o que permite
  testar a service sem subir uma request HTTP.
- **`db/`** (Drizzle, chega na issue #18) é acessado só por services — a fronteira entre service e
  banco é essa pasta.
- **Middlewares e tratamento de erro** ficam em `middleware/`. `app.onError` e `app.notFound` são
  registrados uma vez, em `app.ts`.
- **Schemas Zod de request/response** que o front também precisa moram em `packages/shared` (ex.:
  `healthQuerySchema`, `healthResponseSchema`) e são importados aqui e em `apps/web`. Um schema só
  sobe para lá quando front e API precisam concordar sobre ele — ver "Estrutura do front".
- **`lib/` vs `utils/`** — `lib/` é código que *é* alguma coisa (tem estado ou fala com o mundo:
  `env.ts`, conexão de banco, clientes de storage). `utils/` é função pura, testável sem mock.

**Convenção de Bruno:** toda rota nova entra na coleção (`apps/api/bruno/`) no mesmo PR que a cria.

## Idioma

- **Inglês** — identificadores (variáveis, funções, tipos, arquivos, rotas), mensagens de erro da
  API, mensagens de commit, chaves de JSON de resposta.
- **pt-BR** — todo texto que o usuário lê na tela (RNF-05) e a documentação em `docs/`.

O front traduz o erro da API antes de exibir; a API nunca devolve texto pronto para tela.

## Nomenclatura

- **PascalCase** — arquivos de componente React. O nome do arquivo é o nome do que ele exporta:
  `StatCard.tsx` exporta `StatCard`.
- **camelCase** — todo o resto: hooks (`useDashboardStats.ts`), helpers (`formatCurrency.ts`),
  módulos (`queryClient.ts`), pastas de feature (`features/adminDashboard/`).
- **Exceções, ambas por imposição de ferramenta:** `components/ui/` fica em kebab-case porque a CLI
  do shadcn gera assim (e ninguém edita à mão), e os arquivos em `routes/` seguem a sintaxe do
  TanStack Router (`admin.dashboard.tsx`, `$obraId.tsx`) — ponto separa segmento, `$` marca parâmetro.

## Fora de escopo por enquanto

Decisões conscientemente em aberto — não é esquecimento, é falta de problema real para decidir em cima:

- **Renderização da planta com pins.** Decide no épico da planta (#7/#8), com planta e volume reais na mão. A expectativa é ~100–300 pins por planta, não milhares.
- **Tratamento de imagem.** Compressão no cliente ou no servidor, upload direto para o R2 ou via backend, o que fazer com PDF. Mesmo épico.

## Custo

No free tier, o custo é zero. Fora dele, estimativa de ~US$ 25–45/mês no total — Neon é o item dominante.
