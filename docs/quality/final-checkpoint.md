# Final Checkpoint (Task 35)

Run the full checkpoint with:

```bash
npm run checkpoint:final
```

## What it verifies

1. **Unit + integration-compatible suites**
   - `npm run test:unit`
2. **Property suites**
   - `npm run test:property`
3. **Full workspace build (strict by default)**
   - `npm run build`
4. **Live smoke checks**
   - Starts a mock auth validator on `localhost:3050`
   - Starts API Gateway on `localhost:3000` with `AUTH_SERVICE_URL`
   - Runs `scripts/smoke/smoke-test.sh` including authenticated checks
5. **Optional DB-backed suites**
   - `RUN_DB_TESTS=true npm run test:unit`

## Environment options

- `RUN_DB_TESTS=true` to include authentication/database-heavy suites.
- `ALLOW_BUILD_FAILURE=true` to continue checkpoint when build fails (local troubleshooting only).

## Notes

- In CI and release validation, keep `ALLOW_BUILD_FAILURE` unset (strict mode).
- If service startup fails, inspect `/tmp/api-gateway-smoke.log` and `/tmp/auth-mock.log`.
