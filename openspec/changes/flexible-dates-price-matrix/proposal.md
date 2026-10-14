## Why

Atualmente, o BipFly monitora apenas pares de datas fixas e inflexíveis para cada rota (ex: ida em 10/11 e volta em 15/11). No turismo de lazer e viagens flexíveis, alterar o voo em apenas 1 a 3 dias ou restringir a buscas em finais de semana pode representar economias de 30% a 60% na tarifa aérea. A ausência de suporte a datas flexíveis impede que os usuários descubram oportunidades imperdíveis vizinhas à sua data planejada.

Esta funcionalidade introduz o monitoramento com flexibilidade de datas ($\pm 1$, $\pm 2$ ou $\pm 3$ dias e finais de semana) e disponibiliza uma Matriz de Preços Interativa (Heatmap de Tarifas), permitindo ao viajante identificar visualmente as combinações mais baratas de partida e retorno e receber alertas de barganhas em dias alternativos.

## What Changes

- **Suporte a Flexibilidade de Datas no Cadastro de Rotas**: Adição dos campos `flexibility_days` (0, 1, 2 ou 3 dias) e `flexible_weekends` (booleano para finais de semana) no modelo de rota e na interface de criação/edição (`RouteModal`).
- **Serviço de Coleta da Matriz de Tarifas**: Integração do pipeline híbrido (Travelpayouts / Aviasales Calendar & Matrix API + fallback de cotações em cache) para alimentar a grade de preços $N \times M$ de forma instantânea sem onerar o scraper de tempo real.
- **Componente de Matriz de Preços Interativa (`PriceMatrixHeatmap`)**: Visualização em grade bidimensional (datas de ida vs datas de volta) com gradiente térmico de preços (verde para menores tarifas, âmbar para preços médios e vermelho para caros), destaque da data original e botão de aplicar nova data com 1 clique.
- **Detecção e Alerta Inteligente de Desvio de Data**: O scanner de segundo plano avalia se alguma data flexível atingiu a meta ou oferece um desconto significativamente maior que a data original, enviando no alerta (NTFY / E-mail) a recomendação da melhor data alternativa encontrada.
- **Visualização Integrada no Drawer e no Histórico**: Disponibilização do seletor e visualizador de matriz tanto no drawer de busca ao vivo (`FlightSearchResultsDrawer`) quanto na visualização detalhada de histórico da rota.

## Capabilities

### New Capabilities
- `flexible-date-monitoring`: Permite aos usuários configurar tolerância de datas ($\pm 1$ a $\pm 3$ dias ou somente finais de semana) para rotas monitoradas, executando verificação e disparando alertas para as datas alternativas mais vantajosas.
- `flight-price-matrix`: Provê um endpoint de agregação de matriz de datas e um componente de interface interativo em formato de heatmap, correlacionando datas de partida e retorno com tarifas mínimas encontradas e indicadores de economia.

### Modified Capabilities
<!-- Nenhuma capability existente tem seus requisitos alterados. -->

## Impact

- **Banco de Dados**: Migração/alteração na tabela `monitored_routes` para incluir as colunas `flexibility_days` (INTEGER, padrão 0) e `flexible_weekends` (INTEGER, padrão 0).
- **Tipos TypeScript**: Atualização de `MonitoredRoute` em `src/lib/types.ts` e novos tipos de matriz `PriceMatrixCell`, `PriceMatrixData`, `FlexibleDateOption`.
- **Serviços & APIs**:
  - Nova rota de API: `/api/routes/[id]/matrix` ou `/api/flights/matrix` com cache HTTP/Next.js.
  - Expansão de `src/services/aviasalesDataService.ts` para suportar consultas de matriz/calendário mensal da Travelpayouts.
- **Frontend**:
  - Novo componente `src/components/PriceMatrixHeatmap.tsx`.
  - Atualização do formulário `src/components/RouteModal.tsx`.
  - Atualização do drawer `src/components/FlightSearchResultsDrawer.tsx`.
- **Scanner & Notificações**: Atualização de `src/lib/scanner.ts` e templates de `src/lib/email.ts` e `src/lib/notifier.ts` para mencionar a data flexível mais barata.
