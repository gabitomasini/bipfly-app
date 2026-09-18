## Purpose

Associates monitored flight routes to authenticated users with progressive profiling onboarding and isolated multi-tenant route access.

## ADDED Requirements

### Requirement: Progressive Profiling on Route Creation
The system SHALL capture user contact details and authenticate the user transparently when creating a monitored route if no active session exists.

#### Scenario: Anonymous user creates route triggering contact modal
- **WHEN** an unauthenticated user fills out the flight search/monitoring form and submits it
- **THEN** the system displays a progressive profiling modal titled "Onde você deseja receber os alertas?" requesting email and optional name

#### Scenario: User creation and immediate route association
- **WHEN** the user submits their email (and optional name) in the progressive profiling modal
- **THEN** the system creates the user if they do not already exist, associates the newly created route to the user's `id`, establishes a persistent session cookie for the user, and sends a transactional confirmation/welcome email for the monitored route

#### Scenario: Authenticated user creates route directly
- **WHEN** an already authenticated user submits the route form
- **THEN** the route is immediately saved and linked to the active session's user ID without opening the contact modal

### Requirement: Scoped Route Access and Management
The system SHALL ensure that users can only view, update, delete, or trigger scans on routes belonging to their own user account.

#### Scenario: User views dashboard routes
- **WHEN** an authenticated user loads the route dashboard or requests `GET /api/routes`
- **THEN** the system returns only the routes belonging to that user's `id`

#### Scenario: Unauthenticated access to route listings
- **WHEN** an unauthenticated visitor accesses the routes page
- **THEN** the system prompts them to either create their first route or log in with their email

#### Scenario: Prevent unauthorized modification of other users' routes
- **WHEN** a user attempts to update or delete a route that does not belong to them
- **THEN** the system denies the operation with HTTP 403 Forbidden or HTTP 404 Not Found
