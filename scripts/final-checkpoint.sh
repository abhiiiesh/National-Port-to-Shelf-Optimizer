#!/usr/bin/env bash
set -euo pipefail

ALLOW_BUILD_FAILURE="${ALLOW_BUILD_FAILURE:-false}"

cleanup() {
  for pid_var in GATEWAY_PID AUTH_MOCK_PID; do
    pid="${!pid_var:-}"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" || true
      wait "${pid}" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT

echo "[1/6] Running unit + integration-compatible suite"
npm run test:unit

echo "[2/6] Running property suite"
npm run test:property

echo "[3/6] Running full workspace build"
if ! npm run build; then
  if [[ "${ALLOW_BUILD_FAILURE}" == "true" ]]; then
    echo "Build failed but ALLOW_BUILD_FAILURE=true, continuing" >&2
  else
    echo "Build failed and strict mode is enabled; aborting checkpoint" >&2
    exit 1
  fi
fi

echo "[4/6] Starting mock auth service and API Gateway for live smoke checks"
node -e "const http=require('http');http.createServer((req,res)=>{if(req.url==='/auth/validate'&&req.method==='POST'){let body='';req.on('data',c=>body+=c);req.on('end',()=>{const auth=req.headers.authorization||'';const ok=auth==='Bearer smoke-valid-token';res.statusCode=ok?200:401;res.setHeader('content-type','application/json');res.end(JSON.stringify(ok?{valid:true,userId:'smoke',roles:['PORT_OPERATOR']}:{valid:false}));});return;}res.statusCode=404;res.end();}).listen(3050);" >/tmp/auth-mock.log 2>&1 &
AUTH_MOCK_PID=$!

AUTH_SERVICE_URL=http://localhost:3050 PORT=3000 npx ts-node services/api-gateway/src/index.ts >/tmp/api-gateway-smoke.log 2>&1 &
GATEWAY_PID=$!

for _ in {1..30}; do
  if curl -sSf "http://localhost:3000/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -sSf "http://localhost:3000/health" >/dev/null 2>&1; then
  echo "API Gateway did not start for smoke tests. Log output:"
  tail -n 50 /tmp/api-gateway-smoke.log || true
  exit 1
fi

echo "[5/6] Running live smoke tests"
SMOKE_BASE_URL=http://localhost:3000 SMOKE_AUTH_TOKEN=smoke-valid-token bash scripts/smoke/smoke-test.sh

echo "[6/6] Optional DB-backed suites"
if [[ "${RUN_DB_TESTS:-false}" == "true" ]]; then
  echo "RUN_DB_TESTS=true -> executing DB-backed test suites"
  RUN_DB_TESTS=true npm run test:unit
else
  echo "Skipping DB-backed suites (set RUN_DB_TESTS=true to enable)"
fi
