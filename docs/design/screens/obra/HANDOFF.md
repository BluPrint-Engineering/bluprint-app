# Handoff - Obra: Nova obra, tela da obra e página não encontrada (#46)

Short version of `README.md`, which is the brief for the Claude Design session. The session answers it with
`Obra.dc.html` and `Obra QA.dc.html` in this folder and rewrites both files as the screen handoff.

| Screen | Route | #46 builds |
| --- | --- | --- |
| Nova obra | `/projects/new`, admin only | The whole page |
| Início da obra | `/projects/:id` | Obra header + blank-obra empty state ("Configurar obra") |
| Configuração da obra | `/projects/:id/configuration` | Dados da obra: name and rename |
| Página não encontrada | any unknown route; an obra the person cannot see | Both cases |

Design the whole tela da obra (início with dashboard and navigation regions, configuração with Dados da obra,
Estrutura, Equipe, Disciplinas, Empresas executoras, each empty); the editors inside the sections are each
epic's own design session, #6 first.

## Decided

- The form is a page, not a sheet or dialog. After creating: `/projects/:id/configuration`, toast
  "Obra “Casa Moinhos” criada.". The list card opens `/projects/:id`.
- The admin and everyone on the obra configure it, each within their role (ADR 0067). Rename: admin and
  gerente, delivered included (RF-217). Deliver / reopen: designed here, built later (ADR 0056).
- No license = API code `NO_FREE_LICENSE` → "Sem licenças disponíveis. Fale com a BluPrint.". Resending is safe
  (client-generated id, ADR 0068).
- Sections whose epic is not built are hidden in the app, never "em breve".

## States (QA ids)

N1 vazio com licenças · N2 última licença · N3 validação · N4 enviando · N5 sem licença no envio · N6 aberta
sem licença · N7 falha · N8 contagem carregando · P1 obra em branco · P2 entregue · P3 carregando · P4 erro /
sem conexão · P5 visão futura · C1 logo após criar · C2 configuração completa vazia · C3 renomeando · C4
assistente (só leitura) · C5 entregar / reabrir · C6 obra entregue · X1 página não encontrada · X2 obra não
encontrada.

## Copy (pt-BR, verbatim)

Nova obra · "Usa 1 das N licenças disponíveis." / "Usa a última licença disponível." · Nome da obra ·
Ex.: Casa Moinhos · Criar obra · Criando obra… · "Informe o nome da obra." · "O nome pode ter no máximo 120
caracteres." · "Sem licenças disponíveis. Fale com a BluPrint." · "Não foi possível criar a obra. Confira sua
conexão e tente de novo." · "Obra “Casa Moinhos” criada." · Página não encontrada · "O endereço pode estar
errado ou a página mudou de lugar." · Obra não encontrada · "Ela não existe ou você não tem acesso a ela." ·
Voltar para obras.
