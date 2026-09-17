# retroactive-price-history Specification

## Purpose
Permite que o sistema extraia séries temporais de preços passados (histórico de até 30-60 dias) para rotas monitoradas via Web Scraping no Google Flights e popule a base de dados de histórico.

## Requirements

### Requirement: Extração de Histórico de Preços Retroativo
The system SHALL / O sistema DEVE ser capaz de raspar o histórico de preços dos últimos dias disponíveis no Google Flights para uma rota (origem, destino, data do voo) utilizando o motor Playwright headless.

#### Scenario: Coleta bem-sucedida de pontos retroativos
- **WHEN** a extração de histórico é solicitada para uma rota válida com dados históricos no Google Flights
- **THEN** o sistema retorna uma lista de registros contendo timestamp/data observada e o menor preço registrado naquele dia.

#### Scenario: Rota sem dados históricos no Google Flights
- **WHEN** a rota solicitada não possui histórico de preços disponível no Google Flights
- **THEN** o sistema retorna lista vazia ou erro informativo sem quebrar o fluxo da aplicação.

### Requirement: Persistência de Dados Históricos Retroativos
The system SHALL / O sistema DEVE persistir os pontos históricos coletados na tabela `flight_history` do banco de dados SQLite, evitando duplicação de leituras para uma mesma rota e data de pesquisa.

#### Scenario: Inserção de pontos sem duplicação
- **WHEN** múltiplos pontos de preços passados são salvos para uma rota
- **THEN** os registros são gravados com a data original em que o preço foi registrado (`searched_at`), identificador da rota e valor do preço.

### Requirement: Endpoint e Gatilho de Importação de Histórico
The system SHALL / O sistema DEVE expor um endpoint HTTP para disparar a importação retroativa de histórico sob demanda para uma rota monitorada.

#### Scenario: Disparo manual pela interface ou API
- **WHEN** o usuário clica no botão de importar histórico ou chama o endpoint `POST /api/routes/[id]/backfill`
- **THEN** o sistema inicia a extração, grava os dados no SQLite e retorna a contagem de dias/registros importados com sucesso.
