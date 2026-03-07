import { getPool, closePool, runMigrations } from '../index';

// Setup before all tests
beforeAll(async () => {
  // Check if database is available
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  
  console.log(`Connecting to database at ${dbHost}:${dbPort}...`);
  
  // Wait for database to be ready
  const pool = getPool();
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection successful');
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error('Failed to connect to database. Make sure PostgreSQL is running.');
        console.error('Run: docker compose up -d postgres');
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Run migrations
  console.log('Running database migrations...');
  await runMigrations();
  console.log('Migrations completed');
});

// Cleanup after all tests
afterAll(async () => {
  await closePool();
});

// Clean up tables before each test
beforeEach(async () => {
  const pool = getPool();
  
  // Disable foreign key checks temporarily
  await pool.query('SET session_replication_role = replica;');
  
  // Truncate all tables
  const tables = [
    'ulip_events',
    'reservations',
    'bids',
    'slots',
    'auctions',
    'demurrage_info',
    'journey_events',
    'containers',
    'estimated_arrivals',
    'vessels',
    'users',
  ];
  
  for (const table of tables) {
    await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
  }
  
  // Re-enable foreign key checks
  await pool.query('SET session_replication_role = DEFAULT;');
});
