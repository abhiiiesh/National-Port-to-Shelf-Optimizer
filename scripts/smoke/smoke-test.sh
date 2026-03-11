#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-http://localhost:3000}"
TOKEN="${SMOKE_AUTH_TOKEN:-}"
CURL_TIMEOUT_SECONDS="${SMOKE_CURL_TIMEOUT_SECONDS:-15}"
CURL_OPTS=(--connect-timeout 5 --max-time "${CURL_TIMEOUT_SECONDS}")

if [[ -z "${SMOKE_BASE_URL:-}" && "${GITHUB_ACTIONS:-false}" == "true" ]]; then
  echo "SMOKE_BASE_URL is empty in CI. Refusing localhost fallback."
  echo "Set STAGING_BASE_URL repository variable or ensure deploy job resolves external endpoint."
  exit 1
fi

echo "Running smoke tests against ${BASE_URL}"

health_code=$(curl "${CURL_OPTS[@]}" -s -o /tmp/health.json -w "%{http_code}" "${BASE_URL}/health")
if [[ "${health_code}" != "200" ]]; then
  echo "Health check failed with status ${health_code}"
  [[ -f /tmp/health.json ]] && cat /tmp/health.json || true
  exit 1
fi

echo "Health endpoint passed"

# Auth-protected route should reject missing token with 401
vessel_code=$(curl "${CURL_OPTS[@]}" -s -o /tmp/vessels.json -w "%{http_code}" "${BASE_URL}/api/v1/vessels")
if [[ "${vessel_code}" != "401" ]]; then
  echo "Expected 401 on protected endpoint, got ${vessel_code}"
  exit 1
fi

echo "Protected endpoint unauth check passed"

if [[ "${SMOKE_EXPECT_FRONTEND:-false}" == "true" ]]; then
  ui_code=$(curl "${CURL_OPTS[@]}" -s -o /tmp/frontend.html -w "%{http_code}" "${BASE_URL}/")
  if [[ "${ui_code}" != "200" ]]; then
    echo "Frontend root check failed with status ${ui_code}"
    exit 1
  fi
  echo "Frontend root check passed"
fi

if [[ -n "${TOKEN}" ]]; then
  echo "Running authenticated smoke checks"

  auth_vessel_code=$(curl "${CURL_OPTS[@]}" -s -o /tmp/vessels-auth.json -w "%{http_code}" \
    -H "Authorization: Bearer ${TOKEN}" \
    "${BASE_URL}/api/v1/vessels")

  # Downstream service may be unavailable in smoke env; success criteria is auth not rejected
  if [[ "${auth_vessel_code}" == "401" ]]; then
    echo "Authenticated vessel call unexpectedly unauthorized"
    exit 1
  fi

  auth_metrics_code=$(curl "${CURL_OPTS[@]}" -s -o /tmp/metrics-auth.json -w "%{http_code}" \
    -H "Authorization: Bearer ${TOKEN}" \
    "${BASE_URL}/api/v1/metrics/performance")

  if [[ "${auth_metrics_code}" == "401" ]]; then
    echo "Authenticated metrics call unexpectedly unauthorized"
    exit 1
  fi

  echo "Authenticated smoke checks passed"
else
  echo "SMOKE_AUTH_TOKEN not provided; skipping authenticated smoke checks"
fi
