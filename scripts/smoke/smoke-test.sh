#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-http://localhost:3000}"

echo "Running smoke tests against ${BASE_URL}"

health_code=$(curl -s -o /tmp/health.json -w "%{http_code}" "${BASE_URL}/health")
if [[ "${health_code}" != "200" ]]; then
  echo "Health check failed with status ${health_code}"
  exit 1
fi

echo "Health endpoint passed"

# Auth-protected route should reject missing token with 401
vessel_code=$(curl -s -o /tmp/vessels.json -w "%{http_code}" "${BASE_URL}/api/v1/vessels")
if [[ "${vessel_code}" != "401" ]]; then
  echo "Expected 401 on protected endpoint, got ${vessel_code}"
  exit 1
fi

echo "Protected endpoint auth check passed"
