# Service Milestones

This document tracks the current product milestone for each application service/workstream and the recommended next delivery step.

> Note: all upcoming frontend milestones should preserve and improve responsive behavior so the application remains usable across desktop, tablet, and mobile breakpoints.

## Milestone status key

- **Completed milestone**: user-facing UX or service baseline is in place and usable.
- **In progress**: the workflow exists but still needs interaction depth, governance, or live integration.
- **Next milestone**: recommended next delivery target.

## Frontend experience milestones

### 1. Dashboard

- **Status**: Completed milestone.
- **Delivered**:
  - operational KPI cards,
  - command-center hero summary,
  - quick actions,
  - alerts rail,
  - activity feed,
  - corridor health summary.
- **Next milestone**:
  - wire dashboard widgets to live APIs,
  - add drilldowns from alerts/KPIs into Tracking and Auctions.

### 2. Tracking service UX

- **Status**: Completed milestone for mock-first operator workflow.
- **Delivered**:
  - search across tracking identifiers and operational metadata,
  - multi-filter workflow (status, mode, priority),
  - sticky tracking table,
  - record selection + detail drawer,
  - shipment status timeline.
- **Next milestone**:
  - connect to vessel/container-tracking APIs,
  - add row actions (reroute, escalate, hold, release),
  - add pagination, sort, and saved views.

### 3. Access Control

- **Status**: Completed milestone for mock-first governance workflow.
- **Delivered**:
  - role model,
  - route access policies,
  - capability matrix,
  - assignment overview page,
  - role assignment request form,
  - maker-checker approval queue,
  - audit history,
  - configurable role-action policy matrix.
- **Next milestone**:
  - persist governance changes via API,
  - tenant-aware policy mutation integration,
  - approval SLAs and notifications.

### 4. Auctions

- **Status**: Completed milestone for mock-first auction operator workflow.
- **Delivered**:
  - status tabs,
  - simplified corridor/region filters,
  - bid detail panel,
  - operator actions,
  - session activity log.
- **Next milestone**:
  - move to API adapter integration for auction lifecycle actions,
  - add lane drilldown with policy-aware controls,
  - add settlement and award confirmation states,
  - preserve responsive usability while deepening the workflow.

### 5. Slot Management

- **Status**: In progress.
- **Delivered**:
  - baseline page scaffold and capacity summary.
- **Next milestone**:
  - reservation planner,
  - recommendation explanations,
  - slot override actions,
  - API-backed allocation state.

### 6. Reports

- **Status**: In progress.
- **Delivered**:
  - baseline reporting page scaffold.
- **Next milestone**:
  - KPI drilldowns,
  - export actions,
  - executive summary cards,
  - scheduled report workflows.

### 7. News / Operations communications

- **Status**: In progress.
- **Delivered**:
  - baseline operations news page scaffold.
- **Next milestone**:
  - severity-aware bulletins,
  - acknowledgements,
  - incident-linked communications.

## Backend/platform service milestones

### API Gateway

- **Status**: Completed foundational milestone.
- **Next milestone**:
  - stricter production observability and rollout dashboards.

### Authentication

- **Status**: Completed foundational milestone.
- **Next milestone**:
  - admin lifecycle UX integration and token/audit surfacing in frontend.

### Vessel Tracking / Container Tracking

- **Status**: Foundational service milestone implemented.
- **Next milestone**:
  - expose adapter-friendly endpoints that directly feed the frontend Tracking view.

### AI Prediction

- **Status**: Foundational HTTP service milestone implemented.
- **Next milestone**:
  - prediction confidence surfacing in dashboard/tracking UX,
  - historical accuracy views.

### Slot Management

- **Status**: Foundational service milestone implemented.
- **Next milestone**:
  - couple recommendation APIs to the Slot Management page.

### Auction

- **Status**: Foundational service milestone implemented.
- **Next milestone**:
  - connect operator actions and bid workflows to the frontend auction board.

### ULIP Integration / Performance Metrics

- **Status**: Foundational milestone implemented.
- **Next milestone**:
  - operational health cards and exception surfacing in dashboard/tracking.

## Recommended delivery sequence from here

1. Add **real API adapters** page-by-page, starting with Tracking, Access Control, and Auctions, while maintaining responsive layouts.
2. Extend **slot management** into operational planning workflows.
3. Deepen **reports** into decision-ready operational workflows.
4. Evolve communications and dashboard widgets into live operational channels.
