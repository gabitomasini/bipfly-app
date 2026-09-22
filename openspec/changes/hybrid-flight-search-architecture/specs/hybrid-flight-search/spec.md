## Purpose

Orchestrates hybrid flight search requests by combining real-time scraped pricing data with cached historical pricing trends from Aviasales and Travelpayouts, ensuring resilient fallbacks and affiliate link attribution.

## ADDED Requirements

### Requirement: Unified Hybrid Flight Search Orchestration
The system MUST provide a unified search interface that queries both live scraper data and historical cached price trends concurrently.

#### Scenario: Both data sources respond successfully
- **WHEN** a user initiates a flight search with origin, destination, and departure date
- **THEN** the system returns a unified response containing both the live flight result (`liveData`) and historical price points (`historyData`)

#### Scenario: Live scraper failure with historical data available
- **WHEN** the live flight scraper times out or fails to extract prices
- **THEN** the system returns `liveData` as `null` and populates `historyData` with cached price points without returning an HTTP 500 or crashing

#### Scenario: Historical API failure with live scraper success
- **WHEN** the Aviasales / Travelpayouts API is unreachable or returns an error
- **THEN** the system returns the live flight result in `liveData` and an empty array `[]` in `historyData` without failing the overall request

### Requirement: Affiliate Link Attribution
The system MUST ensure that booking and partner redirect links generated or returned by the search services include the affiliate marker parameter `marker=780599`.

#### Scenario: Affiliate parameter presence in links
- **WHEN** flight booking or redirection links are generated
- **THEN** the link URL contains the query parameter `marker=780599`

### Requirement: Cached Historical Data Ingestion
The system MUST query the Aviasales Data API using caching with periodic revalidation to provide instant historical flight price trends.

#### Scenario: Historical price data caching
- **WHEN** historical price trends for a route are requested repeatedly within the revalidation interval
- **THEN** the response is served from the cache without redundant external API round-trips
