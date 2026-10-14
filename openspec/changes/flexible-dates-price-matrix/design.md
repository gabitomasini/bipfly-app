## Context

Ver `proposal.md` para a motivação e visão geral do produto.

O BipFly possui uma arquitetura híbrida de dados:
1. **Playwright Chromium Scraper** para cotações em tempo real com fidelidade máxima, protegido por um semáforo assíncrono em memória (`withBrowserLock`) para evitar Out-of-Memory (OOM) em contêineres com recursos enxutos (Railway).
2. **Travelpayouts / Aviasales Data API** com Next.js fetch cache (`revalidate: 3600`) para obter dispersão e tendências de preço dos últimos 30 a 120 dias em milissegundos.
3. **Persistência LibSQL / Turso** para SQLite local e distribuído na nuvem.

Atualmente, cada rota monitorada persiste apenas `flight_date` e `return_date` estáticos, restringindo todas as consultas e análises estatísticas a essas datas exatas.

## Goals / Non-Goals

**Goals:**
- Permitir a configuração de flexibilidade de datas ($\pm 1, \pm 2, \pm 3$ dias ou somente finais de semana) sem quebrar nenhuma rota existente (retrocompatibilidade com padrão 0 dias).
- Alimentar a Matriz de Preços ($N \times M$ dias) de maneira ultra-rápida (sub-segundo) combinando a API de preços por mês da Travelpayouts e os dados persistidos em `flight_history` / `flight_prices`.
- Apresentar um componente visual de Heatmap (`PriceMatrixHeatmap`) intuitivo, responsivo e integrado ao design system existente (Tailwind CSS v4, Glassmorphism, paleta Slate/Sky/Emerald).
- Permitir a troca de data da rota com 1 clique diretamente da matriz interativa.
- Disparar alertas inteligentes que recomendam a data alternativa mais barata quando esta superar a data original.

**Non-Goals:**
- Disparar 25 ou 49 instâncias simultâneas do Chromium Playwright para preencher todas as células da matriz em tempo real (isso causaria esgotamento de memória e bloqueio de IP).
- Suporte a rotas multi-trecho / open-jaw (o escopo restringe-se a *One-Way* e *Round-Trip*).

## Decisions

### 1. Ingestão Híbrida Inteligente para a Matriz (API Agregadora + Cache Local)
- **Decisão:** O endpoint `/api/flights/matrix` consumirá os dados da Travelpayouts / Aviasales Calendar & Matrix API (`/v2/prices/month-matrix` ou `/v1/prices/cheap`) combinados com os registros mais recentes de `flight_history` do banco local. A cotação em tempo real via Playwright é acionada pontualmente apenas quando o usuário clica para inspecionar ou monitorar uma célula específica.
- **Alternativas consideradas:**
  - *Scraping completo de todas as combinações no Google Flights*: Descartado. Uma grade de $\pm 3$ dias (ida e volta) gera $7 \times 7 = 49$ combinações. Com execução serial respeitando o mutex, levaria de 8 a 15 minutos para carregar a matriz.
  - *Dados puramente simulados*: Descartado. Compromete a credibilidade das tarifas do produto.

### 2. Extensão do Esquema de Banco de Dados via Auto-Migração Idempotente
- **Decisão:** Adicionar colunas `flexibility_days INTEGER DEFAULT 0` e `flexible_weekends INTEGER DEFAULT 0` na tabela `monitored_routes`. No arquivo `src/lib/db.ts`, estender a função `initSchema()` com verificações idempotentes `ALTER TABLE monitored_routes ADD COLUMN ...` com bloco `try/catch` para ignorar se a coluna já existir.
- **Alternativas consideradas:**
  - *Criar tabela separada de preferências de rota*: Rejeitado para evitar joins desnecessários em consultas frequentes de scan.

### 3. Estrutura de Dados e Normalização do Heatmap
- **Decisão:** O payload da matriz normalizará as células no formato:
  ```typescript
  export interface PriceMatrixCell {
    departureDate: string; // YYYY-MM-DD
    returnDate?: string | null; // YYYY-MM-DD
    price: number | null;
    currency: string;
    isBaseDate: boolean;
    percentile: number; // 0 (mais barato) a 1 (mais caro)
    airline?: string | null;
    isCheapest: boolean;
  }
  ```
  O cálculo do percentil cromático é feito no cliente com base no menor e maior preço não-nulo da matriz, garantindo contraste consistente independente do patamar da rota.

### 4. Otimização do Scanner em Segundo Plano
- **Decisão:** Durante a rotina do `scanner.ts`, a varredura primária via Playwright continua focada na data base da rota. Se `flexibility_days > 0`, o scanner consulta a API de preços leves para verificar se alguma data vizinha apresenta tarifa inferior com diferença $\ge 10\%$ e abaixo do `target_price`. Se positivo, essa data recomendada é injetada no corpo da notificação.

## Risks / Trade-offs

- **[Risk: Rota regional sem histórico na Aviasales API]**  
  *Mitigação*: Células sem dados de API são renderizadas com estado neutro (`--`) e tooltip informativo, permitindo ao usuário acionar busca individual se desejar.
- **[Risk: Espaço reduzido em telas mobile para grade $7 \times 7$]**  
  *Mitigação*: O componente implementa container com rolagem horizontal suave (`overflow-x-auto`) e modo de visualização compacto em dispositivos móveis, com cabeçalhos de coluna e linha fixos (*sticky headers*).
- **[Risk: Mudança de fuso horário / inconsistência de formatação de datas]**  
  *Mitigação*: Todas as operações na matriz utilizam strings no formato rígido ISO `YYYY-MM-DD`, prevenindo variações de fuso horário causadas por parsing de objetos `Date` nativos no JavaScript.

## Migration Plan

1. Executar `initSchema()` atualizado na inicialização da aplicação para adicionar as novas colunas nas instâncias local e Turso.
2. Todas as rotas existentes assumirão automaticamente `flexibility_days = 0` e `flexible_weekends = 0`, mantendo comportamento inalterado.
3. Não há dependências de rollback destrutivas.
