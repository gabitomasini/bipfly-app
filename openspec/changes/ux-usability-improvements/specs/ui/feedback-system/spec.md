## Purpose

Define o sistema global de feedback ao usuário (toast notifications) e os estados de carregamento visual (skeleton loaders) que substituem os padrões nativos do browser e os spinners centralizados, eliminando layout shifts e melhorando a percepção de performance.

## ADDED Requirements

### Requirement: Toast notifications globais
O sistema DEVE exibir notificações toast posicionadas no canto inferior direito da tela para feedback de ações do usuário (busca concluída, erro de conexão, etc.) sem deslocar o layout da página.

#### Scenario: Feedback de busca aparece como toast
- **WHEN** o usuário dispara uma busca via Navbar e a busca é concluída
- **THEN** um toast aparece no canto inferior direito com a mensagem de resultado, sem empurrar o conteúdo da página para baixo

#### Scenario: Toast com auto-dismiss e botão fechar
- **WHEN** um toast é exibido
- **THEN** ele desaparece automaticamente após 5 segundos, ou o usuário pode fechá-lo manualmente clicando no botão X

#### Scenario: Múltiplos toasts empilham verticalmente
- **WHEN** mais de um toast é disparado em sequência
- **THEN** os toasts empilham verticalmente (mais recente embaixo) sem sobreposição

### Requirement: Skeleton loaders nos MetricCards
O sistema DEVE exibir skeleton placeholders animados (retângulos com pulse) no lugar dos MetricCards enquanto os dados estão carregando, espelhando a forma e tamanho dos cards finais.

#### Scenario: Dashboard carregando mostra skeletons
- **WHEN** a página Dashboard está carregando os dados das rotas
- **THEN** os 4 MetricCards são substituídos por skeletons com animação pulse que ocupam o mesmo espaço visual

### Requirement: Skeleton loaders na tabela do Dashboard
O sistema DEVE exibir linhas skeleton na tabela de cotações do Dashboard durante o carregamento, com retângulos animados representando cada coluna.

#### Scenario: Tabela carregando mostra skeleton rows
- **WHEN** os dados de rotas estão sendo carregados no Dashboard
- **THEN** a tabela exibe 4-6 linhas skeleton com blocos animados no lugar do texto, ao invés de um spinner centralizado

### Requirement: Skeleton loaders nos RouteCards
O sistema DEVE exibir skeleton placeholders no lugar dos RouteCards na página de Rotas durante o carregamento.

#### Scenario: Página de Rotas carregando mostra card skeletons
- **WHEN** a página de Rotas está carregando os dados
- **THEN** cards skeleton com animação pulse são exibidos no lugar dos RouteCards reais
