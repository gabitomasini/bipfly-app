## Purpose

Allows monitoring routes with granular direct vs connecting flight preferences, segregating direct flight prices from flights with stops in the database and user interface.

## ADDED Requirements

### Requirement: Route Direct Flight Preference Configuration
The system SHALL allow users to specify whether a monitored route tracks any flight (default) or exclusively direct flights, including a warning disclaimer when direct flights are selected.

#### Scenario: Creating a route with direct-only preference
- **WHEN** user enables "Apenas voos diretos" (Only direct flights) in the route creation modal
- **THEN** the system shows the informative disclaimer and persists `onlyDirect: true` in the database.

#### Scenario: Editing an existing route preference
- **WHEN** user edits an existing route to change the flight type preference
- **THEN** the system updates `onlyDirect` and applies the filter on subsequent scans.

### Requirement: Segregated Price Extraction and Persistence
The system SHALL extract both the lowest-priced direct flight and the lowest-priced connecting flight from search results, recording segregated metrics in flight history.

#### Scenario: Search results contain both direct and connecting flights
- **WHEN** the scraper finishes scanning a route with both 0-stop and 1+-stop flights
- **THEN** the system identifies `bestDirect` and `bestWithStops`, storing both in `flight_history` alongside the overall `lowest_price`.

#### Scenario: Route with onlyDirect enabled
- **WHEN** a scan executes for a route configured with `onlyDirect: true`
- **THEN** the system evaluates target-price alerts and notifications exclusively against the lowest direct flight price.

### Requirement: UI Presentation of Direct and Connecting Prices
The system SHALL display the most economical flight price by default on the dashboard while presenting direct flight quotation details when available.

#### Scenario: Route row display on Live Route Monitor
- **WHEN** viewing the dashboard table
- **THEN** the system displays the cheapest flight in primary focus with appropriate stop badges (`Direct` or `1 Stop`), and shows the lowest direct flight quotation when the cheapest flight has stops.
