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
| ORM | Drizzle, driver `node-postgres` (`pg`) |
| Banco | PostgreSQL — provedor **em aberto**; em dev, container local |
| Auth | Better Auth (self-hosted na API), montado no Nest por `@thallesp/nestjs-better-auth` |
| Storage de imagem | Object storage compatível com S3 — provedor **em aberto** |
| Host da API | **em aberto** |
| Host do front | **em aberto** |
| Testes | Vitest + Testing Library (web) · Jest + Supertest (api) |
| Lint/format | Biome (web, shared) · ESLint + Prettier (api) |
| Doc de API | Bruno, coleção `.bru` versionada |

## Por que cada escolha

- **Hospedagem e provedores** (host da API, host do front, banco, storage) — **em aberto** desde
  04/09/2026. O levantamento que sustenta esse adiamento, os candidatos e os descartados estão em
  § Fora de escopo por enquanto.
- **Jest na API** — é o runner que o Nest assume: `@nestjs/testing` + Supertest é o caminho documentado, e o `ts-jest` lê o mesmo `tsconfig` que o build, então decorator e `emitDecoratorMetadata` se comportam igual no teste e em produção. Divergência aí não dá teste vermelho, dá `Nest can't resolve dependencies` em runtime — não vale economizar. Vitest fica só no front, onde DOM e JSX importam.
- **ESLint + Prettier na API, Biome no front** — o Biome não roda regra com informação de tipo, e é justamente isso que a API precisa: `no-floating-promises` numa service `async`, `no-misused-promises` num handler. No front, onde a regra que importa é de React e não de tipo, o Biome continua ganhando por ser um binário só. A divisão também é **imposta**: o `typescript-eslint` não suporta o compilador nativo do TypeScript 7, que não expõe API JavaScript nenhuma, então rodar ESLint na raiz custaria rebaixar o TypeScript do monorepo inteiro. Os dois estão configurados com tab e aspas duplas — a fronteira é de ferramenta, não de estilo. O que se perde é o `organizeImports` automático do Biome, que no ESLint não tem equivalente nativo.
- **NestJS** — o Hono era a escolha certa enquanto a runtime era Bun: framework mínimo, convenção por nossa conta. Em Node a comparação muda. Ou reescrevemos injeção de dependência, fronteira de módulo, guarda e filtro de erro, ou usamos um framework que já entrega isso e o **impõe por construção** em vez de por code review. O que decidiu foi o que vem pela frente: RF-121/RF-122 (papel por obra) viram guards, o Better Auth vira um módulo, e a fronteira rota/service que este documento já prescrevia deixa de ser combinado e passa a ser estrutura. O preço está explícito e é real — decorators, que tiram `apps/api` do `tsconfig` base do monorepo (ver § Estrutura do back), um passo de build no lugar de rodar o `.ts` direto, e `--watch` com restart no lugar de hot reload. Hono sobre `@hono/node-server` manteria o código e não compraria nada disso.
- **nestjs-zod** — mantém o Zod de `packages/shared` como a única fonte de validação: `createZodDto()` embrulha o schema num DTO que o `ZodValidationPipe` global lê pelo metadado do decorator. A alternativa nativa do Nest é `class-validator` + `class-transformer`, que duplicaria o contrato em decorators de classe e quebraria a espinha de schema compartilhado — o front deixaria de ser validado pelo mesmo objeto que a API.
- **Better Auth** — self-hosted, com o adapter Drizzle e montado no Nest pelo pacote community que a doc oficial dele aponta. O motivo, as hospedadas descartadas e o que a montagem impõe estão em § Autenticação, que é longa demais para caber aqui.
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
├── app.ts             configureApp(app): prefixo global, helmet, CORS, pipe de validação e
│                       filtro de erro, mais nestApplicationOptions. O teste usa os dois — é
│                       o que impede um contrato que só vale em produção
├── app.module.ts      módulo raiz — ConfigModule (env validado no boot) e os módulos de domínio
├── auth/              instância do Better Auth e o módulo que a monta no Nest (§ Autenticação)
├── <domínio>/         um módulo por domínio: controller, service, module, dto/
├── common/            o que atravessa todos os módulos: filtros, pipes, guards, interceptors
├── db/                DatabaseModule: pool, instância Drizzle, schema, check de conexão no boot
├── lib/               tem estado ou fala com o mundo: schema de env, clientes
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
- **`db/`** é acessado só por services — a fronteira entre service e banco é essa pasta. O
  `DatabaseModule` é `@Global()` e exporta a instância do Drizzle sob o token `DATABASE`; qualquer
  service injeta esse token, sem precisar importar o módulo. No boot, um `SELECT 1` roda antes da
  porta abrir — `DATABASE_URL` que não responde é configuração errada, e é pega no mesmo momento em
  que `envSchema.parse` já pega o resto. Isso é **checagem no código**, não `depends_on` do Compose:
  o Compose só ordena entre containers e a API roda no host; mesmo em container, ele garante só que o
  Postgres aceita conexão, não que a `DATABASE_URL` está certa. O que essa checagem não cobre é o
  banco cair **depois** do boot — é o que sustenta o `database`/`status: "degraded"` do `/health`
  (`health.service.ts`). Custo aceito: em produção, um blip do banco vira crash-loop; a mitigação é
  restart com backoff no host, decisão do #21.
- **Erro e não-encontrado** ficam em `common/filters/`. O `AllExceptionsFilter` é registrado uma
  vez, em `app.ts`, e é ele que sustenta o contrato de resposta: `{"error":"Not Found"}` em 404 e
  `{"error":"Internal Server Error"}` em 500, no lugar do corpo verboso que o Nest devolve por
  padrão. Se esse filtro sair, o contrato sai junto — em silêncio, porque o front lança em qualquer
  não-2xx sem ler o corpo. Por isso a coleção do Bruno tem um caso de rota desconhecida.
- **Ordem importa no bootstrap.** `configureApp` roda **antes** de `app.init()`. Prefixo, pipe e
  filtro registrados depois são ignorados pelas rotas já montadas, sem erro nenhum.
- **Schemas Zod de request/response** que o front também precisa moram em `packages/shared` (ex.:
  `healthQuerySchema`, `healthResponseSchema`), importados aqui pelo DTO e lá pelo `apiFetch`. Um
  schema só sobe para lá quando front e API precisam concordar sobre ele — ver "Estrutura do front".
- **`lib/` vs `utils/`** — `lib/` é código que *é* alguma coisa (tem estado ou fala com o mundo:
  `env.ts`, clientes de storage). `utils/` é função pura, testável sem mock. Nada em `lib/` precisa
  ser provider do Nest: só vira `@Injectable()` o que outro módulo injeta.
- **Testes de `apps/api`** — `*.spec.ts` é unitário e não toca banco nem HTTP (`health.service.spec.ts`
  mocka a dependência injetada, nunca a cadeia do query builder do Drizzle). `*.int-spec.ts` sobe o
  `AppModule` de verdade contra Postgres (`app.int-spec.ts`). `bun run test` roda os dois; `test:unit`
  e `test:int` isolam — o primeiro nunca exige o container de pé.

**Convenção de Bruno:** toda rota nova entra na coleção (`apps/api/bruno/`) no mesmo PR que a cria.

## Origem única: prefixo `api` e proxy

A API monta tudo sob o prefixo global `api` (`configureApp`, em `app.ts`) e o front chama **caminho
relativo** — `apiFetch` prefixa `/api` e não existe variável de ambiente com a URL da API. Em
desenvolvimento, o servidor do Vite faz proxy de `/api` para a porta da API (`vite.config.ts`, que lê
o `PORT` do `.env` da raiz para não duplicar o número).

**Por quê.** Uma origem só. O navegador enxerga apenas `:5173`, então o cookie de sessão é
first-party, sem CORS com credenciais para acertar e sem `SameSite=None` — que o Safari trata por
ITP e cujo sintoma é o usuário aparecer deslogado sem erro, no aparelho do cliente e não no nosso. A
alternativa, token em `localStorage`, funcionaria cross-domain e foi descartada: qualquer XSS
exfiltraria uma credencial válida por 90 dias.

**Em produção a regra é a mesma:** front e API sob o mesmo domínio raiz. Subdomínios grátis de
provedores diferentes (`*.pages.dev` + `*.fly.dev`) são domínios raiz distintos e quebram o cookie —
por isso registrar domínio próprio é requisito do deploy (ver § Hospedagem e provedores).

**Consequência para quem escreve rota:** o caminho na API, na coleção do Bruno e no teste de
integração inclui o prefixo (`/api/health`); o caminho passado ao `apiFetch` não (`/health`).

## Autenticação

**Better Auth self-hosted na API**, com o adapter Drizzle e montado no NestJS pelo pacote
community `@thallesp/nestjs-better-auth` — o que a documentação oficial do Better Auth aponta, e o
único caminho documentado, porque **não existe adapter first-party para Nest**. O que decidiu o
Better Auth foi ser self-hosted: conta, sessão e senha ficam no nosso Postgres, sem provedor externo
no caminho do login e sem conta em nuvem para desenvolver. As alternativas hospedadas (Auth0, Clerk,
Supabase Auth) foram descartadas pelo mesmo motivo pelo qual o resto da stack roda local: elas
tornariam impossível rodar o projeto inteiro offline, e a fronteira de permissão do produto
(RF-121/RF-122, papel por obra) vive no nosso banco de qualquer jeito.

Onde o código mora: `src/auth/auth.ts` monta a instância a partir do Drizzle injetado,
`src/auth/auth.module.ts` a entrega ao pacote do Nest por `forRootAsync`, e `auth.config.ts`, na raiz
do workspace, é o que a CLI do Better Auth lê para gerar o schema — mesmo lugar e mesmo motivo do
`drizzle.config.ts`.

**Como a sessão viaja.** Cookie `httpOnly` + `SameSite=Lax` (`Secure` em produção), que é o default
do Better Auth, com **90 dias de validade e renovação a cada 1 dia de uso** (RNF-04). O front nunca
envia `rememberMe: false` — isso transformaria o cookie em cookie de sessão do navegador e mataria a
persistência independentemente do prazo. A origem única (§ acima) é o que torna esse cookie
first-party.

**Quatro coisas que a montagem no Nest impõe**, e que quebram em runtime se alguma sair:

- **`bodyParser: false` na criação do app.** O handler do Better Auth lê o corpo da requisição do
  stream; um parser que rodou antes o deixa vazio. O `AuthModule` recoloca JSON e urlencoded para
  todo caminho **exceto** `/api/auth/*`, então as nossas rotas continuam recebendo corpo parseado. A
  opção mora em `nestApplicationOptions` (`app.ts`) e o teste de integração cria o app com ela — em
  um só dos dois lugares, só esse lugar quebra.
- **Guard global.** O pacote registra um `AuthGuard` para todas as rotas. Rota nova nasce protegida
  por esquecimento; o inverso vaza dado de obra. A exceção é anotada com `@AllowAnonymous()` e hoje
  é uma só, `health.controller.ts`, com teste que garante que continua pública.
- **`disableTrustedOriginsCors: true`.** Ligado, o módulo chama `enableCors` durante o `init` e
  sobrescreve em silêncio o que `configureApp` configurou, com uma lista de métodos mais estreita.
  CORS fica em um lugar só.
- **As rotas de auth não passam pelo Nest.** Elas são servidas por middleware antes do router, então
  não passam pelo `AllExceptionsFilter` nem pelo `ZodValidationPipe`: o corpo de erro delas é o do
  Better Auth, não `{"error": "..."}`. O front precisa traduzir os dois formatos.

**Defesas ligadas junto:** `helmet` para os cabeçalhos de segurança, o rate limit do próprio Better
Auth (5 tentativas de login por minuto e por IP, com a ressalva do parágrafo seguinte — a
biblioteca já traz um default mais estreito, e o nosso é escrito por extenso para que ninguém precise
caçar de onde veio um 429), e
`BETTER_AUTH_SECRET` obrigatório no `envSchema`: ausente ou curto, a API não sobe. Segredo fraco é
sessão forjável, e ele é diferente entre dev e produção.

**`trustedOrigins` recusa origem estranha, e isso aparece em ferramenta de API.** A checagem só roda
quando a requisição **carrega cookie** — é essa a forma de um ataque CSRF —, então a primeira chamada
de um cliente novo parece passar e as seguintes não. Com cookie: `Origin` fora da lista responde 403
`INVALID_ORIGIN`, e `Origin: null` — o que um iframe em sandbox manda, e o que o Bruno manda quando
ninguém define o header — responde 403 `MISSING_OR_NULL_ORIGIN`. Por isso as três requisições de auth
da coleção do Bruno mandam `Origin: {{webOrigin}}` explicitamente.

**Buraco conhecido no rate limit, que fecha no #21.** O Better Auth resolve o IP do cliente por
cabeçalho (`x-forwarded-for` por padrão) e cai para `127.0.0.1` em dev e teste. Em produção, sem
proxy reverso configurado, ele não resolve IP nenhum e **todas as tentativas caem num balde
compartilhado por caminho** — o limite continua valendo, mas passa a ser global em vez de por IP, e
uma pessoa errando a senha em looping tranca o login de todo mundo por um minuto. Consertar exige
saber qual proxy fica na frente da API, que é decisão do deploy: quando ela existir, entram
`advanced.ipAddress.ipAddressHeaders` e `advanced.ipAddress.trustedProxies`. Confiar no cabeçalho sem
`trustedProxies` seria pior do que o estado de hoje — o atacante troca o valor a cada requisição e o
limite deixa de existir.

**Fora de escopo por decisão, não por esquecimento:** verificação de e-mail e recuperação de senha
exigem provedor de e-mail transacional, e o primeiro e-mail que o produto precisa mandar de verdade
é o convite — as duas coisas pertencem ao épico #11. Nessa configuração o cadastro já devolve sessão
e as rotas de verificação e reset existem porém ficam inertes. **Consequência aceita:** sem
verificação de e-mail, a proteção contra enumeração de e-mail fica inativa — a API responde
diferente para e-mail já cadastrado. Impacto baixo num produto cujas contas são de funcionários
convidados, mas é escolha, e fecha em #11.

### Schema do Better Auth

As quatro tabelas (`user`, `session`, `account`, `verification`) são **geradas**, nunca escritas à
mão: `bun run --filter @bluprint/api auth:generate` reescreve `src/db/schema/auth.ts` a partir de
`auth.config.ts`, e a migration sai do `drizzle-kit` como no resto do projeto. A senha mora em
`account.password`, não em `user`. `is_platform_admin` é campo adicional do usuário com
`input: false`, e é isso — não code review — que impede alguém de se marcar super admin pelo payload
de cadastro (RF-101; é o RF-105 que essa fronteira protege). A coluna é `NOT NULL` de propósito: uma
flag de privilégio que pode ser nula joga um terceiro caso em cima de toda checagem que a lê.

As chaves estrangeiras para `user.id` são `text`, e continuam assim: as tabelas do Better Auth não
carregam decisão nossa e ficam como a CLI as gera, mesmo quando as nossas usam `uuid`.

**`casing: "snake_case"` precisa estar declarado nos dois lugares** — em `drizzle.config.ts`, que
gera a migration, e na instância do Drizzle em `db/database.module.ts`. Em um só dos dois, a
migration cria `email_verified` e a consulta pede `"emailVerified"`: passa no `typecheck`, passa no
`build`, falha na primeira requisição.

### Piso de versão do Node

**Node 24.9+**, no `engines` do `apps/api` e no CI. O Better Auth e o pacote de integração publicam
apenas ESM; a API compila para CommonJS e os alcança por `require(esm)`, que existe desde o Node
22.12. O piso mais alto é do **Jest**: ele só faz `require(esm)` com `vm.SourceTextModule`, que pede
Node 24.9 e a flag `--experimental-vm-modules` — daí o `NODE_OPTIONS` nos scripts de teste do
`apps/api`. A alternativa era transpilar `node_modules` pelo `transformIgnorePatterns`, que é mais
lento e esconde o problema em vez de resolvê-lo.

## Idioma

- **Inglês** — identificadores (variáveis, funções, tipos, arquivos, rotas), mensagens de erro da
  API, mensagens de commit, chaves de JSON de resposta.
- **pt-BR** — todo texto que o usuário lê na tela (RNF-05) e a documentação em `docs/`.

O front traduz o erro da API antes de exibir; a API nunca devolve texto pronto para tela.

Mensagem de commit segue **Conventional Commits**: `tipo(escopo): assunto`, em inglês e no
imperativo — `feat(api): connect local Postgres via Drizzle`. O escopo é o workspace afetado
(`api`, `web`, `shared`) e é omitido quando a mudança é do repositório inteiro. Os tipos em uso
são `feat`, `fix`, `docs`, `refactor`, `chore`, `test` e `ci`. O corpo, quando existe, explica o
porquê, não o quê — o diff já mostra o quê.

## Nomenclatura

- **PascalCase** — arquivos de componente React. O nome do arquivo é o nome do que ele exporta:
  `StatCard.tsx` exporta `StatCard`.
- **camelCase** — todo o resto: hooks (`useDashboardStats.ts`), helpers (`formatCurrency.ts`),
  módulos (`queryClient.ts`), pastas de feature (`features/adminDashboard/`).
- **Exceções, ambas por imposição de ferramenta:** `components/ui/` fica em kebab-case porque a CLI
  do shadcn gera assim (e ninguém edita à mão), e os arquivos em `routes/` seguem a sintaxe do
  TanStack Router (`admin.dashboard.tsx`, `$obraId.tsx`) — ponto separa segmento, `$` marca parâmetro.

## Fora de escopo por enquanto

Decisões conscientemente em aberto — não é esquecimento, é falta de problema real para decidir em
cima. Os dois primeiros esperam o épico da planta; **hospedagem** tem seção própria abaixo, porque
espera a aplicação existir.

- **Renderização da planta com pins.** Decide no épico da planta (#7/#8), com planta e volume reais na mão. A expectativa é ~100–300 pins por planta, não milhares.
- **Tratamento de imagem.** Compressão no cliente ou no servidor, upload direto para o object storage ou via backend, o que fazer com PDF. Mesmo épico.

### Hospedagem e provedores

Ficam em aberto os quatro: **host da API, host do front, provedor do banco e provedor do storage.**

**Por quê.** Todo critério que decide host — custo real, volume de requisição, tamanho de instância,
quanto o cold start incomoda de fato — só se mede com aplicação rodando, e nenhum deles existe hoje.
A prioridade é construir a aplicação; a escolha acontece no primeiro deploy, com uso medido em vez de
estimado.

**O que o adiamento custa: quase nada.** Trocar de host é o mesmo `Dockerfile` com outra configuração
de deploy — nenhuma linha de código de aplicação muda. Trocar de provedor de Postgres é
`pg_dump`/`pg_restore` e uma `DATABASE_URL` nova: os schemas e migrations do Drizzle são os mesmos em
qualquer Postgres. Storage é API compatível com S3 dos dois lados. **O que seria caro é adotar backend
proprietário** (Firestore, Firebase SQL Connect), porque aí não é migração, é reescrita — por isso
esses estão descartados abaixo, e não em aberto.

**Uma restrição já fechada:** front e API precisam ficar sob o **mesmo domínio raiz**, o que torna
registrar domínio próprio um requisito do primeiro deploy — ver § Origem única.

**Em desenvolvimento:** Postgres em container local e storage local compatível com S3. Nenhuma conta
em nuvem é necessária para rodar o projeto.

#### Levantamento de 04/09/2026

Feito para sustentar esse adiamento e registrado para não ser refeito. **Trate como foto** — preço e
free tier mudam rápido, e vários mudaram desde a versão anterior deste documento. Critérios: região no
Brasil, processo longo sem cold start, e free tier que não vença por prazo.

| Candidato | Região BR | Situação em 09/2026 |
| --- | --- | --- |
| Fly.io | ✅ GRU | Sem free tier desde 10/2024. `shared-cpu-1x` 512 MB ≈ US$ 3,32/mês — a mais barata das opções sem cold start |
| Cloud Run | ✅ `southamerica-east1` | O Always Free só vale em `us-central1`/`us-east1`/`us-west1`. Scale-to-zero sai por centavos mas tem cold start de 1–3s; `min-instances=1` em SP ≈ US$ 69/mês |
| AWS Lightsail | ✅ desde 06/2026 | US$ 5/mês fixos, 2 TB de banda inclusa. Você opera o SO |
| AWS EC2 | ✅ `sa-east-1` | Cobra por **hora ligada**, não por uso. `t3.micro` em SP ≈ US$ 11–12/mês |
| Render | ❌ | Nenhuma região na América do Sul. Free hiberna em 15 min com cold start de 30–60s; always-on US$ 7/mês |
| Railway | ❌ | Só US West/East, Amsterdam e Singapura. Sem free tier — Hobby tem piso de US$ 5/mês |
| Vercel | ✅ `gru1` | Hobby **proíbe uso comercial** — o mesmo motivo que já o tirou do host do front |
| Northflank | ❌ | Melhor free tier do mercado (sem cold start), mas sem região no Brasil |
| Koyeb | ❌ | Frankfurt/Washington. O free escala a zero em 1h e não dá para desligar |
| Azure App Service F1 | Brazil South | 60 min de CPU/dia, dorme em 20 min, sem suporte a produção |
| AWS App Runner | ❌ | Fecha para novos clientes em 30/04/2026 |
| Oracle Always Free | ✅ `sa-saopaulo-1` | VPS cru com idle reclaim; ARM em São Paulo vive sem capacidade |

**Sobre free tier que vence.** O free tier de 12 meses da AWS acabou para contas criadas depois de
15/07/2025 — virou US$ 100–200 de crédito por 6 meses, e a conta **fecha sozinha** ao fim. Os US$ 300
do Google Cloud são crédito de trial de **90 dias**, não free tier: ao fim, a conta de faturamento
fecha e os recursos param. Um free tier que vence por prazo é o mesmo modo de falha que já tirou
Render, Railway e Supabase da escolha do banco — o problema nunca foi performance, foi o que acontece
quando o prazo vence.

**Descartado por arquitetura, não por preço:** Firebase. O compute é Cloud Run por baixo e exige o
plano Blaze com cartão, e as cotas gratuitas não alcançam São Paulo. O SQL Connect (ex-Data Connect) é
GraphQL com SDK gerado para o **cliente falar direto com o banco** — usá-lo como foi projetado elimina
o `apps/api`, o Better Auth e a espinha de schema Zod compartilhado, e o RF-121/RF-122 (papel por
obra) viraria regra de segurança em GraphQL. Mantendo o NestJS na frente, ele não contribui com nada e
sobra só a fatura do Cloud SQL, que **não tem free tier em plano nenhum** (≈ US$ 8–12/mês
permanentes). Firestore, além disso, brigaria com o modelo relacional de obra → unidade → disciplina →
pin.

#### Favoritos ao reabrir

Não são decisão, mas o critério que os elegeu **não foi invalidado** por nada acima — nenhum deles
dependia da runtime:

- **Neon** (banco) — única com região São Paulo, branching grátis por PR e hibernação que **não apaga
  dados**. Os descartados falhavam por perda de dados: Render deleta o banco free em 30 dias corridos,
  Railway deleta o volume, Supabase pausa após 7 dias parado (restore manual), CockroachDB deleta após
  6 meses.
- **Cloudflare R2** (storage) — único object storage com egress grátis e ilimitado, que é o que torna
  o custo de foto previsível (RNF-15). S3 e Supabase cobram US$ 0,09–0,15/GB de saída, e no S3 a
  região São Paulo é ~67% mais cara.
- **Cloudflare Pages** (front) — banda e seats ilimitados no free. O plano Hobby da Vercel proíbe uso
  comercial; Netlify dá 1 seat.

#### Forma de execução, essa sim já decidida

Independente de onde rode, a API precisa de um **processo longo**: é ele que segura o pool de conexões
do Postgres e paga o bootstrap do container de DI do Nest uma vez só. Isso exclui qualquer host que só
ofereça função efêmera, e é o que torna cold start um critério — o RNF-11 dá ~3s em 4G para abrir a
planta, e um host que hiberna gasta esse orçamento inteiro antes da primeira query.

## CI

`.github/workflows/ci.yml`, job único de id `ci`, roda em todo `pull_request` e em `push` na `main`:
`bun install --frozen-lockfile`, build explícito do `@bluprint/shared` (o `lint` da raiz não constrói
o `shared`, e o `typescript-eslint` de `apps/api` é type-aware — sem o passo, um checkout limpo resolve
`@bluprint/shared` como `any` e degrada as regras em silêncio), `bun run lint`, `bun run typecheck`
(antes do `build`, de propósito — exercita o `routeTree.gen.ts` **commitado**, o que um checkout limpo
e o editor enxergam), `bun run build`, `git diff --exit-code` sobre o `routeTree.gen.ts` (denuncia se o
commitado estava desatualizado), `bun run --filter @bluprint/api db:migrate` e `bun run test`. Chama os
scripts da raiz, não as ferramentas por trás deles — workspace novo não exige editar YAML, e "passa
aqui" e "passa lá" são o mesmo comando.

Postgres sobe como service container (`postgres:18-alpine`, healthcheck `pg_isready`). `DATABASE_URL`
e `DATABASE_URL_TEST` apontam para o **mesmo** banco — a separação dev/teste existe só para não deixar
o Jest limpar um banco com dado de mão, e o runner nasce vazio e descartável a cada job.
`docker/postgres/init-test-db.sql` não é reproduzido no CI porque `services:` não monta arquivo do
repo em `docker-entrypoint-initdb.d`, e não precisa ser.

Versões pinadas — Bun `1.4.0`, Node `24` (o piso de `apps/api`'s `engines`; ver § Piso de versão do
Node) — porque Jest e o Nest CLI têm shebang de Node mesmo com Bun rodando os scripts.
`BETTER_AUTH_SECRET` entra no `env:` do workflow com valor descartável: sem ele o `envSchema` recusa
o boot e todo teste de integração falha. `permissions: contents: read` no topo;
`pull_request_target` nunca é usado, porque o repo é público e essa trigger roda código de fork com
permissão do repo-alvo.

Duas notas que não aparecem no diff do workflow:

- **Branch protection na `main` é configuração de repo, não código** — não é revisável em PR, e o
  nome do check só fica selecionável depois do workflow rodar verde ao menos uma vez. Aplicada com
  check obrigatório, `enforce_admins: true` (os três colaboradores são admin) e zero approves
  obrigatórios (ninguém aprova o próprio PR, e até aqui todo PR foi do mesmo autor).
- **A proteção só existe porque o repo é público** (desde 04/09/2026, para destravar branch
  protection no plano free). Voltando a privado sem GitHub Pro, ela para de valer **em silêncio**.

## Custo

Em desenvolvimento, **zero**: banco e storage rodam em container local, sem conta em nuvem.

Em produção, ainda **não estimável** — depende dos provedores, que estão em aberto. Pelo levantamento
em § Fora de escopo por enquanto, a ordem de grandeza dos candidatos vai de ~US$ 3/mês (Fly.io com
banco em free tier) a ~US$ 81/mês (Cloud Run sem cold start com Cloud SQL). A estimativa anterior
deste documento — "no free tier o custo é zero, fora dele US$ 25–45/mês" — **não vale mais**: em 2026
nenhum host com região no Brasil oferece free tier de processo longo.
