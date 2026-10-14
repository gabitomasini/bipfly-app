## Purpose

Connects the statistical anomaly detection engine (Z-score and Bessel's correction) to the runtime route scanner, enabling automated evaluation of historical price drops and dispatching multi-channel alerts for statistically significant price drops.

## ADDED Requirements

### Requirement: Statistical Anomaly Evaluation in Route Scans
The automated route scanning engine MUST evaluate every collected flight fare against historical price records for that route using sample mean, standard deviation with Bessel's correction ($N-1$), and Z-score computation.

#### Scenario: Identification of a statistical opportunity
- **WHEN** a newly scraped lowest fare has a computed Z-score of -1.5 or lower relative to historical observations (with at least 3 historical points)
- **THEN** the system classifies the quote as an opportunity ("OPORTUNIDADE" or "IMPERDIVEL") and marks it as a deal.

#### Scenario: Quoting with insufficient sample history
- **WHEN** a monitored route has fewer than 3 historical price observations
- **THEN** the system computes initial baseline metrics without classifying standard fluctuations as deals until adequate sample variance can be established.

### Requirement: Multi-Channel Anomaly Alert Dispatch
The system MUST dispatch notifications via Push (NTFY) and transactional email when a statistical price anomaly is confirmed, including detailed statistical metrics in the notification payload.

#### Scenario: Alert triggered by anomaly above fixed target price
- **WHEN** the scraped fare is higher than the user's static target price but exhibits a Z-score of -1.5 or lower (statistical anomaly)
- **THEN** the system triggers the notification flow and informs the user of the detected anomaly.

#### Scenario: Enrichment of notification message with statistical context
- **WHEN** an alert is triggered due to a statistical deal
- **THEN** the notification text and email body include the deal classification, the historical average fare, the standard deviations below mean, and the percentage saved.

#### Scenario: Suppressing alerts for normal price variance
- **WHEN** a scraped fare is within normal statistical distribution ($Z > -1.5$) and does not meet the user's fixed target price
- **THEN** the system logs the collected fare to history without triggering push or email alerts.
