# Frontend Step-by-Step Implementation Plan

## Purpose

This plan defines a production-oriented execution path for evolving the current frontend architecture of the **National Port-to-Shelf Optimizer** while staying compatible with the existing monorepo, API Gateway contracts, role model, and CI/CD flow.

---

## 0) Current Frontend Baseline

- **Language/Runtime**: TypeScript, React
- **Repo model**: Monorepo with workspaces (`packages/*`, `services/*`)
- **Primary integration point**: `api-gateway`
- **Core user roles**:
  - Port authority / operations
  - Retailers
  - Logistics partners
  - Admin and compliance users
- **Shared dependencies**:
  - `shared-types` contracts
  - Authentication/JWT claims
  - ULIP-linked status visibility from backend services
- **Infra alignment**:
  - CI/CD via GitHub Actions
  - Deployment targets coordinated with Kubernetes environments

### 0.1 Baseline implementation status (completed)

The following baseline assets are now established in the repository:

- Frontend workspace scaffold at `services/frontend`
- Initial folder boundaries at `src/app`, `src/features`, `src/shared`, `src/config`
- Frontend workspace package manifest and TypeScript configuration

This closes the first execution step (Current Frontend Baseline) and prepares Phase 1 hardening tasks.

---

## 1) Foundation Hardening (UI Build, Types, Contracts)

### 1.0 Implementation status (completed)

Implemented baseline hardening assets:

- Strict frontend workspace checks (`lint`, `typecheck`, boundary guard, compile build)
- Frontend layer path aliases and module-boundary validation script
- Typed API contract models + runtime contract guards for critical payloads
- Contract validation tests and root script to run frontend foundation checkpoint

### 1.1 Frontend project consistency
1. Ensure strict TypeScript settings and linting across UI workspaces.
2. Align path aliases/import boundaries with built artifacts and shared packages.
3. Enforce component/module boundaries (design system, feature modules, app shell).
4. Add CI checks for type errors, lint violations, and unused exports.

### 1.2 API and DTO contract governance
1. Consume gateway contracts through typed client models.
2. Add contract validation tests for critical frontend API integrations.
3. Version major request/response changes and document migration notes.

### 1.3 Build and release guardrails
1. Enforce strict production build in CI.
2. Block release on failing unit/integration/e2e smoke gates.
3. Keep developer-only overrides isolated from release workflow.

---

## 2) Application Shell and Navigation Maturity

### 2.0 Implementation status (completed)

Implemented shell/navigation maturity baseline assets:

- Route map by domain with lazy module references
- Role-based route resolution with unauthorized and not-found fallbacks
- Standardized loading/empty/ready/error state helpers for feature pages
- Query policy defaults and request cancellation registry for rapid navigation
- Dedicated tests validating route guards, fallback behavior, and cancellation behavior

### 2.1 Route architecture
1. Define route map by domain: tracking, sloting, auction, analytics, administration.
2. Implement route-level code splitting and lazy loading.
3. Add role-based route guards and unauthorized fallbacks.

### 2.2 State and data loading
1. Standardize server-state strategy (caching, invalidation, retries).
2. Normalize global state usage and minimize duplicate derived state.
3. Add request cancellation for rapid navigation/filter changes.

### 2.3 Error and resilience UX
1. Standardize loading/empty/error states for all major pages.
2. Add global error boundary and feature-level fallback UI.
3. Add graceful degradation patterns when dependent APIs are unavailable.

---

## 3) Design System and Accessibility Reinforcement

### 3.0 Implementation status (completed)

Implemented design/a11y reinforcement baseline assets:

- Shared design tokens for color, spacing, typography, and radii
- Primitive style builders for button and status badge components
- Accessibility validators for aria labels, visible labels, and color-contrast checks
- Locale-aware formatting helpers for date/time and currency handling
- Dedicated tests validating token consistency, style primitives, a11y rules, and localization helpers

### 3.1 Component system
1. Build/align a shared component library for forms, tables, cards, charts, and status badges.
2. Enforce consistent spacing, typography, color tokens, and interaction states.
3. Add component-level visual regression snapshots for critical primitives.

### 3.2 Accessibility
1. Ensure keyboard navigation and focus management for all workflows.
2. Enforce semantic markup and ARIA usage where required.
3. Validate color contrast and screen-reader compatibility for dashboards/tables.

### 3.3 Internationalization readiness
1. Externalize user-facing strings.
2. Add formatting strategy for dates, timezones, units, and currency.
3. Validate UI behavior for longer localized content.

---

## 4) Domain UX Implementation Tracks

### 4.0 Implementation status (completed)

Implemented domain UX baseline assets:

- Tracking timeline mapper with anomaly flagging for delayed and arrived vessels
- Slot recommendation engine for capacity/ETA-aware ordering
- Auction winner selector with deterministic timestamp tie-break behavior
- KPI delta view mapper with filter-aware comparison labels
- ULIP sync banner model for healthy/stale/conflict operational messaging
- Dedicated tests validating each domain UX track behavior

### 4.1 Vessel and Container Tracking UX
1. Build timeline/map-centric views for shipment progression.
2. Add deterministic status progression UI tied to backend state machines.
3. Provide anomaly indicators (delays, route deviations, stale telemetry).

### 4.2 Slot Management and Auction UX
1. Build slot discovery, reservation, and conflict-resolution flows.
2. Add auction lifecycle screens (create, bid, monitor, finalize).
3. Surface tie-break and winner rationale from backend response metadata.

### 4.3 Metrics and Insights UX
1. Provide KPI dashboards with filterable dimensions (route, retailer, mode, time).
2. Add trend, baseline, and period-over-period comparisons.
3. Support export/report views for operations and compliance reviews.

### 4.4 ULIP Visibility UX
1. Expose sync status and freshness indicators for ULIP-dependent data.
2. Display reconciliation/conflict audit hints where backend flags mismatches.
3. Provide operational messaging for transient ULIP integration issues.

---

## 5) Frontend Security and Governance

### 5.0 Implementation status (completed)

Implemented frontend security/governance baseline assets:

- Scope-based path authorization helper for frontend capability gating
- Tenant ownership guard for tenant-aware data visibility checks
- Session-refresh trigger helper for proactive token renewal windows
- Sensitive-value masking and secure log redaction helpers
- Audit message formatter for critical action traceability in UI workflows
- Dedicated tests validating auth, tenant, masking/redaction, and audit behavior

### 5.1 Authentication and authorization
1. Implement secure token handling and renewal flow.
2. Map JWT claims/scopes to UI capabilities and hidden actions.
3. Enforce tenant-aware data visibility in UI filters and detail pages.

### 5.2 Sensitive data handling
1. Mask sensitive fields where policy requires.
2. Prevent sensitive payload leakage in logs and browser storage.
3. Add audit-friendly UX for critical user actions (approvals, overrides).

---

## 6) Testing Strategy (Execution Order)

### 6.0 Implementation status (completed)

Implemented frontend testing-strategy baseline assets:

- Contract-driven integration tests for typed API client behavior
- Resilience tests for retry policy defaults and request-cancellation semantics
- Non-functional performance budget evaluator with pass/fail validation tests
- Expanded frontend test pipeline chaining unit, integration, and resilience checks

### 6.1 Unit and component tests
1. Cover domain logic helpers, mappers, and critical UI state transitions.
2. Add component tests for forms, validation, and error rendering.

### 6.2 Integration tests
1. Validate page-level workflows with mocked API responses.
2. Add contract-driven tests for API client behavior and error envelopes.

### 6.3 End-to-end and non-functional tests
1. Add e2e scenarios for core journeys (track -> predict -> slot -> auction -> insights).
2. Add frontend performance budgets (bundle size, interaction latency).
3. Add resilience tests for degraded APIs and intermittent failures.

---

## 7) Observability and Operations

### 7.1 Frontend telemetry
1. Capture page load, route transition, and key interaction timings.
2. Track frontend errors with release/version tags.
3. Add business event instrumentation for major user journeys.

### 7.2 Monitoring and alerting
1. Define thresholds for frontend error rates and performance regressions.
2. Add dashboards aligned with backend service and gateway health.
3. Maintain runbooks for incident triage involving UI/API integration failures.

---

## 8) Deployment and Release Management

### 8.1 Build artifact policy
1. Produce immutable versioned frontend artifacts.
2. Ensure source map and release metadata mapping for error diagnostics.
3. Scan dependencies and enforce lockfile integrity.

### 8.2 Environment readiness
1. Externalize environment-specific API endpoints and feature flags.
2. Validate staging/prod parity for auth, routing, and gateway integration.
3. Add rollback-ready release strategy for frontend deployments.

### 8.3 CI/CD controls
1. Keep strict stages: lint -> typecheck -> unit -> integration -> build -> smoke.
2. Add post-deploy synthetic checks for critical pages.
3. Gate promotions on performance and error-budget thresholds.

---

## 9) Suggested Sprint Sequencing

### Sprint 1 (Hardening)
- Frontend TypeScript/lint/build consistency
- Route guards + standardized loading/error states
- Initial design-system alignment for core components

### Sprint 2 (Domain UX reliability)
- Tracking + slot/auction workflow completion
- Typed API client contract verification
- Accessibility baseline across critical journeys

### Sprint 3 (Operational readiness)
- Observability dashboards and alert thresholds
- E2E coverage for mission-critical flows
- Release runbooks and rollback drills

---

## 10) Exit Criteria for “Production Ready Frontend”

A release candidate is considered production-ready when:

1. All mandatory frontend checks (lint/type/unit/integration/e2e smoke) pass in CI.
2. Build is strict-green without developer-only overrides.
3. Core journey UX is verified for role-based access and tenant isolation.
4. Accessibility baseline (keyboard, contrast, semantics) is satisfied for critical screens.
5. Frontend error and latency metrics are within agreed thresholds.
6. Deployment artifacts are immutable/versioned and pass staged smoke checks.
