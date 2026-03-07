import * as fc from 'fast-check';
import { AuthService } from '../services/auth.service';
import { AuthLogRepository } from '../repositories/auth-log.repository';
import { Role } from '@port-to-shelf/shared-types';
import { query } from '@port-to-shelf/database';

/**
 * Feature: port-to-shelf-optimizer
 * Property 46: Failed Authentication Logging
 * **Validates: Requirements 10.5**
 * 
 * For any failed authentication attempt, the system should log the attempt
 * with username, timestamp, and failure reason.
 */
describe('Property 46: Failed Authentication Logging', () => {
  let authService: AuthService;
  let authLogRepository: AuthLogRepository;

  beforeAll(async () => {
    authService = new AuthService();
    authLogRepository = new AuthLogRepository();
    
    // Clean up test data
    await query('DELETE FROM auth_logs WHERE username LIKE $1', ['test_%']);
    await query('DELETE FROM users WHERE username LIKE $1', ['test_%']);
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM auth_logs WHERE username LIKE $1', ['test_%']);
    await query('DELETE FROM users WHERE username LIKE $1', ['test_%']);
  });

  afterEach(async () => {
    // Clean up after each test
    await query('DELETE FROM auth_logs WHERE username LIKE $1', ['test_%']);
  });

  test('failed authentication with wrong password logs the attempt', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 5, maxLength: 20 }).map(s => `test_${s}`),
          correctPassword: fc.string({ minLength: 8, maxLength: 30 }),
          wrongPassword: fc.string({ minLength: 8, maxLength: 30 }),
          roles: fc.array(fc.constantFrom(...Object.values(Role)), { minLength: 1, maxLength: 2 }),
          ipAddress: fc.option(fc.ipV4(), { nil: undefined }),
          userAgent: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
        }).filter(data => data.correctPassword !== data.wrongPassword),
        async (data) => {
          // Create user with correct password
          const user = await authService.createUser(
            data.username,
            data.correctPassword,
            data.roles
          );

          // Get initial log count
          const logsBefore = await authLogRepository.getRecentFailedAttempts(data.username, 60);
          const initialCount = logsBefore.length;

          // Attempt authentication with wrong password
          try {
            await authService.authenticate(
              {
                username: data.username,
                password: data.wrongPassword,
              },
              {
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
              }
            );
            // Should not reach here
            expect(true).toBe(false);
          } catch (error: any) {
            expect(error.message).toBe('Invalid credentials');
          }

          // Verify log was created
          const logsAfter = await authLogRepository.getRecentFailedAttempts(data.username, 60);
          expect(logsAfter.length).toBe(initialCount + 1);

          // Verify log contains required fields
          const latestLog = logsAfter[0];
          expect(latestLog.username).toBe(data.username);
          expect(latestLog.reason).toBe('Invalid password');
          expect(latestLog.timestamp).toBeInstanceOf(Date);
          
          if (data.ipAddress) {
            expect(latestLog.ipAddress).toBe(data.ipAddress);
          }
          if (data.userAgent) {
            expect(latestLog.userAgent).toBe(data.userAgent);
          }

          // Clean up
          await query('DELETE FROM users WHERE id = $1', [user.id]);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('failed authentication with non-existent user logs the attempt', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 5, maxLength: 20 }).map(s => `test_nonexistent_${s}`),
          password: fc.string({ minLength: 8, maxLength: 30 }),
          ipAddress: fc.option(fc.ipV4(), { nil: undefined }),
          userAgent: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
        }),
        async (data) => {
          // Ensure user doesn't exist
          await query('DELETE FROM users WHERE username = $1', [data.username]);

          // Get initial log count
          const logsBefore = await authLogRepository.getRecentFailedAttempts(data.username, 60);
          const initialCount = logsBefore.length;

          // Attempt authentication
          try {
            await authService.authenticate(
              {
                username: data.username,
                password: data.password,
              },
              {
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
              }
            );
            // Should not reach here
            expect(true).toBe(false);
          } catch (error: any) {
            expect(error.message).toBe('Invalid credentials');
          }

          // Verify log was created
          const logsAfter = await authLogRepository.getRecentFailedAttempts(data.username, 60);
          expect(logsAfter.length).toBe(initialCount + 1);

          // Verify log contains required fields
          const latestLog = logsAfter[0];
          expect(latestLog.username).toBe(data.username);
          expect(latestLog.reason).toBe('User not found');
          expect(latestLog.timestamp).toBeInstanceOf(Date);
          
          if (data.ipAddress) {
            expect(latestLog.ipAddress).toBe(data.ipAddress);
          }
          if (data.userAgent) {
            expect(latestLog.userAgent).toBe(data.userAgent);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('multiple failed attempts are all logged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 5, maxLength: 20 }).map(s => `test_${s}`),
          correctPassword: fc.string({ minLength: 8, maxLength: 30 }),
          wrongPasswords: fc.array(fc.string({ minLength: 8, maxLength: 30 }), { minLength: 2, maxLength: 5 }),
          roles: fc.array(fc.constantFrom(...Object.values(Role)), { minLength: 1, maxLength: 2 }),
        }).filter(data => data.wrongPasswords.every(wp => wp !== data.correctPassword)),
        async (data) => {
          // Create user
          const user = await authService.createUser(
            data.username,
            data.correctPassword,
            data.roles
          );

          // Get initial log count
          const logsBefore = await authLogRepository.getRecentFailedAttempts(data.username, 60);
          const initialCount = logsBefore.length;

          // Attempt authentication multiple times with wrong passwords
          for (const wrongPassword of data.wrongPasswords) {
            try {
              await authService.authenticate({
                username: data.username,
                password: wrongPassword,
              });
            } catch (error) {
              // Expected to fail
            }
          }

          // Verify all attempts were logged
          const logsAfter = await authLogRepository.getRecentFailedAttempts(data.username, 60);
          expect(logsAfter.length).toBe(initialCount + data.wrongPasswords.length);

          // Verify all logs have required fields
          for (let i = 0; i < data.wrongPasswords.length; i++) {
            const log = logsAfter[i];
            expect(log.username).toBe(data.username);
            expect(log.reason).toBe('Invalid password');
            expect(log.timestamp).toBeInstanceOf(Date);
          }

          // Clean up
          await query('DELETE FROM users WHERE id = $1', [user.id]);
        }
      ),
      { numRuns: 10 }
    );
  });

  test('successful authentication does not create a log entry', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 5, maxLength: 20 }).map(s => `test_${s}`),
          password: fc.string({ minLength: 8, maxLength: 30 }),
          roles: fc.array(fc.constantFrom(...Object.values(Role)), { minLength: 1, maxLength: 2 }),
        }),
        async (data) => {
          // Create user
          const user = await authService.createUser(
            data.username,
            data.password,
            data.roles
          );

          // Get initial log count
          const logsBefore = await authLogRepository.getRecentFailedAttempts(data.username, 60);
          const initialCount = logsBefore.length;

          // Successful authentication
          const token = await authService.authenticate({
            username: data.username,
            password: data.password,
          });

          expect(token).toHaveProperty('accessToken');

          // Verify no new log was created
          const logsAfter = await authLogRepository.getRecentFailedAttempts(data.username, 60);
          expect(logsAfter.length).toBe(initialCount);

          // Clean up
          await query('DELETE FROM users WHERE id = $1', [user.id]);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('log timestamps are in chronological order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 5, maxLength: 20 }).map(s => `test_${s}`),
          password: fc.string({ minLength: 8, maxLength: 30 }),
          attemptCount: fc.integer({ min: 3, max: 5 }),
        }),
        async (data) => {
          // Ensure user doesn't exist
          await query('DELETE FROM users WHERE username = $1', [data.username]);

          // Make multiple failed attempts
          for (let i = 0; i < data.attemptCount; i++) {
            try {
              await authService.authenticate({
                username: data.username,
                password: data.password,
              });
            } catch (error) {
              // Expected to fail
            }
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Get logs
          const logs = await authLogRepository.getRecentFailedAttempts(data.username, 60);
          expect(logs.length).toBeGreaterThanOrEqual(data.attemptCount);

          // Verify timestamps are in descending order (most recent first)
          for (let i = 0; i < logs.length - 1; i++) {
            expect(logs[i].timestamp.getTime()).toBeGreaterThanOrEqual(
              logs[i + 1].timestamp.getTime()
            );
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
