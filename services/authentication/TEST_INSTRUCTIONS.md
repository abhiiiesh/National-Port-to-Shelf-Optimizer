# Authentication Service - Test Instructions

## Prerequisites

Before running the tests, ensure the following:

1. **Database is running**: The PostgreSQL database must be running via Docker Compose
   ```bash
   docker-compose up -d postgres
   ```

2. **Dependencies are installed**: Install all workspace dependencies from the root directory
   ```bash
   npm install
   ```

3. **Database migrations are applied**: Ensure all migrations have been run
   - Migration `001_initial_schema.sql` creates the users table
   - Migration `002_auth_logs.sql` creates the auth_logs table

## Running Tests

### From Root Directory

Run all authentication tests:
```bash
npm run test:property -- services/authentication
```

Run specific test files:
```bash
# Property test for authentication
npm run test:property -- services/authentication/src/__tests__/auth.property.test.ts

# Property test for authorization
npm run test:property -- services/authentication/src/__tests__/authorization.property.test.ts

# Property test for authentication logging
npm run test:property -- services/authentication/src/__tests__/auth-logging.property.test.ts

# Unit tests for edge cases
npm test -- services/authentication/src/__tests__/auth.test.ts
```

### Test Coverage

The authentication service includes the following test suites:

1. **auth.property.test.ts** - Property 43: Authentication Success and Failure
   - Tests valid credentials return auth tokens
   - Tests invalid credentials throw errors
   - Tests non-existent users are rejected
   - Validates Requirements 10.1

2. **authorization.property.test.ts** - Property 44: Authorization Enforcement
   - Tests role-based access control
   - Tests users without required roles are denied
   - Tests system administrators have broad access
   - Tests undefined resource/action combinations are denied
   - Validates Requirements 10.3

3. **auth-logging.property.test.ts** - Property 46: Failed Authentication Logging
   - Tests failed attempts are logged with username, timestamp, and reason
   - Tests multiple failed attempts are all logged
   - Tests successful authentication doesn't create logs
   - Tests log timestamps are chronological
   - Validates Requirements 10.5

4. **auth.test.ts** - Unit tests for edge cases
   - Expired tokens
   - Invalid credentials (empty, SQL injection, very long, special characters)
   - Missing headers / invalid tokens
   - Token generation
   - Password hashing
   - Context information (IP address, user agent)

## Test Configuration

Tests use the following configuration:

- **Testing Framework**: Jest with ts-jest
- **Property Testing**: fast-check (100 runs per property by default)
- **Database**: PostgreSQL (via Docker Compose)
- **Test Timeout**: 10 seconds (configured in jest.setup.js)

## Troubleshooting

### PowerShell Execution Policy Issues

If you encounter "running scripts is disabled" errors on Windows:

1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Confirm the change

Alternatively, use the full node path:
```bash
node ./node_modules/jest/bin/jest.js services/authentication/src/__tests__/auth.property.test.ts --runInBand
```

### Database Connection Issues

If tests fail with database connection errors:

1. Verify PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify the database exists:
   ```bash
   docker-compose exec postgres psql -U postgres -l
   ```

### Missing Dependencies

If you see "Cannot find module" errors:

1. Install dependencies from root:
   ```bash
   npm install
   ```

2. Verify workspace links:
   ```bash
   npm ls @port-to-shelf/shared-types
   npm ls @port-to-shelf/database
   ```

## Test Data Cleanup

All tests clean up their test data:
- Before all tests run
- After all tests complete
- After each individual test (for logging tests)

Test data uses the `test_` prefix for usernames to avoid conflicts with production data.

## Environment Variables

The authentication service uses the following environment variables:

- `JWT_SECRET`: Secret key for JWT token signing (defaults to 'dev-secret-change-in-production')
- `DATABASE_URL`: PostgreSQL connection string (configured in docker-compose.yml)

For production, ensure `JWT_SECRET` is set to a secure random value.
