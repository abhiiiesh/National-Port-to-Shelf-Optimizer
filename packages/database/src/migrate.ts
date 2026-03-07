import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool, closePool as closePoolConnection } from './pool';

export { closePoolConnection as closePool };

/**
 * Run database migrations
 */
export const runMigrations = async (): Promise<void> => {
  const pool = getPool();
  
  try {
    console.log('Running database migrations...');
    
    // Read the migration file
    const migrationPath = join(__dirname, '../migrations/001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
};

/**
 * Check if database is ready
 */
export const checkDatabaseConnection = async (): Promise<boolean> => {
  const pool = getPool();
  
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};
