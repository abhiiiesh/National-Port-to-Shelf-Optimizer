#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Running non-DB unit/integration suite"
npm run test:unit

echo "[2/4] Running property suite"
npm run test:property

echo "[3/4] Running smoke script syntax check"
bash -n scripts/smoke/smoke-test.sh

echo "[4/4] Note: Set RUN_DB_TESTS=true to include database/auth integration suites"
