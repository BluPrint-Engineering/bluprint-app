# Requisitos — BluPrint

App de gestão de obra. Engenheiros e assistentes de engenharia mapeiam pendências da obra com **pins sobre plantas**, organizados por unidade e por disciplina, e exportam relatórios para os obreiros executarem.

**Legenda de prioridade (MoSCoW)**
**M** = Must (obrigatório no MVP) · **S** = Should (importante) · **C** = Could (desejável)

**Numeração:** o primeiro dígito do ID indica o módulo (RF-1xx = módulo 1, RF-2xx = módulo 2…). Novos requisitos entram no bloco do seu módulo, sem renumerar os existentes.

Base: meetings de definição do projeto (Luca Mandelli + João Pedro Proença Nicola) e app de referência do Gui. Última atualização: 30/08/2026 — sem pendências abertas.

---

## Personas

| Persona | Quem é | Escopo |
| --- | --- | --- |
| **Super admin** | Equipe BluPrint | Toda a plataforma, só metadados |
| **Admin da construtora** (gerente geral) | Cliente pagante, ex.: Melnick | Todas as obras da sua organização |
| **Gerente de obra** | Engenheira responsável pela obra | Só as obras em que foi vinculado |
| **Assistente de obra** | Assistente de engenharia (o Gui) | Só as obras em que foi vinculado |
| **Obreiro** | Quem executa o serviço | Sem conta — recebe relatório em PDF |

## Vocabulário

- **Organização** (ou Construtora) — o cliente que contrata as licenças. Ex.: Melnick.
- **Empresa executora** (ou empreiteira) — quem toca o serviço na unidade. Ex.: Hellers, Wack.
- **Obra** (ou projeto) — o empreendimento. Uma licença = uma obra. Ex.: Casa Moinhos.
- **Papel padrão** — o papel da pessoa no cadastro da organização; serve de sugestão.
- **Papel efetivo** — o papel da pessoa dentro de uma obra específica; é o que vale para permissão.
- **Geral** — a disciplina antes chamada de "arquitetônica". É a planta que aceita pin de qualquer disciplina.

## Paleta

Duas paletas independentes, em objetos diferentes: **status pinta a célula da unidade** no dashboard, **disciplina pinta o pin** sobre a planta.

**Status da unidade**

| Status | Cor |
| --- | --- |
| Em checklist | sem preenchimento, contorno `#CBD5E1` |
| Liberado para execução | laranja `#F97316` |
| Em execução | vermelho `#EF4444` |
| Liberado para reconferência | roxo `#8B5CF6` |
| Concluída | verde `#22C55E` |

**Disciplina**

| Disciplina | Cor |
| --- | --- |
| Geral | sem cor de pin — cada pin usa a cor da sua própria disciplina |
| Hidráulica | azul `#2563EB` |
| Elétrica | âmbar `#D97706` |
| Extras | escolhidas na criação, bloqueando azul, âmbar e cinza |

Cinza fica reservado para **pin concluído** e não pode ser cor de disciplina.

---

## 1. Contas, licenciamento e papéis

> **Princípio:** a licença é da **organização**, nunca da pessoa. A conta de usuário é neutra — o papel não vive no usuário, vive nos vínculos: um com a organização (papel padrão) e um com cada obra (papel efetivo).

### 1.1 Super admin e licenciamento

| ID | Requisito | Prio |
| --- | --- | --- |
| RF-101 | Persona **super admin**, restrita à equipe BluPrint, em área separada da aplicação do cliente | M |
| RF-102 | Cadastro da **organização** feito manualmente pelo super admin, após contato comercial e pagamento — não há cadastro self-service | M |
| RF-103 | Super admin atribui à organização as **licenças** contratadas; cada licença habilita **uma obra** | M |
| RF-104 | Painel do super admin lista as organizações cadastradas, licenças contratadas, obras criadas e licenças ainda disponíveis | M |
| RF-105 | Super admin **não acessa o conteúdo interno das obras** (plantas, pins, fotos, relatórios, dados de unidade) — apenas metadados, por LGPD | M |
| RF-106 | Ao cadastrar a organização, o sistema dispara o convite de acesso do primeiro **admin da construtora** | M |
| RF-107 | Super admin adiciona novas licenças a uma organização já cadastrada | S |
| RF-108 | Liberação automática da licença após o pagamento, sem passar pelo super admin | C |

### 1.2 Organização e admin da construtora

| ID | Requisito | Prio |
| --- | --- | --- |
| RF-110 | A licença pertence à **organização**, não ao usuário: a saída de um funcionário não afeta a obra nem a licença | M |
| RF-111 | **Admin da construtora** (o "gerente geral") é o papel de topo da organização e enxerga todas as licenças e obras dela | M |
| RF-112 | Admin **cria a obra** consumindo uma licença disponível; a obra nasce em branco | M |
| RF-113 | Painel de pessoas da organização: quem está cadastrado, o papel padrão de cada um e em quais obras está, com o papel em cada uma | M |
| RF-114 | Admin acessa o dashboard geral e o dashboard por unidade de qualquer obra da organização | M |
| RF-115 | Admin exporta qualquer relatório, em qualquer escopo, de qualquer obra da organização | M |
| RF-116 | Admin **não cria, edita ou exclui pins** e não altera status de pin nem de unidade — o acesso dele ao conteúdo operacional é de leitura e exportação | M |
| RF-117 | Mais de um admin por organização | S |
| RF-118 | Visão de consumo para a organização: licenças usadas × disponíveis | C |

### 1.3 Papéis, vínculos e convites

| ID | Requisito | Prio |
| --- | --- | --- |
| RF-120 | A conta de usuário é única e **sem papel global** | M |
| RF-121 | Dois vínculos por pessoa: **usuário↔organização** (guarda o papel padrão) e **usuário↔obra** (guarda o papel efetivo) | M |
| RF-122 | Toda verificação de permissão lê o **papel efetivo do vínculo com a obra**. O papel padrão nunca é usado para autorizar nada | M |
| RF-123 | O **papel padrão** tem duas funções, ambas de interface: gravar o papel de quem é convidado pelo painel geral (onde ainda não há obra) e pré-preencher a seleção ao adicionar a pessoa numa obra | M |
| RF-124 | A mesma pessoa pode ter papéis diferentes em obras diferentes. Alterar o papel padrão **não altera** os vínculos já existentes com obras | M |
| RF-125 | Login por e-mail, sem exigência de domínio corporativo | M |
| RF-126 | Só o **admin da construtora** convida gerentes de obra. Gerente convida apenas assistentes. Assistente não convida ninguém | M |
| RF-127 | Convite geral pelo painel da organização, **em lote** (colar vários e-mails de uma vez), sem vincular a nenhuma obra | M |
| RF-128 | Ao adicionar pessoas a uma obra, **dropdown** com quem já está cadastrado na organização, agrupado pelo papel padrão | M |
| RF-129 | Se a pessoa não está no dropdown, o convite é feito por e-mail ali mesmo — ela sai vinculada à organização **e** já vinculada àquela obra | M |
| RF-130 | Convidado **sem conta** é levado à tela de cadastro; ao concluir, um **modal** pergunta se aceita o convite | M |
| RF-131 | Convidado **com conta** vê o convite pendente e aceita ou recusa dentro da plataforma | M |
| RF-132 | Ao aceitar, o vínculo é criado com o papel definido no convite | M |
| RF-133 | Convite **expira em 7 dias** e usa **token de uso único**, invalidado após aceite, recusa ou expiração | M |
| RF-134 | Tela inicial lista as obras do usuário com o papel dele em cada uma; gerente e assistente só enxergam as obras a que foram vinculados | M |
| RF-135 | Obreiro **não** tem conta nem acesso à plataforma — recebe apenas o relatório em PDF | M |
| RF-136 | Gestão de pessoas: reenviar ou cancelar convite pendente, remover alguém de uma obra ou da organização, alterar papel padrão e alterar o papel numa obra específica | S |
| RF-137 | Usuário sai de uma obra por conta própria | S |
| RF-138 | Aviso ao vincular alguém a uma obra com papel diferente do padrão ("o Gui está cadastrado como assistente — confirmar como gerente nesta obra?") | S |

## 2. Configuração da obra

| ID | Requisito | Prio |
| --- | --- | --- |
| RF-201 | Obra criada pelo admin a partir de uma licença disponível, com nome definido por ele (ex.: "Projeto Casa Moinhos") | M |
| RF-202 | Cadastro da hierarquia física: **torres → andares → unidades → cômodos**, incluindo áreas comuns | M |
| RF-203 | Definição da nomenclatura/numeração de andares e unidades (901, 901A, etc.) | M |
| RF-204 | Cadastro dos **cômodos** de cada unidade (lavabo, cozinha, sacada…), usados como "local" do pin | M |
| RF-205 | **Todos os vinculados à obra** — admin, gerentes e assistentes — podem criar e alterar a estrutura a qualquer momento. A estrutura é editável de ponta a ponta, para corrigir erro ou completar o que faltou | M |
| RF-206 | Geração automática da estrutura (ex.: "12 andares × 4 unidades") com ajuste manual depois | S |
| RF-207 | Template de unidade: definir os cômodos uma vez e aplicar a todas as unidades iguais | S |
| RF-208 | Duplicar/clonar andar ou unidade já configurada | C |
| RF-209 | Unidade, andar ou torre **sem conteúdo** (nenhum pin e nenhuma planta) pode ser excluída direto, por qualquer vinculado à obra e sem cerimônia — é o caso do erro de cadastro | M |
| RF-210 | Item **com conteúdo** nunca é excluído: é **arquivado**. Sai do mapa de unidades, das contagens e dos relatórios, e passa a viver numa lista de arquivados na configuração da obra | M |
| RF-211 | Arquivar um andar ou uma torre arquiva a subárvore inteira; restaurar devolve tudo como estava, com pins, fotos e plantas intactos | M |
| RF-212 | O item arquivado registra quem arquivou e quando; a restauração é feita por gerente de obra ou admin | M |
| RF-213 | Cômodo em uso por algum pin não pode ser excluído. Pode ser **renomeado**, e o novo nome se propaga aos pins e aos relatórios | M |
| RF-214 | Exclusão definitiva de um item arquivado, restrita a gerente de obra e admin, com confirmação que informa exatamente o que será perdido ("12 pins, 8 fotos, 2 plantas") | S |

## 3. Empresas executoras

> **Princípio:** mesma lógica do papel do usuário — existe um **padrão** que preenche sozinho e um **override** onde a realidade for diferente.

| ID | Requisito | Prio |
| --- | --- | --- |
| RF-301 | Cadastro das **empresas executoras** que atuam na obra, na configuração do projeto (vira dropdown reutilizável) | M |
| RF-302 | Cada unidade tem uma **empresa executora padrão por disciplina** (na 901: hidráulica → Hellers, elétrica → Wack) | M |
| RF-303 | O pin nasce com a empresa executora do par **unidade + disciplina**, e quem cria pode **trocar no próprio pin** sem alterar o padrão da unidade | M |
| RF-304 | O padrão de cada unidade é alterável a qualquer momento; a atribuição é volátil ao longo da obra | M |
| RF-305 | O preenchimento do padrão é **por unidade**, no cadastro dela — não existe padrão único da obra, porque na prática cada unidade tem a sua empreiteira por disciplina | M |
| RF-306 | Preencher a empresa executora de várias unidades de uma vez (seleção múltipla ou aplicar a um andar inteiro) | S |
| RF-307 | Unidade sem empresa definida aparece como "sem empresa" no dashboard, nunca em branco silencioso | S |

## 4. Disciplinas e plantas

> **Princípio:** a planta **Geral** é o guarda-chuva — aceita pin de qualquer disciplina. As plantas de disciplina específica só aceitam os seus. E um pin nunca é perdido nem reclassificado por ter sido criado no lugar "errado".

| ID | Requisito | Prio |
| --- | --- | --- |
| RF-401 | Três disciplinas padrão em toda obra: **Geral** (antes chamada de arquitetônica), **Hidráulica** e **Elétrica** | M |
| RF-402 | Criação de disciplinas extras (alvenaria, estrutural, pintura…) por gerente **ou** assistente. Na criação o sistema pergunta **se a disciplina terá planta própria** e pede a **cor** | M |
| RF-403 | O seletor de cor bloqueia azul (hidráulica), âmbar (elétrica), cinza (reservado a pin concluído) e as cores já usadas por outras disciplinas daquela obra | M |
| RF-404 | Disciplina criada vale para a obra inteira e fica disponível a todos os usuários daquela obra | M |
| RF-405 | Upload da planta (imagem/PDF) **por unidade e por disciplina**, conforme a etapa da obra avança | M |
| RF-406 | Visualização da planta com zoom e pan, com os pins sobrepostos | M |
| RF-407 | **Planta Geral** aceita pin de **qualquer** disciplina da obra, inclusive das que já têm planta própria. Ao criar o pin ali, o usuário **escolhe** a disciplina — não existe pin com disciplina "Geral" | M |
| RF-408 | **Planta de disciplina específica** (base ou extra) aceita **somente** pins da própria disciplina, herdada e travada no momento da criação | M |
| RF-409 | Uma disciplina pode existir **sem planta própria**; nesse caso os pins dela são criados na planta Geral | M |
| RF-410 | Na planta Geral cada pin aparece com a **cor da sua própria disciplina** — é a única planta que mistura disciplinas | M |
| RF-411 | Pin criado na Geral com disciplina X **continua válido, contado e reportado como X** mesmo depois que a planta de X for cadastrada. Nunca é perdido, apagado nem reclassificado | M |
| RF-412 | Substituir a planta de uma unidade/disciplina mantendo histórico (versionamento) | S |
| RF-413 | Reposicionar manualmente um pin da Geral para a planta da sua disciplina, quando ela for cadastrada depois | S |
| RF-414 | Plantas de andar e de área comum (não só de unidade) | C |

## 5. Pins

| ID | Requisito | Prio |
| --- | --- | --- |
| RF-501 | Criar pin tocando na planta; a posição (x, y) fica salva sobre a imagem | M |
| RF-502 | Pin carrega: **foto**, **descrição** do problema, **local/cômodo**, **disciplina** e **empresa executora** | M |
| RF-503 | A **disciplina** é herdada e travada quando a planta é de disciplina específica (RF-408), e **escolhida pelo usuário** quando o pin é criado na planta Geral (RF-407) | M |
| RF-504 | A **empresa executora** vem do padrão unidade + disciplina e pode ser trocada no pin (RF-303) | M |
| RF-505 | Pin fica vinculado à **conta de quem o criou** (rastreio de autoria) | M |
| RF-506 | Status do pin: pendente / concluído, com distinção visual (concluído fica cinza) | M |
| RF-507 | Alterar o status do pin pela planta ou pela tela da unidade | M |
| RF-508 | Editar e excluir pin | S |
| RF-509 | Múltiplas fotos por pin | S |
| RF-510 | Registro de data/hora de criação e de conclusão do pin | S |
| RF-511 | **Fila offline**: criar pin e tirar foto sem rede, guardados localmente e enviados **ao reabrir o app com sinal**, com indicador visível de quantos itens estão pendentes | S |
| RF-512 | Comentários e histórico de alterações dentro do pin | C |
| RF-513 | Atribuir pin a um assistente responsável | C |

## 6. Unidade

| ID | Requisito | Prio |
| --- | --- | --- |
| RF-601 | Ficha da unidade com **status**: em checklist · liberado para execução · em execução · liberado para reconferência · concluída | M |
| RF-602 | Campos da unidade: data prevista de início, empresas executoras por disciplina, vendida/não vendida, observações internas | M |
| RF-603 | Contagem de itens (pins) pendentes **por disciplina** dentro da unidade, somando os pins criados na Geral e nas plantas específicas | M |
| RF-604 | Navegação: obra → torre → andar → unidade → disciplina → planta | M |
| RF-605 | Filtro de pins da unidade por disciplina, status e empresa executora | S |

## 7. Relatórios (entrega ao obreiro)

| ID | Requisito | Prio |
| --- | --- | --- |
| RF-701 | Exportar relatório em **PDF** contendo os itens, as fotos, a planta com a posição dos pins e o significado de cada pin | M |
| RF-702 | Escopo granular da exportação: por cômodo, por unidade, por disciplina, por andar ou pela obra inteira | M |
| RF-703 | O relatório por disciplina inclui os pins daquela disciplina **onde quer que estejam** — na planta específica ou na Geral (RF-411) | M |
| RF-704 | Relatório pronto para impressão (é entregue impresso ou enviado ao obreiro) | M |
| RF-705 | Filtrar o relatório por empresa executora e por status | S |
| RF-706 | Enviar o relatório por e-mail direto da plataforma | S |
| RF-707 | Layout do relatório com a marca da construtora | C |

## 8. Dashboards

| ID | Requisito | Prio |
| --- | --- | --- |
| RF-801 | Dashboard geral da obra com **mapa de unidades colorido por status**, seguindo a paleta do topo deste documento | M |
| RF-802 | Clicar em uma unidade abre o **dashboard daquela unidade**, com as pendências por disciplina | M |
| RF-803 | Visão por empresa executora: quais unidades cada uma é responsável, com a data prevista, e as unidades sem empresa | M |
| RF-804 | Indicadores gerais da obra: pins resolvidos × pendentes e disciplina com mais pendências | S |
| RF-805 | Exportar os dados do dashboard (PDF/planilha) para apresentar em reunião | S |
| RF-806 | Painel de acompanhamento dos assistentes, visível para **gerentes de obra e admin**: quantos pins cada assistente criou e a situação deles (pendentes × concluídos). É medida de volume levantado, não ranking de desempenho — o status depende da empreiteira que executa, não de quem criou o pin | S |
| RF-807 | Divisão de unidades por assistente responsável (setorização da equipe) | C |

---

## Requisitos não funcionais

| ID | Requisito | Prio |
| --- | --- | --- |
| RNF-01 | **Aplicação web mobile-first**: o uso principal é em campo, no celular, dentro do apartamento em obra. App nativo instalável fica para depois de produção | M |
| RNF-02 | A mesma aplicação no desktop, com layout mais denso para configuração da obra e dashboards | M |
| RNF-03 | Isolamento de dados em três níveis: super admin vê só metadados de organização e licença; admin vê a organização inteira; gerente e assistente veem só as obras a que estão vinculados, com o papel daquele vínculo | M |
| RNF-04 | Autenticação segura e sessão persistente (o usuário não reloga a cada visita em campo) | M |
| RNF-05 | Interface em **português (pt-BR)** | M |
| RNF-06 | Criar um pin em poucos toques, usável com uma mão, com luva e sob sol forte (contraste alto, alvos de toque grandes) | M |
| RNF-07 | Status e disciplina nunca comunicados **só por cor** — sempre com rótulo, ícone ou legenda junto (daltonismo, impressão em P&B) | M |
| RNF-08 | Cor de pin legível sobre planta clara: nada de tons claros sem contorno, porque a planta é branca com linhas finas e o uso é sob sol | M |
| RNF-09 | Compressão automática das fotos no upload, sem perder legibilidade do problema | M |
| RNF-10 | Escala alvo: obra com múltiplas torres, ~500 unidades e dezenas de milhares de pins e fotos sem degradação | M |
| RNF-11 | Abrir a planta com os pins renderizados em até ~3s em 4G | S |
| RNF-12 | Funcionamento com conectividade ruim ou intermitente (áreas internas de obra, subsolo). No navegador não existe sincronização com o app fechado — ver a decisão de plataforma | S |
| RNF-13 | Backup diário e política de retenção das fotos e dos dados da obra | S |
| RNF-14 | Conformidade com a LGPD: fotos, dados dos usuários, base legal, exclusão a pedido e a barreira de acesso do super admin (RF-105) | S |
| RNF-15 | Custo de armazenamento de imagens previsível e monitorado (fotos são o maior volume) | S |
| RNF-16 | Rastreabilidade: toda ação relevante identifica autor, obra e horário | S |
| RNF-17 | Disponibilidade ≥ 99% em horário comercial | S |
| RNF-18 | Acessibilidade (contraste, tamanho de fonte ajustável) | C |
| RNF-19 | Suporte a plantas em PDF vetorial, além de imagem | C |
| RNF-20 | Instalável na tela de início do celular (PWA), abrindo em tela cheia, sem barra do navegador | S |
| RNF-21 | Aviso ao usuário quando houver itens na fila offline há mais de 24h — o navegador pode descartar o armazenamento local sem avisar | S |

---

## Decisões estruturais

- **Licença é da organização** (RF-110), uma por obra. A saída de um funcionário não leva a obra junto.
- **Cadastro de organização é manual**, feito pelo super admin após contato e pagamento (RF-102). Self-service fica como evolução (RF-108).
- **Super admin não vê o conteúdo das obras** (RF-105) — só organizações, licenças e contagem de projetos.
- **Papel é por obra, com papel padrão na organização** (RF-121 a RF-124). A permissão sempre lê o vínculo com a obra; o papel padrão só sugere. Promover alguém não muda retroativamente as obras em que já está.
- **Hierarquia de convite** (RF-126): admin convida gerente, gerente convida assistente, assistente não convida.
- **Admin é leitura e exportação no operacional** (RF-114 a RF-116): vê dashboards, exporta qualquer relatório, não mexe em pin.
- **Estrutura da obra é editável por todos os vinculados** (RF-205), inclusive o admin.
- **Sem exigência de e-mail corporativo** (RF-125).
- **"Gerente geral"** da primeira meeting = admin da construtora, não é persona separada.
- **Empresa executora segue a mesma lógica do papel** (RF-302, RF-303): padrão por unidade + disciplina, override no pin. O padrão é preenchido unidade a unidade, porque na prática cada uma tem sua empreiteira por disciplina.
- **"Geral" é o novo nome de "arquitetônica"** e não existe pin com disciplina Geral (RF-401, RF-407).
- **Pin no lugar errado não se perde** (RF-411): a disciplina fica gravada no pin, não na planta. Vale para qualquer disciplina, não só hidráulica e elétrica.
- **Duas paletas independentes** (ver Paleta no topo): status pinta a célula da unidade, disciplina pinta o pin. "Em checklist" deixou de ser azul e virou célula sem preenchimento, liberando o azul para a hidráulica.
- **Excluir estrutura vazia é fácil, destruir trabalho de campo é difícil** (RF-209 a RF-214). Item sem conteúdo some na hora; item com pins ou plantas é arquivado, nunca apagado. Foto de obra não se refaz — quando alguém perceber o erro, o problema registrado pode já ter sido corrigido.
- **Plataforma: aplicação web mobile-first** (RNF-01, RNF-02, RNF-20). Um código só, React + Tailwind, usado no celular em campo e no desktop no escritório. App nativo é evolução pós-produção.
- **Limite consciente do offline no navegador** (RF-511, RNF-12, RNF-21). A fila local existe, mas o Safari do iPhone não sincroniza com o app fechado e pode descartar o armazenamento local após dias sem uso. Portanto: a fila sobe quando o assistente reabre o app com sinal, e a interface mostra o que está pendente. Offline completo e em segundo plano é uma das razões para o app nativo depois.
- **Métrica de assistente é volume, não desempenho** (RF-806): mede o que a pessoa levantou, e o painel deve ser rotulado assim. Quem trabalha numa torre em melhor estado encontra menos pendências.

## Pontos em aberto

Nenhum no momento. As duas últimas pendências foram fechadas em 30/08: métricas dos assistentes (RF-806) e exclusão de estrutura (RF-209 a RF-214).

## Como usar este documento

- Cada linha vira uma issue quando entrar no backlog; use o ID (RF-xxx / RNF-xx) no título ou no corpo para rastrear.
- Mudança de requisito entra por **pull request** — este arquivo é a fonte da verdade, e a issue linka para ele em vez de copiar o texto.
- IDs são estáveis: novos requisitos entram no fim do bloco do seu módulo, sem renumerar os existentes.
