## Purpose

Provides passwordless authentication using cryptographically secure 6-digit OTP codes sent via email, rate limiting, and persistent HTTP-only session cookies.

## ADDED Requirements

### Requirement: Request Login Code (OTP)
The system SHALL allow users to request a 6-digit verification code sent to their registered email address for passwordless authentication.

#### Scenario: Code generated and dispatched for existing user
- **WHEN** a user submits a valid email address that exists in the system
- **THEN** the system generates a cryptographically secure 6-digit code, stores it with a 15-minute expiration timestamp, records `used_at = NULL`, and dispatches the code to the user's email

#### Scenario: Rate limiting exceeded
- **WHEN** a user or client IP requests more than 3 login codes within a 15-minute rolling window
- **THEN** the system rejects the request with HTTP 429 and an informative rate limit error message

#### Scenario: Unregistered email request
- **WHEN** an email is submitted that does not exist in the database and is not part of a route creation flow
- **THEN** the system returns a friendly response indicating the account was not found or suggests creating a route to get started

### Requirement: Verify Login Code and Issue Session
The system SHALL verify the 6-digit OTP code submitted by the user and issue a secure, persistent HTTP-only session cookie upon success.

#### Scenario: Successful OTP verification
- **WHEN** the user submits the correct 6-digit code for their email within 15 minutes of generation
- **THEN** the system marks the code as `used_at = current_timestamp`, creates a new active user session in the database, sets a secure HTTP-only session cookie with a duration of 30 to 90 days, and returns the authenticated user data

#### Scenario: Expired or already used OTP code
- **WHEN** the user submits a 6-digit code that has expired (older than 15 minutes) or has already been used
- **THEN** the system rejects the verification with an appropriate error message and does not create a session

#### Scenario: Invalid OTP code
- **WHEN** the user submits an incorrect 6-digit code
- **THEN** the system rejects the request with an invalid code error message

### Requirement: Session Authentication and Logout
The system SHALL validate the persistent session cookie on incoming requests and provide a mechanism to terminate the session.

#### Scenario: Authenticated request with valid session
- **WHEN** a request contains a valid `session_token` cookie
- **THEN** the system resolves the associated user profile and allows access to authenticated endpoints

#### Scenario: Logout terminates session
- **WHEN** an authenticated user triggers the logout action
- **THEN** the system invalidates the session record in the database, clears the session cookie from the browser, and returns the client to an unauthenticated state
