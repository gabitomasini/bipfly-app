## 1. Data Model & Types

- [x] 1.1 Adicionar os campos `flexibilityDays?: number` e `flexibleWeekends?: boolean` na interface `MonitoredRoute` e definir os tipos `PriceMatrixCell` e `PriceMatrixResponse` em `src/lib/types.ts`, verificando com `npx tsc --noEmit`
- [x] 1.2 Atualizar `src/lib/db.ts` com migração idempotente para adicionar `flexibility_days` e `flexible_weekends` em `monitored_routes`, ajustando as funções de inserção, leitura e atualização de rotas

## 2. Backend Services & API

- [x] 2.1 Estender o serviço `src/services/aviasalesDataService.ts` com método para consulta de calendário e matriz mensal de tarifas com cache ISR (`revalidate: 3600`)
- [x] 2.2 Criar rota de API `src/app/api/flights/matrix/route.ts` que recebe origem, destino, datas e tolerância, agregando dados da Travelpayouts e histórico local em uma grade normalizada
- [x] 2.3 Atualizar o motor de varredura `src/lib/scanner.ts` para verificar datas adjacentes em rotas com flexibilidade e incluir recomendações de datas nos alertas (`src/lib/notifier.ts` e `src/lib/email.ts`)

## 3. Frontend & Componentes Interativos

- [x] 3.1 Desenvolver o componente `src/components/PriceMatrixHeatmap.tsx` com visualização em grade bidimensional, gradiente térmico de percentis de economia, cabeçalhos fixos e suporte responsivo a dispositivos móveis
- [x] 3.2 Atualizar `src/components/RouteModal.tsx` incluindo o seletor de flexibilidade de datas ($\pm 1, \pm 2, \pm 3$ dias e toggle de finais de semana)
- [x] 3.3 Integrar o `PriceMatrixHeatmap` no drawer de resultados de voos (`src/components/FlightSearchResultsDrawer.tsx`) permitindo seleção e atualização da rota com 1 clique

## 4. Internacionalização & Validação Final

- [x] 4.1 Adicionar as chaves de internacionalização de flexibilidade, matriz de tarifas e economias em `src/lib/i18n/translations.ts` para português (`pt-BR`) e inglês (`en-US`)
- [x] 4.2 Validar a integridade de tipos e compilação do projeto com `npx tsc --noEmit` e `npm run build`
