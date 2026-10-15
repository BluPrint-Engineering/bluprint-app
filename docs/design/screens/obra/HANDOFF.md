# Handoff - Obra: Nova obra, tela da obra e página não encontrada (#46)

Short version of `README.md`. Built from BluPrint design-system primitives (Alert, Avatar, Badge, Button,
Card, Checkbox, DropdownMenu, Field, Icon, Input, Logo, SegmentedControl, Sheet, Skeleton, Toast/Toaster).
**One new primitive, AlertDialog** (deliver confirmation), and six new lucide glyphs: `settings`, `pencil`,
`layers`, `users`, `wrench`, `map-pin-off`, all in `.claude/skills/bluprint-design/`. The generated
`_ds_bundle.js` does not carry them yet, so the prototype draws the dialog inline and loads the glyphs from
`icons/` with `Icon basePath`.

| File | What it is |
| --- | --- |
| `Obra.dc.html` | Live screens. Demo props: `theme`, `viewport`, `role` (admin / manager / assistant), `screen` (new / home / configuration / not-found), `state`, `vision`, `licensesAvailable`, `submitResult`, `renameResult`, `deliverResult` |
| `Obra QA.dc.html` | N1–N8, P1–P5 (with P1c), C1–C6, X1–X2 frozen, mobile + desktop, light + dark |
| `icons/` | The six new lucide glyphs |

| Screen | Route | #46 builds |
| --- | --- | --- |
| Nova obra | `/projects/new`, admin only | The whole page |
| Início da obra | `/projects/:id` | Obra header + blank-obra empty state, no button |
| Configuração da obra | `/projects/:id/configuration` | Dados da obra: name and rename (status card comes with its ticket) |
| Página não encontrada | unknown route; obra 404 | Both cases |

## Layout decisions (designer's calls)

- **Nova obra**: back link "Obras" above the form; Card on desktop, flat on mobile; title 28px/600; license
  line as the card description; button `lg` full width on both.
- **Obra header** (band under the app header, bottom border): back link, h1 name (28 / 36px, wraps), then
  status Badge + role in muted text for gerente / assistente (nothing for the admin, as on the card).
  Way into the configuração: outline "Configuração da obra" with `settings` on desktop; 44px outline icon
  button on the back-link row on mobile.
- **Configuração**: same band, back link reads "Início da obra"; h2 "Configuração". Dados da obra is a Card.
  With more than one section (vision), desktop adds a 200px sticky section nav on the left; mobile stacks.
  With only Dados da obra (#46) there is no nav.
- **Future sections (vision)**: dashed frames with name, requirements and epic, "Conteúdo e forma decididos no
  refinamento do #N.". No content: each epic's refinement decides it and may redesign the hub.
- **Início blank obra**: #46 (P1) has no button, "As pendências aparecem aqui quando a obra tiver estrutura.".
  The vision P1c ("Cadastrar estrutura") belongs to #6, which decides its copy and destination.
- **Status**: #46 shows it only in the header badge; the Status da obra card arrives with the later ticket.
- **Rename**: inline. "Renomear" (outline, `pencil`) turns the name row into a Field + "Salvar" / "Cancelar".
  Saving: "Salvando…", field locked. Success returns to read mode and the header shows the new name.
- **Status da obra** (later ticket): its own Card after Dados da obra. Badge + what the status means +
  outline "Entregar obra" with `circle-check`. Delivering is final: no reopen, no rename afterwards. The action
  opens an AlertDialog (new primitive; Sheet on mobile) listing what happens, with a checkbox "Entendi que a
  obra não poderá ser reaberta." that enables the primary "Entregar obra".
- **Assistente**: no Renomear and no status action; `lock` lines "Só o gerente de obra ou o admin da construtora
  renomeia a obra." and "… entrega a obra."
- **Início vision (P5)**: dashed placeholder regions for Indicadores (RF-804), Mapa de unidades (RF-801),
  Navegação (RF-604), Áreas comuns (RF-808). Not built; each is designed with its epic.

## States (QA ids)

N1 vazio com licenças · N2 última licença · N3a/b validação · N4 enviando · N5 sem licença no envio · N6 aberta
sem licença · N7 falha · N8 contagem carregando · P1 obra em branco (P1b gerente, P1c visão #6) · P2 entregue · P3 carregando ·
P4a erro · P4b sem conexão · P5 visão · C1 logo após criar · C2 configuração completa (C2b assistente) ·
C3a–d renomeando / validação / salvando / falha · C4 assistente · C5a entregar (diálogo) · C5b enviando · C5c falha · C6 entregue ·
X1 página não encontrada · X2 obra não encontrada.

## Copy written in this session (review)

Início: "A obra ainda não tem estrutura" · "As pendências aparecem aqui quando a obra tiver estrutura." ·
Configuração da obra · vision P1c: "Cadastre torres, andares e unidades para começar a mapear pendências." ·
Cadastrar estrutura · Entregue (badge `success` with `circle-check`) · Não foi possível carregar a obra.
Configuração: Início da obra · Configuração · Dados da obra · Nome da obra · Renomear · Salvar / Salvando… ·
Cancelar · "Não foi possível salvar o nome. Confira sua conexão e tente de novo." · "A obra foi entregue: o nome
não pode mais ser alterado." · Status da obra · "A equipe registra e resolve pendências. Entregue a obra quando
ela for passada ao cliente: depois disso ela fica fechada e não pode ser reaberta." · Entregar obra · Entregando
obra… · "Entregar “Casa Moinhos”?" · "A entrega fecha a obra de vez. Depois de confirmar:" · "Ninguém mais cria,
altera ou exclui pins, fotos, plantas, estrutura, equipe ou o nome da obra." · "A obra não pode ser reaberta." ·
"Os relatórios continuam disponíveis para exportar." · "Entendi que a obra não poderá ser reaberta." · "Não foi possível entregar a obra. Confira sua conexão
e tente de novo." · "Obra “Casa Moinhos” entregue." · "Entregue em 14/10/2026 por Rafael Souza. A obra está
fechada: nada mais pode ser alterado. Os relatórios continuam disponíveis."
Vision sections: see README.
