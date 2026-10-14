## Purpose

Governs the lifecycle of monitored route creation, pricing scan execution, concurrency controls, timeout handling, and real-time status synchronization to prevent UI freezing and endless scanning.

## ADDED Requirements

### Requirement: Non-blocking Route Creation and Single Scan Dispatch
The system SHALL create monitored routes immediately, persist them to the database, and trigger a single asynchronous pricing scan without blocking route creation or initiating duplicate simultaneous scans from both client and server.

#### Scenario: User creates a new route
- **WHEN** a user submits the route creation form in RouteModal or AuthModal
- **THEN** the server creates the route record, responds with HTTP 201 immediately, and ensures only one price scan execution is initiated for that route.

#### Scenario: Single scan dispatch prevents duplicate execution
- **WHEN** a newly created route triggers an initial price check
- **THEN** the system SHALL NOT fire simultaneous parallel scrape operations for the same route from both route creation handlers and client search actions.

### Requirement: In-Flight Scan Deduplication
The scanning service SHALL deduplicate concurrent scan requests for the same route identifier by reusing active in-flight promises.

#### Scenario: Concurrent scan requests for the same route
- **WHEN** a scan request arrives for a route ID that is already undergoing an active scan
- **THEN** the scanning service SHALL return the existing in-flight scan promise rather than queuing a redundant second scan.

### Requirement: Scan Mutex Safety and Timeout Enforcement
The browser-based scraping engine SHALL enforce a strict operation timeout and guarantee mutex release across all execution outcomes, including errors, rejections, or process termination.

#### Scenario: Scraper exceeds execution threshold
- **WHEN** a scraping operation exceeds the maximum time threshold (40 seconds)
- **THEN** the system SHALL terminate the browser context, release the mutex lock, record the timeout error, and return a clean failure result.

#### Scenario: Scraper encounters unexpected runtime rejection
- **WHEN** a scraping execution throws an unhandled error or crashes
- **THEN** the mutex lock SHALL be guaranteed to release immediately, allowing subsequent queued or future requests to execute without deadlocking.

### Requirement: Client Scanning Timeout and Non-blocking Status Updates
The client application SHALL enforce a maximum wait duration on search requests and provide asynchronous status feedback without permanently locking the user interface.

#### Scenario: Client search request takes longer than 35 seconds
- **WHEN** an on-demand route search request via `/api/search` exceeds 35 seconds
- **THEN** the client aborts the pending HTTP request, turns off the global scanning state (`isScanning = false`), displays an informative toast indicating the search is continuing in the background, and refreshes dashboard route status.

#### Scenario: Route displays scanning state during background execution
- **WHEN** a route has a background scan in progress
- **THEN** the dashboard table and cards SHALL show an active scanning badge ("Consultando tarifas...") for that specific route while keeping the rest of the application fully responsive and interactive.
