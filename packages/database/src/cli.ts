#!/usr/bin/env node

import { runMigrations, checkDatabaseConnection, closePool } from './migrate';

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'migrate':
        console.log('Running migrations...');
        await runMigrations();
        break;
      
      case 'check':
        console.log('Checking database connection...');
        const isConnected = await checkDatabaseConnection();
        if (isConnected) {
          console.log('✓ Database is ready');
        } else {
          console.error('✗ Database connection failed');
          process.exit(1);
        }
        break;
      
      default:
        console.log('Usage: database-cli <command>');
        console.log('Commands:');
        console.log('  migrate  - Run database migrations');
        console.log('  check    - Check database connection');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
