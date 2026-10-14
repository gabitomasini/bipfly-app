## Purpose

Provides resilient, accurate parsing of flight options from web aggregators, ensuring reliable stop count detection, proper preservation of direct versus connecting flights, and precise total travel duration parsing.

## ADDED Requirements

### Requirement: Robust Flight Stop Count Detection
The flight scraping engine MUST identify the exact number of stops for each parsed flight option and SHALL NOT default to zero (direct flight) when stop indicators are ambiguous or missing.

#### Scenario: Direct flight extraction
- **WHEN** a flight card contains clear non-stop labels such as "sem escalas", "voo direto", or "nonstop"
- **THEN** the parsed option sets the stop count to 0 and marks the option as a direct flight.

#### Scenario: Connecting flight extraction
- **WHEN** a flight card specifies one or more intermediate stops (e.g. "1 parada", "2 paradas", "1 escala", "1 stop", or "2 stops")
- **THEN** the parsed option records the exact integer count of intermediate stops.

#### Scenario: Ambiguous or unparseable stops
- **WHEN** a flight card text does not match any recognized stop pattern
- **THEN** the system marks the stop count as unknown or null and does NOT classify the flight as direct.

### Requirement: Independent Preservation of Direct and Connecting Options
The flight search processing pipeline MUST separate and preserve the best available direct flight options and best available connecting flight options before applying top-tier result truncations.

#### Scenario: Direct flight preserved when connecting flights are cheaper
- **WHEN** multiple connecting flights have lower prices than existing direct flights on the same page
- **THEN** the direct flight options are retained in the result set and the lowest direct fare is accessible to the monitoring engine.

#### Scenario: Route configured for direct flights only
- **WHEN** a monitored route has the direct-flights-only filter enabled and direct flights exist on the target date
- **THEN** the system successfully identifies the lowest direct price and does not return a false "no flights found" error due to price trimming.

### Requirement: Total Journey Duration Extraction
The flight scraping engine MUST extract the complete trip duration for a flight option and SHALL NOT record layover or intermediate connection waiting times as the total flight duration.

#### Scenario: Card containing layover and total duration
- **WHEN** a flight card displays both the total journey duration and a layover duration at a connecting airport
- **THEN** the system extracts the total journey duration in minutes and ignores the layover duration.

#### Scenario: Fallback duration extraction
- **WHEN** an explicit "total duration" label is not present in the card
- **THEN** the system parses the primary flight block duration while ignoring substrings preceded by transfer or layover terminology.
