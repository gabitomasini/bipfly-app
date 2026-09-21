## Purpose

Provides cloud database persistence, remote synchronization, and offline fallback capabilities using Turso (LibSQL) for the flight price tracking application.

## ADDED Requirements

### Requirement: Turso LibSQL Cloud Connectivity
The system SHALL connect to remote Turso database instances over HTTP/WebSocket when `TURSO_DATABASE_URL` (or `DATABASE_URL`) and `TURSO_AUTH_TOKEN` environment variables are provided.

#### Scenario: Successful connection to Turso cloud
- **WHEN** valid `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` environment variables are configured
- **THEN** database queries execute against the remote LibSQL instance without requiring a local file system write lock

#### Scenario: Invalid credentials error handling
- **WHEN** an invalid `TURSO_AUTH_TOKEN` or unreachable URL is provided
- **THEN** the system logs a structured database connection error with diagnostic details and fails safely

### Requirement: Automatic Schema Initialization on Cloud Database
The system SHALL verify and automatically create all required database tables, indexes, and initial default settings on first connection to a Turso database if they do not exist.

#### Scenario: Fresh Turso database setup
- **WHEN** the application boots and connects to an empty Turso database
- **THEN** all schemas (`users`, `login_codes`, `user_sessions`, `monitored_routes`, `flight_history`, `app_settings`, `app_logs`) and corresponding indexes are initialized automatically

### Requirement: Graceful Fallback to Local SQLite for Offline Dev
The system SHALL fall back to the local SQLite file (`radar_passagens.db`) when Turso cloud credentials are not present in the environment.

#### Scenario: Running in offline local environment
- **WHEN** `TURSO_DATABASE_URL` is unset or empty
- **THEN** the application operates using the local SQLite database file seamlessly

### Requirement: Data Migration from Local SQLite to Turso
The system SHALL provide a CLI migration script to transfer all existing local tables, users, routes, price history, and system settings into the Turso database instance without data loss.

#### Scenario: Executing migration command
- **WHEN** developer runs `yarn db:migrate-turso` with local database and remote credentials present
- **THEN** all records from `radar_passagens.db` are copied to Turso, reporting exact row counts and verifying data integrity
