# Proposal: Importação de Histórico Retroativo de Preços via Scraper

## Why

Atualmente, o monitoramento de passagens aéreas só constrói a série histórica de preços a partir do momento em que uma rota é cadastrada e executada nos ciclos do scanner. Isso faz com que novas rotas fiquem sem dados históricos até que semanas ou meses se passem.
O Google Flights dispõe de dados históricos dos últimos 30 a 60 dias para a maioria das rotas ativas. Capturar esses dados retroativos diretamente via Web Scraping (Playwright) permite popular instantaneamente o histórico e os gráficos de novas rotas sem custos de API externa.

## What Changes

- **Novo extrator de histórico retroativo no Scraper**: Adicionar método em `src/lib/scrapers/google-flights-scraper.ts` para extrair os pontos da série temporal histórica do Google Flights.
- **Inserção retroativa em lote no banco de dados**: Adicionar suporte em `src/lib/db.ts` para registrar múltiplos pontos históricos vinculados à rota sem duplicar datas.
- **Endpoint de API de Backfill**: Criar `POST /api/routes/[id]/backfill-history` para disparar a importação retroativa sob demanda.
- **Ação na Interface (UI)**: Adicionar botão de "Importar Histórico (30 dias)" nas páginas de gerenciamento de rotas (`/rotas`) e no histórico (`/historico`), com feedback visual de progresso.

## Capabilities

### New Capabilities
- `retroactive-price-history`: Capacidade de raspar séries temporais de preços passados do Google Flights, persistir no SQLite e exibir no histórico de preços.

### Modified Capabilities
<!-- Nenhuma especificação anterior existe no projeto -->

## Impact

- **Código Afetado**: `src/lib/scrapers/google-flights-scraper.ts`, `src/lib/db.ts`, `src/app/rotas/page.tsx`, `src/app/historico/page.tsx`, nova rota de API em `src/app/api/routes/[id]/backfill/route.ts`.
- **Dependências**: Reutiliza `playwright` e `better-sqlite3` já instalados.
- **Banco de Dados**: Popula a tabela `flight_history` com timestamps passados preservando a integridade dos dados existentes.
