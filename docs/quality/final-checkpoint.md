# Final Checkpoint (Task 35)

This repository supports a final quality checkpoint command:

```bash
npm run checkpoint:final
```

It executes:

1. Unit + integration-compatible Jest suites (`npm run test:unit`)
2. Property suites (`npm run test:property`)
3. Smoke script validation (`bash -n scripts/smoke/smoke-test.sh`)

## Database-backed test suites

Some tests require live PostgreSQL connectivity and are excluded by default to keep CI deterministic in minimal environments.

To include database-backed suites, run with:

```bash
RUN_DB_TESTS=true npm run test:unit
```

This enables:
- `services/authentication/src/__tests__/auth.test.ts`
- `services/authentication/src/__tests__/auth.property.test.ts`
- `services/authentication/src/__tests__/auth-logging.property.test.ts`
- `packages/database/src/__tests__/...`
