# Arquitetura — BluPrint

Este arquivo é a **fonte da verdade das decisões técnicas**. `docs/requisitos.md` é a fonte da verdade das **regras de negócio**. Mudança de decisão aqui entra por **pull request**, não por issue — mesma regra que o `requisitos.md` já usa para si.

## Visão geral

Monorepo com **Bun workspaces**. O Bun é gerenciador de pacotes e runner de script; a API roda em
**Node**.

- `apps/web` — SPA React.
- `apps/api` — API Node + NestJS.
- `packages/shared` — schemas Zod e tipos usados pelos dois lados. Tem passo de build: publica
  `dist/`, e todo script da raiz o constrói antes de qualquer outra coisa.

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
| Back | Node + NestJS (adapter Express) |
| Validação | Zod v4 em `packages/shared`, aplicado na API por `nestjs-zod` |
| ORM | Drizzle |
| Banco | Neon (sa-east-1) |
| Auth | Better Auth (self-hosted na API) |
| Storage de imagem | Cloudflare R2 |
| Host da API | Fly.io, região GRU |
| Host do front | Cloudflare Pages |
| Testes | Vitest + Testing Library (web) · Jest + Supertest (api) |
| Lint/format | Biome (web, shared) · ESLint + Prettier (api) |
| Doc de API | Bruno, coleção `.bru` versionada |

## Por que cada escolha

- **Neon** — única com região São Paulo, branching grátis por PR e hibernação que não apaga dados. Os descartados falham por **perda de dados**, não por performance: Render deleta o banco free em 30 dias corridos, Railway deleta o volume, Supabase pausa o projeto após 7 dias parado (restore manual), CockroachDB deleta após 6 meses.
- **Better Auth** — grátis, roda dentro da própria API, adapter Drizzle oficial, e o plugin de organização entrega `organization` e `member` (o papel padrão do RF-123) sem trabalho nosso. Lucia está deprecado desde março/2025. Nenhum SaaS de auth modela "papel por obra" (RF-121/RF-122), então pagar por um não pouparia trabalho. **O convite é a exceção:** usamos tabela própria, não a do plugin, porque o RF-129 exige um convite que crie o vínculo com a organização **e** com a obra de uma vez — `project_id` anulável distingue o convite em lote do RF-127 do convite direto à obra. Na tabela do plugin isso viraria uma segunda tabela de convite ou `project_id` escondido em metadata, com dois fluxos de aceite para manter. O custo é implementar token de uso único e expiração de 7 dias (RF-133) na mão.
- **Cloudflare R2** — único object storage com egress grátis e ilimitado, que é o que torna o custo de foto previsível (RNF-15). S3 e Supabase cobram US$ 0,09–0,15/GB de saída, e no S3 a região São Paulo é ~67% mais cara.
- **Fly.io GRU** — mantido, mas o motivo mudou com a troca de runtime e **a comparação ainda não foi refeita**. O critério antigo era "único host com região no Brasil que roda a runtime **Bun** como processo longo", e ele deixou de existir: em Node, Vercel Functions e Deno Deploy não são mais excluídos por runtime. O que continua valendo é o formato de execução — a API precisa de um **processo longo** que segure o pool de conexões do Postgres e pague o bootstrap do container de DI do Nest uma vez só, com região no Brasil e **sem cold start** (RNF-11, uso em campo no 4G). Nesses critérios o Fly.io atende, e Render free segue fora por hibernar com cold start de 30–60s. Mas Railway, Cloud Run (`southamerica-east1`) e Vercel passaram a ser candidatos legítimos e ninguém os comparou em preço e região atuais. **Item em aberto:** refazer esse levantamento antes do primeiro deploy. Não há `Dockerfile` nem `fly.toml` no repo, então a decisão ainda não custa nada para reverter.
- **Cloudflare Pages** — banda e seats ilimitados no free. O plano Hobby da Vercel proíbe uso comercial; Netlify dá 1 seat.
- **Jest na API** — é o runner que o Nest assume: `@nestjs/testing` + Supertest é o caminho documentado, e o `ts-jest` lê o mesmo `tsconfig` que o build, então decorator e `emitDecoratorMetadata` se comportam igual no teste e em produção. Divergência aí não dá teste vermelho, dá `Nest can't resolve dependencies` em runtime — não vale economizar. Vitest fica só no front, onde DOM e JSX importam.
- **ESLint + Prettier na API, Biome no front** — o Biome não roda regra com informação de tipo, e é justamente isso que a API precisa: `no-floating-promises` numa service `async`, `no-misused-promises` num handler. No front, onde a regra que importa é de React e não de tipo, o Biome continua ganhando por ser um binário só. A divisão também é **imposta**: o `typescript-eslint` não suporta o compilador nativo do TypeScript 7, que não expõe API JavaScript nenhuma, então rodar ESLint na raiz custaria rebaixar o TypeScript do monorepo inteiro. Os dois estão configurados com tab e aspas duplas — a fronteira é de ferramenta, não de estilo. O que se perde é o `organizeImports` automático do Biome, que no ESLint não tem equivalente nativo.
- **NestJS** — o Hono era a escolha certa enquanto a runtime era Bun: framework mínimo, convenção por nossa conta. Em Node a comparação muda. Ou reescrevemos injeção de dependência, fronteira de módulo, guarda e filtro de erro, ou usamos um framework que já entrega isso e o **impõe por construção** em vez de por code review. O que decidiu foi o que vem pela frente: RF-121/RF-122 (papel por obra) viram guards, o Better Auth vira um módulo, e a fronteira rota/service que este documento já prescrevia deixa de ser combinado e passa a ser estrutura. O preço está explícito e é real — decorators, que tiram `apps/api` do `tsconfig` base do monorepo (ver § Estrutura do back), um passo de build no lugar de rodar o `.ts` direto, e `--watch` com restart no lugar de hot reload. Hono sobre `@hono/node-server` manteria o código e não compraria nada disso.
- **nestjs-zod** — mantém o Zod de `packages/shared` como a única fonte de validação: `createZodDto()` embrulha o schema num DTO que o `ZodValidationPipe` global lê pelo metadado do decorator. A alternativa nativa do Nest é `class-validator` + `class-transformer`, que duplicaria o contrato em decorators de classe e quebraria a espinha de schema compartilhado — o front deixaria de ser validado pelo mesmo objeto que a API.
- **Bruno** — coleção fica como arquivo no repo: versionada em git, revisável em PR, sem conta em nuvem nem sync pago.

Os demais itens (React/Vite/Tailwind, TanStack, React Hook Form + Zod, shadcn/ui, Drizzle) não têm alternativa descartada que valha registrar — são a escolha padrão do ecossistema para o papel que cumprem.

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
├── main.ts            entrypoint — cria o app Nest, aplica configureApp e abre a porta
├── app.ts             configureApp(app): CORS, pipe de validação e filtro de erro. O teste chama
│                       a mesma função — é o que impede um contrato que só vale em produção
├── app.module.ts      módulo raiz — ConfigModule (env validado no boot) e os módulos de domínio
├── <domínio>/         um módulo por domínio: controller, service, module, dto/
├── common/            o que atravessa todos os módulos: filtros, pipes, guards, interceptors
├── lib/               tem estado ou fala com o mundo: schema de env, conexão de banco (#18), clientes
└── utils/             funções puras, sem estado nem I/O
```

- **Módulo é a unidade de organização, não a camada.** `health/` tem `health.module.ts`,
  `health.controller.ts`, `health.service.ts` e `dto/` — uma pasta por domínio. `controllers/` e
  `services/` na raiz é o anti-padrão que espalha um domínio por três lugares e faz toda mudança
  virar três diffs.
- **Controller** só declara a rota, valida a entrada e chama a service. Nunca faz query direto e
  nunca contém regra. O `@Query()`/`@Body()` é tipado com um DTO de `dto/`, criado por
  `createZodDto()` sobre o schema de `packages/shared`; é o `emitDecoratorMetadata` que entrega
  essa classe ao `ZodValidationPipe` global. Isso tem consequência direta na configuração: o
  `apps/api` não pode ligar `verbatimModuleSyntax` nem `isolatedModules`, e a regra
  `consistent-type-imports` do ESLint fica desligada de propósito. Um `import type` no DTO apaga o
  valor de que o metadado precisa, e a injeção quebra **em runtime**, não na compilação.
- **Service** contém a regra de negócio e nunca toca em `Request`, `Response` nem em nada do
  Express — isso é o que permite testá-la instanciando a classe, sem subir uma request HTTP.
  `health.service.spec.ts` é o exemplo trabalhado dessa fronteira.
- **`db/`** (Drizzle, chega na issue #18) é acessado só por services — a fronteira entre service e
  banco é essa pasta.
- **Erro e não-encontrado** ficam em `common/filters/`. O `AllExceptionsFilter` é registrado uma
  vez, em `app.ts`, e é ele que sustenta o contrato de resposta: `{"error":"Not Found"}` em 404 e
  `{"error":"Internal Server Error"}` em 500, no lugar do corpo verboso que o Nest devolve por
  padrão. Se esse filtro sair, o contrato sai junto — em silêncio, porque o front lança em qualquer
  não-2xx sem ler o corpo. Por isso a coleção do Bruno tem um caso de rota desconhecida.
- **Ordem importa no bootstrap.** `configureApp` roda **antes** de `app.init()`. Pipe e filtro
  registrados depois são ignorados pelas rotas já montadas, sem erro nenhum.
- **Schemas Zod de request/response** que o front também precisa moram em `packages/shared` (ex.:
  `healthQuerySchema`, `healthResponseSchema`), importados aqui pelo DTO e lá pelo `apiFetch`. Um
  schema só sobe para lá quando front e API precisam concordar sobre ele — ver "Estrutura do front".
- **`lib/` vs `utils/`** — `lib/` é código que *é* alguma coisa (tem estado ou fala com o mundo:
  `env.ts`, conexão de banco, clientes de storage). `utils/` é função pura, testável sem mock. Nada
  em `lib/` precisa ser provider do Nest: só vira `@Injectable()` o que outro módulo injeta.

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
