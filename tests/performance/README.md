# Performance Testing (Task 32.1)

This folder contains baseline k6 scenarios for API performance testing:

- `k6/load-test.js`: steady-state load profile
- `k6/stress-test.js`: increasing concurrency until saturation symptoms appear
- `k6/spike-test.js`: sudden burst traffic profile

## Prerequisites

1. Run the API Gateway (or full stack) locally and expose it on a reachable base URL.
2. Install k6 (`https://k6.io/docs/get-started/installation/`).
3. Optionally provide a bearer token for protected endpoints.

## Environment variables

- `BASE_URL` (default: `http://localhost:3000`)
- `AUTH_TOKEN` (optional)

## Commands

```bash
BASE_URL=http://localhost:3000 k6 run tests/performance/k6/load-test.js
BASE_URL=http://localhost:3000 k6 run tests/performance/k6/stress-test.js
BASE_URL=http://localhost:3000 k6 run tests/performance/k6/spike-test.js
```

## Suggested interpretation

- Start with load test and ensure p95 latency remains under the plan target where feasible.
- Run stress test to identify degradation points and bottlenecks.
- Run spike test to validate burst handling and recovery behavior.
