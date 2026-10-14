## Purpose

Secures administrative, configuration, and heavy computational API endpoints against unauthenticated access, prevents credential leakage, and protects background automation jobs from abuse.

## ADDED Requirements

### Requirement: Administrative Settings Protection and Credential Masking
The system SHALL require authenticated administrator privileges to view or update system settings, and MUST NOT expose raw private credentials or webhook topics to unauthenticated clients.

#### Scenario: Unauthenticated request to settings endpoint
- **WHEN** an unauthenticated client sends a GET or POST request to `/api/settings`
- **THEN** the system rejects the request with HTTP 401 Unauthorized or HTTP 403 Forbidden and returns no secret configuration data.

#### Scenario: Authenticated administrator access
- **WHEN** an authenticated administrator sends a GET request to `/api/settings`
- **THEN** the system returns the configuration parameters needed for the admin console.

#### Scenario: Non-admin user attempt to update settings
- **WHEN** an authenticated user without administrator privileges attempts to POST new configuration to `/api/settings`
- **THEN** the system rejects the update with HTTP 403 Forbidden.

### Requirement: Scheduler Management Access Control
The system MUST restrict manual scheduler restarts and immediate full-system scan executions to authenticated administrators.

#### Scenario: Unauthenticated request to trigger immediate scan
- **WHEN** an unauthenticated request is sent to `/api/scheduler` with an action to run an immediate scan or restart the scheduler
- **THEN** the system rejects the execution with HTTP 401 Unauthorized or HTTP 403 Forbidden without launching background scraper workers.

#### Scenario: Administrator triggering immediate scan
- **WHEN** an authenticated administrator issues a request to trigger an immediate scan via `/api/scheduler`
- **THEN** the system verifies administrator rights and initiates the route scanning sequence.

### Requirement: Scraper and Notification Test Endpoint Shielding
The system MUST protect resource-heavy test endpoints that launch browser processes or dispatch external notifications, preventing unauthenticated external invocations.

#### Scenario: Unauthenticated test scraper execution
- **WHEN** an anonymous request is posted to `/api/scraper/test`
- **THEN** the system rejects the request immediately with HTTP 401 or HTTP 403 without launching a browser automation instance.

#### Scenario: Unauthenticated test notification dispatch
- **WHEN** an anonymous request is posted to `/api/notify/test`
- **THEN** the system rejects the request immediately with HTTP 401 or HTTP 403 without sending external push notifications.

#### Scenario: Authenticated administrator executes test tool
- **WHEN** an authenticated administrator posts a valid payload to `/api/scraper/test` or `/api/notify/test`
- **THEN** the system authorizes the action and executes the test diagnostic.
