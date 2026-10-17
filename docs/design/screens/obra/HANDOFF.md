# Handoff - Obra: Nova obra, tela da obra e página não encontrada (#46)

Short version of `README.md`. Built from BluPrint design-system primitives (Alert, Avatar, Badge, Button,
Card, Checkbox, DropdownMenu, Field, Icon, Input, Logo, SegmentedControl, Sheet, Skeleton, Toast/Toaster).
**One new primitive, AlertDialog** (deliver confirmation), and six new lucide glyphs: `settings`, `pencil`,
`layers`, `users`, `wrench`, `map-pin-off`, all in `.claude/skills/bluprint-design/` and carried by
`_ds_bundle.js`; the prototype draws the dialog inline.

| File | What it is |
| --- | --- |
| `Obra.dc.html` | Live screens. Demo props: `theme`, `viewport`, `role` (admin / manager / assistant), `screen` (new / home / configuration / not-found), `state`, `vision`, `unitsFree` (livres on Nova obra, default 300), `submitResult` (success / no-units / fail), `renameResult`, `deliverResult`. Every prop also reads from the URL (`?screen=configuration&state=reserve-open`) |
| `Obra QA.dc.html` | N1–N8, P1–P5 (with P1c), C1–C7, X1–X2 frozen, mobile + desktop, light + dark |

| Screen | Route | #46 builds |
| --- | --- | --- |
| Nova obra | `/projects/new`, admin only | The whole page |
| Início da obra | `/projects/:id` | Obra header + blank-obra empty state, no button |
| Configuração da obra | `/projects/:id/configuration` | Dados da obra: name and rename (status card comes with its ticket); the unidades row and "Alterar reserva" come with 2.12 |
| Página não encontrada | unknown route; obra 404 | Both cases |

## Layout decisions (designer's calls)

- **Nova obra**: back link "Obras" above the form; Card on desktop, flat on mobile; title 28px/600 with no
  description; "Nome da obra" then "Unidades reservadas" (numeric, full width, help "300 livres na construtora.
  Dá para ajustar depois." as the Field hint, turning into "… Depois de criar, sobram 225." live once a valid
  number is typed; a skeleton while the livres load); button `lg` full width on both. Not enough livres on submit
  keeps both values and puts the server's number on the field as its error (like N3d); 0 livres disables the
  form with an Alert.
- **Dados da obra, unidades**: a second row under the name, separated by a hairline: "Unidades" over "Usa 250 de
  400 reservadas". The admin gets outline "Alterar reserva" with `sliders-horizontal`, presented like
  "Renomear"; gerente and assistente only read. Delivered: "Usou 380 unidades." under the card's lock line.
- **Alterar reserva**: plain dialog (Sheet on mobile, centered 30rem on desktop, as the deliver dialog) with one
  muted context line "A obra usa 250 unidades. A construtora tem 150 livres.", one field prefilled with the
  reserva, then two small figure tiles ("Restam na obra", "Livres na construtora", Geist Mono) that update live,
  with "Antes: 150" once the value changes and "–" for an impossible value; live errors under the field disable
  Salvar; success closes it, updates the row and toasts.
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
  The vision P1c is replaced by E1 in `../estrutura/`.
- **Status**: #46 shows it only in the header badge; the Status da obra card arrives with #168.
- **Rename**: inline. "Renomear" (outline, `pencil`) turns the name row into a Field + "Salvar" / "Cancelar".
  Saving: "Salvando…", field locked. Success returns to read mode and the header shows the new name.
- **Status da obra** (#168): its own Card after Dados da obra. Badge + what the status means +
  outline "Entregar obra" with `circle-check`. Delivering is final: no reopen, no rename afterwards. The action
  opens an AlertDialog (new primitive; Sheet on mobile) listing what happens, with a checkbox "Entendi que a
  obra não poderá ser reaberta." that enables the primary "Entregar obra".
- **Assistente**: no Renomear and no status action; `lock` lines "Só o gerente de obra ou o admin da construtora
  renomeia a obra." and "… entrega a obra."
- **Início vision (P5)**: dashed placeholder regions for Indicadores (RF-804), Mapa de unidades (RF-801),
  Navegação (RF-604), Áreas comuns (RF-808). Not built; each is designed with its epic.

## States (QA ids)

N1 vazio com livres · N1b número digitado (sobram) · N3a/b validação do nome · N3c/d validação das unidades · N4 enviando · N5 outro reservou
antes · N6 nenhuma unidade livre, dá para baixar outra reserva · N6b nenhuma unidade livre, nada para baixar · N7 falha · N8 livres carregando · P1 obra em branco (P1b gerente, P1c visão #6) · P2 entregue · P3 carregando ·
P4a erro · P4b sem conexão · P5 visão · C1 logo após criar · C2 configuração completa (C2b assistente) ·
C3a–d renomeando / validação / salvando / falha · C4 assistente · C4b gerente (reserva só leitura) · C5a entregar (diálogo) · C5b enviando · C5c falha · C6 entregue ·
C7a–e alterar reserva: aberto (C7a2 número digitado, com "Antes") / abaixo das usadas / acima das livres / salvando / salvo ·
X1 página não encontrada · X2 obra não encontrada.

## Copy written in this session (review)

Início: "A obra ainda não tem estrutura" · "As pendências aparecem aqui quando a obra tiver estrutura." ·
Configuração da obra · vision P1c: "Cadastre torres, andares e unidades para começar a mapear pendências." ·
Cadastrar estrutura · Entregue (badge `success` with `circle-check`) · Não foi possível carregar a obra.
Configuração: Início da obra · Configuração · Dados da obra · Nome da obra · Renomear · Salvar / Salvando… ·
Cancelar · "Não foi possível salvar o nome. Confira sua conexão e tente de novo." · "A obra foi entregue: o nome
e a reserva não podem mais ser alterados." (extended from "… o nome não pode mais ser alterado." now that the card
holds the reserva too) · Status da obra · "A equipe registra e resolve pendências. Entregue a obra quando
ela for passada ao cliente: depois disso ela fica fechada e não pode ser reaberta." · Entregar obra · Entregando
obra… · "Entregar “Casa Moinhos”?" · "A entrega fecha a obra de vez. Depois de confirmar:" · "Ninguém mais cria,
altera ou exclui pins, fotos, plantas, estrutura, equipe, disciplinas, empresas executoras ou o nome da
obra: nada mais na obra muda." · "A obra não pode ser reaberta." ·
"Os relatórios continuam disponíveis para exportar." · "Entendi que a obra não poderá ser reaberta." · "Não foi possível entregar a obra. Confira sua conexão
e tente de novo." · "Obra “Casa Moinhos” entregue." · "Entregue em 14/10/2026 por Rafael Souza. A obra está
fechada: nada mais pode ser alterado. Os relatórios continuam disponíveis."
Vision sections: see README.

Unidades (approved verbatim in the re-refinement, T1): Unidades reservadas · "300 livres na construtora. Dá para
ajustar depois." · "Informe quantas unidades reservar." · "De 1 a 300 unidades." · "Agora só restam 120 unidades
livres. Ajuste a reserva e tente de novo." (field error) · "300 livres na construtora. Depois de criar, sobram 225." · "Nenhuma unidade livre para uma obra nova. Baixe a reserva de outra
obra ou fale com a BluPrint." (only with reclaimable units) · "Nenhuma unidade livre para uma obra nova. Fale com a
BluPrint." · Unidades · "Usa 250 de 400 reservadas" · Alterar reserva · "Usou 380 unidades." ·
"A obra usa 250 unidades. A construtora tem 150 livres." · Restam na obra · Livres na construtora · "Antes: 150" · "A obra já usa 250 unidades. A reserva não pode ficar abaixo
disso." · "Só há 150 unidades livres." · "Reserva da Casa Moinhos: 450 unidades.". Written here, to review: the
dialog title "Alterar reserva" (the button's label) and the network failure "Não foi possível salvar a reserva.
Confira sua conexão e tente de novo." (README only, not drawn).
