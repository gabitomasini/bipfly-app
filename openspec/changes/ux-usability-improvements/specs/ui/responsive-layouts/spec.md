## Purpose

Define os layouts adaptativos mobile-first para tabelas e cards de dados, garantindo legibilidade e usabilidade em telas pequenas, e a reorganização de ações para melhorar a discoverability de funcionalidades.

## ADDED Requirements

### Requirement: Tabela do Dashboard responsiva com cards em mobile
O sistema DEVE transformar a tabela de cotações do Dashboard em cards empilhados verticalmente em telas menores que `md` (768px), mantendo o formato tabela apenas em desktop.

#### Scenario: Dashboard em tela mobile exibe cards
- **WHEN** o usuário acessa o Dashboard em um dispositivo com tela menor que 768px
- **THEN** as cotações são exibidas como cards empilhados contendo: trecho (origem→destino), data do voo, preço atual, status, e botões de ação como ícones compactos

#### Scenario: Dashboard em desktop mantém tabela
- **WHEN** o usuário acessa o Dashboard em tela maior ou igual a 768px
- **THEN** as cotações são exibidas no formato tabela com 7 colunas

### Requirement: Botão "Buscar agora" visível no RouteCard
O sistema DEVE exibir o botão "Buscar agora" como ação visível diretamente no RouteCard, ao lado dos botões "Ver Voo" e "Histórico", ao invés de escondê-lo no menu contextual (`···`).

#### Scenario: Buscar agora visível sem abrir menu
- **WHEN** o usuário visualiza um RouteCard de uma rota ativa
- **THEN** o botão "Buscar agora" está visível diretamente na área de ações do card, sem precisar abrir o menu `···`

#### Scenario: Ações secundárias permanecem no menu
- **WHEN** o usuário abre o menu `···` de um RouteCard
- **THEN** apenas ações menos frequentes estão no menu: "Importar histórico", "Pausar/Retomar", "Editar", "Excluir"

### Requirement: MetricCards clicáveis com navegação contextual
O sistema DEVE tornar os MetricCards do Dashboard clicáveis, navegando o usuário para a página relevante com filtros pré-aplicados.

#### Scenario: Clique em "Rotas Ativas" navega para rotas filtradas
- **WHEN** o usuário clica no MetricCard "Rotas Ativas"
- **THEN** o sistema navega para `/rotas` com o filtro "Ativas" pré-selecionado

#### Scenario: Clique em "No Preço Alvo" navega para rotas no alvo
- **WHEN** o usuário clica no MetricCard "No Preço Alvo"
- **THEN** o sistema navega para `/rotas` com o filtro "No Alvo" pré-selecionado

### Requirement: Paginação na página de Logs
O sistema DEVE paginar os registros de log com controles de itens por página (10, 50, 100) e navegação por páginas, ao invés de renderizar todos os registros de uma vez.

#### Scenario: Logs exibem paginação
- **WHEN** a página de Logs é carregada com mais de 10 registros
- **THEN** apenas os primeiros 10 (default) são exibidos com controles de paginação (anterior/próxima, seletor de itens por página)

#### Scenario: Novos logs SSE respeitam paginação
- **WHEN** o stream SSE entrega novos logs enquanto a paginação está ativa
- **THEN** novos logs são inseridos no topo e a contagem total é atualizada, mantendo a página atual estável
