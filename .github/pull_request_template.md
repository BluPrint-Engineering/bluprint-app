Closes #

## O que muda

<!-- Duas ou três linhas: o que este PR faz, e por quê. -->

## Requisitos cobertos

<!-- Os IDs que a issue cita: RF-xxx, RNF-xx. Só os IDs — o texto normativo vive em docs/requisitos.md. -->

## Geral

- [ ] Se mudou uma regra de produto ou uma escolha de stack, o documento mudou no mesmo PR (`docs/requisitos.md` ou `docs/ARCHITECTURE.md`) — ou `n/a`

## Front

<!-- Não mexeu em interface? Escreva n/a nesta linha e deixe as caixas como estão. -->

- [ ] Screenshot **mobile** (o uso em obra é no celular, com uma mão)
- [ ] Screenshot **desktop**
- [ ] GIF do fluxo, se o PR muda uma interação
- [ ] RNF-05 — textos de interface em pt-BR
- [ ] RNF-06 — alvo de toque grande, alcançável com uma mão
- [ ] RNF-07 — status e disciplina nunca só por cor: rótulo, ícone ou legenda junto
- [ ] RNF-08 — cor legível sobre planta clara, sob sol forte

## Back

<!-- Não mexeu na API? Escreva n/a nesta linha e deixe as caixas como estão. -->

- [ ] Rota nova tem entrada na coleção Bruno — caminho do `.bru`: 
- [ ] Rota nova segue o contrato: schema em `packages/shared`, DTO `nestjs-zod` na API, parse no `apiFetch` do front (o `/health` é o exemplo completo)
- [ ] RNF-16 — a ação registra autor, obra e horário
