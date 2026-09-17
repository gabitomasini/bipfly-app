## 1. Scraper de Histórico de Preços

- [x] 1.1 Implementar a função `scrapeGoogleFlightsPriceHistory(origin, destination, flightDate)` em `src/lib/scrapers/google-flights-scraper.ts` para extrair séries temporais de preços passados do Google Flights.
- [x] 1.2 Adicionar testes/validação direta da extração via script ou chamada de teste para garantir a captura correta de datas e valores numéricos.

## 2. Persistência de Dados no SQLite

- [x] 2.1 Adicionar em `src/lib/db.ts` a função `bulkInsertFlightHistory(records)` com verificação de unicidade para evitar duplicatas por rota e data de busca.
- [x] 2.2 Verificar integridade dos dados inseridos no banco `radar_passagens.db`.

## 3. Rota de API e Integração com Backend

- [x] 3.1 Criar o endpoint de API `POST /api/routes/[id]/backfill` (ou `POST /api/routes/backfill`) para orquestrar a extração e inserção do histórico de uma rota.
- [x] 3.2 Testar a rota de API com uma rota existente e validar a resposta HTTP com a contagem de registros importados.

## 4. Interface do Usuário (UI)

- [x] 4.1 Adicionar botão "Puxar Histórico (30d)" na lista de rotas (`src/app/rotas/page.tsx`) e na página de histórico (`src/app/historico/page.tsx`).
- [x] 4.2 Adicionar estados visuais de carregamento (spinner), feedback de sucesso (toast/alert) e atualização reativa do gráfico de preços.
- [x] 4.3 Realizar teste visual e validação de ponta a ponta.
