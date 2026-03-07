# @port-to-shelf/database

Database migrations and connection management for the Port-to-Shelf Optimizer.

## Features

- PostgreSQL connection pooling with automatic reconnection
- Database migrations
- Base repository pattern for CRUD operations
- Transaction support
- Type-safe query execution

## Installation

```bash
npm install @port-to-shelf/database
```

## Configuration

Set the following environment variables:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=port_to_shelf
DB_USER=postgres
DB_PASSWORD=postgres
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

## Usage

### Running Migrations

```bash
# Run migrations
npm run migrate:up

# Check database connection
npx ts-node src/cli.ts check
```

### Using the Connection Pool

```typescript
import { query, getPool, withTransaction } from '@port-to-shelf/database';

// Simple query
const result = await query('SELECT * FROM vessels WHERE id = $1', [vesselId]);

// Transaction
await withTransaction(async (client) => {
  await client.query('INSERT INTO vessels ...');
  await client.query('INSERT INTO estimated_arrivals ...');
});
```

### Creating a Repository

```typescript
import { BaseRepository } from '@port-to-shelf/database';

interface Vessel {
  id: string;
  name: string;
  imo_number: string;
  // ... other fields
}

class VesselRepository extends BaseRepository<Vessel> {
  constructor() {
    super('vessels');
  }

  protected getColumns(): string[] {
    return ['id', 'name', 'imo_number', 'current_latitude', 'current_longitude', 'status'];
  }

  protected mapRow(row: any): Vessel {
    return {
      id: row.id,
      name: row.name,
      imo_number: row.imo_number,
      currentLatitude: row.current_latitude,
      currentLongitude: row.current_longitude,
      status: row.status,
    };
  }

  async findByImoNumber(imoNumber: string): Promise<Vessel | null> {
    return this.findOneBy({ imo_number: imoNumber });
  }
}
```

## Database Schema

The database includes the following tables:

- `vessels` - Vessel tracking information
- `estimated_arrivals` - AI-generated arrival predictions
- `containers` - Container tracking records
- `journey_events` - Container movement history
- `demurrage_info` - Demurrage tracking
- `auctions` - Slot auctions
- `slots` - Transportation slots
- `bids` - Auction bids
- `reservations` - Slot reservations
- `users` - User authentication
- `ulip_events` - ULIP event log

See `migrations/001_initial_schema.sql` for the complete schema definition.
