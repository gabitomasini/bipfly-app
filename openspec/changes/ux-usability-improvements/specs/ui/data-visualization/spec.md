## Purpose

Define as melhorias na visualização de dados (gráficos, timestamps, histórico) e nos padrões de interação de formulários, focando em impacto visual, eficiência cognitiva e navegação fluida entre contextos.

## ADDED Requirements

### Requirement: Gráfico AreaChart com gradiente
O sistema DEVE renderizar o gráfico de evolução de preços como AreaChart com preenchimento gradiente abaixo da linha, ao invés de apenas LineChart.

#### Scenario: Gráfico exibe área preenchida
- **WHEN** o gráfico de preços é renderizado com dados históricos
- **THEN** a área abaixo da linha de preço é preenchida com um gradiente que vai de semi-transparente (junto à linha) até transparente (na base), mantendo as linhas de referência (meta e média) visíveis

### Requirement: Timestamps com formato relativo
O sistema DEVE exibir timestamps em formato relativo ("há 2 horas", "ontem", "há 3 dias") como padrão nos contextos de logs e histórico, com o timestamp absoluto acessível via tooltip ao hover.

#### Scenario: Log recente mostra "há X minutos"
- **WHEN** um log foi registrado há 15 minutos
- **THEN** o timestamp exibido é "há 15 min" com tooltip mostrando "16/09/2026, 14:30"

#### Scenario: Timestamp antigo mostra data relativa
- **WHEN** um registro de histórico foi feito há 5 dias
- **THEN** o timestamp exibido é "há 5 dias" com tooltip mostrando a data/hora absoluta

### Requirement: HistoryModal simplificado como preview
O sistema DEVE exibir o HistoryModal como um preview rápido contendo um gráfico sparkline compacto e as últimas 5 cotações, com um botão/link para navegar à análise completa na página de Histórico.

#### Scenario: Modal de histórico mostra preview e link
- **WHEN** o usuário abre o histórico de uma rota via botão no RouteCard ou tabela do Dashboard
- **THEN** um modal compacto exibe: gráfico sparkline com tendência, as 5 cotações mais recentes em mini-tabela, e um botão "Ver análise completa" que navega para `/historico` com a rota pré-selecionada

### Requirement: Busca interna no seletor multi-rota do Histórico
O sistema DEVE incluir um campo de busca dentro do dropdown multi-seleção de rotas na página de Histórico, permitindo filtrar rotas pelo código do aeroporto ou nome da cidade.

#### Scenario: Usuário busca rota por código
- **WHEN** o dropdown de multi-seleção está aberto e o usuário digita "MIA" no campo de busca
- **THEN** apenas rotas contendo "MIA" (como origem ou destino) são exibidas na lista de checkboxes

### Requirement: Botão Salvar sticky na Configurações
O sistema DEVE exibir o botão "Salvar Todas as Configurações" em uma barra fixa (sticky) na parte inferior da tela quando houver alterações não salvas na página de Configurações, desaparecendo quando não há mudanças pendentes.

#### Scenario: Botão aparece ao editar configuração
- **WHEN** o usuário modifica qualquer configuração (horário, tópico ntfy, provedor)
- **THEN** uma barra sticky aparece no bottom da tela com o botão "Salvar" e indicação de alterações pendentes

#### Scenario: Barra desaparece ao salvar
- **WHEN** o usuário clica em "Salvar" e a operação é bem-sucedida
- **THEN** a barra sticky desaparece e um toast de confirmação é exibido
