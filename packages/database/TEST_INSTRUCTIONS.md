# Database Package Test Instructions

## Prerequisites

1. **Docker and Docker Compose** must be installed
2. **PostgreSQL** must be running on port 5432

## Running Tests

### 1. Start the Database

From the project root directory:

```bash
docker compose up -d postgres
```

Wait for PostgreSQL to be ready (about 10-15 seconds).

### 2. Run the Property Tests

From the database package directory:

```bash
cd packages/database
npm test
```

Or from the project root:

```bash
npm test --workspace=@port-to-shelf/database
```

### 3. Run with Coverage

```bash
npm run test:coverage
```

## Test Details

### Property 42: Data Integrity Constraints

This property test validates that the database enforces all integrity constraints:

- **Foreign Key Constraints**: Ensures referential integrity between tables
- **Unique Constraints**: Prevents duplicate IMO numbers, usernames, and event IDs
- **Check Constraints**: Validates enum values, positive numbers, and ranges
- **Data Type Constraints**: Ensures proper data types for timestamps and JSON

The test runs 100+ iterations with randomly generated data to verify constraints hold across all inputs.

## Troubleshooting

### Database Connection Failed

If you see "Failed to connect to database":

1. Check if PostgreSQL is running: `docker ps`
2. Check if port 5432 is available: `netstat -an | grep 5432`
3. Restart the database: `docker compose restart postgres`

### Migration Errors

If migrations fail:

1. Stop the database: `docker compose down`
2. Remove the volume: `docker volume rm port-to-shelf-optimizer_postgres_data`
3. Start fresh: `docker compose up -d postgres`

### Test Timeouts

If tests timeout:

1. Increase the timeout in `jest.config.js`
2. Check database performance
3. Reduce the number of test iterations (change `numRuns` in test files)

## Environment Variables

You can customize the database connection:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=port_to_shelf
export DB_USER=postgres
export DB_PASSWORD=postgres
```

## CI/CD Integration

For CI/CD pipelines, ensure PostgreSQL is available as a service:

```yaml
# Example GitHub Actions
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: port_to_shelf
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```
