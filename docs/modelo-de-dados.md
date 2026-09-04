# Modelo de dados — rascunho

> **Este arquivo não é regra.** `docs/requisitos.md` é a fonte da verdade das regras de negócio e
> `docs/ARCHITECTURE.md` das decisões técnicas; a verdade do banco são os schemas Drizzle e as
> migrations. Aqui fica o **desenho pensado antes da primeira migration** e, principalmente, **o
> porquê de cada escolha** — para que daqui a seis meses ninguém precise reconstruir o raciocínio a
> partir de um `CREATE TABLE`.
>
> Espere divergência. Quando uma migration contrariar este texto, a migration ganha. Vale corrigir o
> arquivo no mesmo PR se a decisão mudou de verdade; não vale mantê-lo sincronizado coluna a coluna.

Desenho visual: **[board no Miro](https://miro.com/app/board/uXjVHrUOxfg=/)**.

Postgres (provedor em aberto, ver `ARCHITECTURE.md` § Hospedagem e provedores) + Drizzle.
Identificadores em inglês, conforme `ARCHITECTURE.md` § Idioma.

---

## A espinha

Tudo pendura numa cadeia só, e ler nessa ordem resolve quase toda dúvida de "onde isso mora":

```
organization → project → location → plan → pin
     (a construtora)  (a obra)   (torre, andar,   (a planta)  (a pendência)
                                  unidade, área
                                  comum)
```

Três princípios que o modelo inteiro serve:

1. **O papel efetivo vive no vínculo com a obra**, nunca no usuário (RF-122).
2. **Planta e pin penduram em qualquer `location`** — não só em unidade (RF-414).
3. **A disciplina é gravada no pin**, não lida da planta em que ele está (RF-411).

---

## 1. Contas, organização e licença

| Tabela | Colunas que importam | Por quê |
| --- | --- | --- |
| `user` | `email`, `is_platform_admin` | Conta única e **sem papel global** (RF-120). O super admin é uma flag, não um vínculo: ele não é `member` de organização nenhuma (RF-101). |
| `organization` | `name`, `slug` | A construtora. Cadastrada à mão pelo super admin, sem self-service (RF-102). |
| `member` | `organization_id`, `user_id`, `role` | Vínculo usuário↔organização, guarda o **papel padrão** (RF-121). Ele só sugere — nunca autoriza (RF-123). |
| `license` | `organization_id`, `project_id?` | A licença é da **organização**, nunca da pessoa (RF-110). `project_id` nulo = disponível; preenchido = consumida. Licenças livres saem de um `WHERE project_id IS NULL` (RF-104, RF-118). |
| `project` | `organization_id`, `name` | A obra. Nasce em branco, criada pelo admin a partir de uma licença livre (RF-112, RF-201). |

As tabelas `session`, `account` e `verification` são geradas pelo adapter Drizzle do Better Auth e
não carregam decisão nossa.

## 2. Papéis e convites

| Tabela | Colunas que importam | Por quê |
| --- | --- | --- |
| `project_member` | `project_id`, `user_id`, `role` | O **papel efetivo** — o único que autoriza (RF-122). A mesma pessoa pode ser gerente numa obra e assistente em outra (RF-124). |
| `invitation` | `organization_id`, `project_id?`, `org_role`, `project_role?`, `token`, `expires_at` | Tabela **nossa**, não a do plugin do Better Auth. `project_id` nulo = convite geral em lote pelo painel da organização (RF-127); preenchido = vincula org **e** obra numa tacada (RF-129). Token de uso único, 7 dias (RF-133). |

A hierarquia de quem convida quem (admin → gerente → assistente, RF-126) é validada na service, não
no schema: é regra de autorização, e ela lê `project_member.role`.

## 3. Estrutura física — a árvore

`location` é uma tabela só para **torre, andar, unidade e área comum**, em árvore por `parent_id`.

O RF-414 dá a andar e área comum planta, pin, relatório e contagem exatamente como a unidade. Com
quatro tabelas separadas, `plan.location_id` e `pin` precisariam ser polimórficos — uma coluna
`owner_type` + `owner_id` sem chave estrangeira de verdade, e o banco deixaria de garantir
integridade. É decisão de modelo, não de tela: incluir andar e área comum depois viraria migração.

| Coluna | Papel |
| --- | --- |
| `parent_id` | O pai na árvore. Nulo na raiz da obra. |
| `type` | `tower` · `floor` · `unit` · `common_area` |
| `path` | Cadeia de ancestrais materializada (`/1/2/4/`). Arquivar uma subárvore, contar por torre e montar a migalha de pão viram `LIKE`, não `WITH RECURSIVE`. |
| `archived_at`, `archived_by` | Item com conteúdo nunca é excluído, é arquivado (RF-210, RF-212). |
| `archived_directly` | `true` = arquivado sozinho; `false` = veio em cascata. Sem isso, restaurar o andar ressuscita a unidade que já estava arquivada antes (RF-211). |

**Pares pai → filho válidos.** Validados na service — o banco sozinho aceitaria `floor` dentro de
`floor`:

| Pai | Filhos permitidos |
| --- | --- |
| raiz da obra | `tower`, `common_area` |
| `tower` | `floor`, `common_area` |
| `floor` | `unit`, `common_area` |
| `unit` | nada na árvore (cômodos vão em `room`) |
| `common_area` | nada na árvore (pode ter `room`) |

Unidade **sempre** pendura num andar, nunca direto na torre. Área comum aparece nos três níveis:
garagem e fachada na raiz, salão na torre, hall no andar.

### `unit_detail`

1:1 com `location`, PK = `location_id`. Guarda `status`, `planned_start_date`, `is_sold` e `notes`
(RF-601, RF-602).

Separado porque o RF-808 é explícito: área comum não tem status de venda e o ciclo de status da
unidade não se aplica a ela. Dobrado em `location`, essas colunas seriam anuláveis, e o TypeScript
estrito do projeto obrigaria a tratar `status: unit_status | null` em todo código que só lida com
unidade. O join custa nada — são ~500 linhas por obra.

Histórico de status ficou **fora do MVP** (RNF-16 é *Should*). Quando entrar, vira uma
`activity_log` genérica que serve unidade e pin, não duas tabelas de histórico.

### `room`

Cômodo pendura em **unidade ou área comum** — o salão de festas tem cozinha e banheiro. Torre e
andar não têm cômodo, então o pin sobre a planta deles fica com `room_id` nulo.

Fica fora da árvore de `location` porque não é nível da hierarquia e nunca segura planta: ninguém
sobe uma planta "do lavabo".

O pin guarda `room_id`, **nunca o nome copiado** — o RF-213 exige que renomear um cômodo propague
para os pins e os relatórios.

## 4. Disciplinas e plantas

| Tabela | Colunas que importam | Por quê |
| --- | --- | --- |
| `discipline` | `name`, `color?`, `is_general`, `has_own_plan` | Vale para a obra inteira (RF-404). `is_general` marca a antiga arquitetônica — **não existe pin com disciplina Geral** (RF-407), e por isso ela é a única sem cor: na planta Geral cada pin usa a cor da própria disciplina (RF-410). `has_own_plan` falso significa que os pins dela nascem na planta Geral (RF-409). |
| `plan` | `location_id`, `discipline_id`, `storage_key`, `image_width`, `image_height` | Upload por local **e** por disciplina (RF-405, RF-414). As dimensões existem para converter a coordenada normalizada do pin. |

**`UQ (project_id, color)`** já bloqueia azul e âmbar, porque as seeds de hidráulica e elétrica os
ocupam. Cinza é reservado a pin concluído e precisa de bloqueio na aplicação (RF-403).

**Não existe unique em `plan (location_id, discipline_id)`** — e isso é deliberado. O RF-412 diz que
planta nova não substitui a antiga: as duas convivem na mesma disciplina, cada uma com os seus pins,
e o usuário escolhe em qual trabalha. As coordenadas de um pin só fazem sentido sobre a imagem em que
ele foi criado; reaproveitá-las numa planta nova moveria a pendência de lugar sem ninguém perceber.

Existe, isso sim, um **`UQ (id, location_id)` redundante** em `plan`. Ele não serve para nada
sozinho — `id` já é a PK. Está lá só porque o Postgres exige um unique no lado referenciado para
aceitar a chave estrangeira composta de `pin` (ver abaixo). Não apague achando que é sobra.

## 5. Pins e fotos

| Coluna | Papel |
| --- | --- |
| `id` | **UUID v7 gerado no cliente.** A fila offline reenvia ao reabrir o app com sinal (RF-511); com o id vindo do cliente, o reenvio é idempotente de graça. V7 em vez de v4 porque é ordenável por tempo e não fragmenta o índice nas dezenas de milhares de inserções do RNF-10. |
| `plan_id` + `location_id` | `location_id` é **denormalizado** de `plan`, travado por chave estrangeira composta `pin (plan_id, location_id) → plan (id, location_id)`. Isso deixa a contagem de pendências por unidade (RF-603, RF-801) resolver em índice, sem passar por `plan`, e o banco impede que os dois discordem. |
| `discipline_id` | **Gravada no pin.** Herdada e travada quando a planta é de disciplina específica (RF-408), escolhida pelo usuário quando o pin nasce na planta Geral (RF-407). É o que faz o RF-411 valer: pin criado na Geral como hidráulica continua contado e reportado como hidráulica depois que a planta de hidráulica existir — e é o que permite ao relatório por disciplina varrer os pins onde quer que estejam (RF-703). |
| `room_id?` | O cômodo, quando o pin está numa unidade ou área comum. Nulo em planta de torre ou andar. |
| `contractor_id?` | Nasce do padrão unidade + disciplina e é trocável no próprio pin, sem mexer no padrão (RF-303). |
| `x`, `y` | `decimal(8,6)`, **normalizadas 0–1** sobre a imagem. Pixel quebraria ao reprocessar a planta ou exibi-la em outra densidade. |
| `created_by` | Autoria (RF-505). Editar é de qualquer vinculado à obra; excluir é só do autor e do gerente (RF-508). |

`pin_photo` é tabela separada porque o MVP já mira múltiplas fotos por pin (RF-509), e o `id` também
vem do cliente pelo mesmo motivo de idempotência. As imagens ficam em object storage compatível com
S3 (provedor em aberto, ver `ARCHITECTURE.md` § Hospedagem e provedores); `storage_key` guarda a
chave.

`pin.project_id` continua denormalizado ao lado de `location_id`. Estritamente é redundante — dá
para chegar na obra pela árvore —, mas é o filtro de tenancy de toda query e de todo índice.

## 6. Empresas executoras

| Tabela | Por quê |
| --- | --- |
| `contractor` | As empreiteiras da obra, cadastradas na configuração; vira dropdown reutilizável (RF-301). |
| `location_discipline_contractor` | O **padrão** por unidade + disciplina — na 901, hidráulica → Hellers, elétrica → Wack (RF-302). `UQ (location_id, discipline_id)`. |

Não existe padrão único da obra: o preenchimento é unidade a unidade, porque na prática cada uma tem
a sua empreiteira por disciplina (RF-305), e é volátil ao longo da obra (RF-304). **Ausência de
linha** é o que o dashboard mostra como "sem empresa" (RF-307) — não é um valor especial, é a falta
do registro.

---

## Decisões fechadas em 03/09/2026

1. **Uma árvore só em `location`** para torre, andar, unidade e área comum — RF-414 dá planta e pin aos quatro.
2. **`unit_detail` 1:1 separado** — área comum não tem status nem venda (RF-808).
3. **`room` fora da árvore**, pendurado em unidade ou área comum; o pin guarda `room_id`, nunca o nome (RF-213).
4. **`invitation` nossa**, não a do plugin do Better Auth — o RF-129 exige org + obra no mesmo convite.
5. **`pin.id` e `pin_photo.id` em UUID v7 gerado no cliente**, e `x`/`y` normalizados 0–1 (RF-511).
6. **`pin.location_id` denormalizado**, travado por chave estrangeira composta com `plan`.

## Ainda em aberto

- **Lib de UUID v7 no front.** O `crypto.randomUUID()` do navegador só gera v4. É escolha de dependência e entra no épico do pin.
- **Nome da tabela `location`.** É escolha nossa, não vem dos requisitos; `space` e `place` foram os outros candidatos. `location` ganhou porque o RF-502 já chama o campo do pin de "local".
- **Renderização da planta com pins** e **tratamento de imagem** seguem fora de escopo, como registra o `ARCHITECTURE.md`.

## O que deliberadamente não existe

- **Tabela de relatório.** O relatório é gerado sob demanda e nada persiste: o RF-706 fecha o ciclo no aparelho do usuário (baixar, imprimir, compartilhar), e a plataforma não envia e-mail.
- **Histórico de alterações.** RNF-16 é *Should* e o RF-512 é *Could*. Quando vier, é uma `activity_log` genérica.
- **Papel no `user`.** Por definição: o papel vive nos vínculos (RF-120, RF-121).
