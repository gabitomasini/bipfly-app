## Context

Ver `proposal.md` para a motivação. A aplicação possui um motor Playwright headless em `src/lib/scrapers/google-flights-scraper.ts` que atualmente navega até a página de busca do Google Flights e raspa apenas os cartões de voo do dia atual. O Google Flights disponibiliza na mesma página dados agregados do histórico de preços dos últimos 30 a 60 dias.

## Goals / Non-Goals

**Goals:**
- Implementar extração de dados históricos de preços no Google Flights utilizando Playwright (inspecionando o payload JSON embutido/scripts e/ou o painel de histórico de preços).
- Armazenar esses registros retroativos no SQLite (`flight_history`) vinculados à rota (`route_id`).
- Criar endpoint `POST /api/routes/[id]/backfill` para disparar a importação sob demanda.
- Adicionar botão de ação na interface (`/rotas` e `/historico`) para que o usuário execute o backfill com 1 clique e veja o gráfico atualizado.

**Non-Goals:**
- Não buscar histórico de anos anteriores ou além do período que o Google Flights disponibiliza publicamente (normalmente ~30-60 dias).
- Não alterar os agendamentos normais do Cron (o Cron continuará coletando o preço diário em tempo real).

## Decisions

### 1. Estratégia de Extração no Scraper
- **Decisão**: Priorizar a leitura dos blocos de dados serializados (`AF_initDataCallback` / script tags com pares `[timestamp, preço]`) na página do Google Flights e, como fallback secundário, inspecionar os atributos/tooltips do card de histórico de preços do DOM.
- **Alternativas consideradas**:
  - *Interação puramente visual no SVG*: Frágil a animações e alterações de layout CSS.
  - *SerpApi*: Consumiria créditos da cota mensal do usuário; o scraper Playwright já existente é gratuito e ilimitado.

### 2. Estrutura de Persistência no SQLite
- **Decisão**: Inserir os pontos na tabela `flight_history` com `searched_at` formatado como ISO string da data correspondente do passado (ex: `2026-08-20T12:00:00.000Z`) e `airline: 'Histórico Google Flights'`, evitando duplicatas por rota e data.
- **Alternativas consideradas**:
  - *Criar tabela separada*: Aumentaria a complexidade de junção nas consultas de gráficos. Usar `flight_history` permite que os gráficos existentes (`PriceHistoryChart` e `MultiRoutePriceChart`) funcionem instantaneamente sem modificação na camada de visualização.

## Risks / Trade-offs

- **[Risco] Rota sem histórico no Google Flights** → *Mitigação*: Tratar graciosamente retornando mensagem clara na interface de que não há dados históricos acumulados pelo Google para aquela rota específica.
- **[Risco] Variação na estrutura interna do Google Flights** → *Mitigação*: Robustecer o parser de scripts com expressões regulares flexíveis que identificam matrizes numéricas de timestamps e valores monetários.
