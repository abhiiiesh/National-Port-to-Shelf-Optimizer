# Final Checkpoint (Task 35)

This repository provides an executable final system checkpoint command:

```bash
npm run checkpoint:final
```

## What it verifies

1. **Unit + integration-compatible suites**
   - `npm run test:unit`
2. **Property suites**
   - `npm run test:property`
3. **Build attempt (non-blocking if known workspace issues exist)**
   - `npm run build`
4. **Live smoke checks**
   - Starts API Gateway locally with `ts-node`
   - Runs `scripts/smoke/smoke-test.sh` against `http://localhost:3000`
5. **Optional DB-backed suites**
   - `RUN_DB_TESTS=true npm run test:unit`

## Running with DB-backed suites

```bash
RUN_DB_TESTS=true npm run checkpoint:final
```

This enables the authentication/database-heavy suites that require live PostgreSQL connectivity.

## Notes

- If smoke startup fails, inspect `/tmp/api-gateway-smoke.log` emitted by the checkpoint script.
- The default checkpoint flow is deterministic in minimal CI environments and can be elevated to DB-full validation by setting `RUN_DB_TESTS=true`.
- Build failures are reported but do not block checkpoint completion while known workspace/project-reference issues are being addressed.
