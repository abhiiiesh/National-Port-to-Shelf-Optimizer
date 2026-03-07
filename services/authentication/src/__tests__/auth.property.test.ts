import * as fc from 'fast-check';
import { AuthService } from '../services/auth.service';
import { Role } from '@port-to-shelf/shared-types';
import { query } from '@port-to-shelf/database';

/**
 * Feature: port-to-shelf-optimizer
 * Property 43: Authentication Success and Failure
 * **Validates: Requirements 10.1**
 * 
 * For any authentication attempt, valid credentials should return an auth token,
 * and invalid credentials should return an authentication error.
 */
describe('Property 43: Authentication Success and Failure', () => {
  let authService: AuthService;

  beforeAll(async () => {
    authService = new AuthService();
    
    // Clean up test data
    await query('DELETE FROM auth_logs WHERE username LIKE $1', ['test_%']);
    await query('DELETE FROM users WHERE username LIKE $1', ['test_%']);
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM auth_logs WHERE username LIKE $1', ['test_%']);
    await query('DELETE FROM users WHERE username LIKE $1', ['test_%']);
  });

  test('valid credentials return auth token with correct user info', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 5, maxLength: 20 }).map(s => `test_${s}`),
          password: fc.string({ minLength: 8, maxLength: 30 }),
          roles: fc.array(fc.constantFrom(...Object.values(Role)), { minLength: 1, maxLength: 2 }),
        }),
        async (data) => {
          // Create user
          const user = await authService.createUser(data.username, data.password, data.roles);

          // Authenticate with valid credentials
          const token = await authService.authenticate({
            username: data.username,
            password: data.password,
          });

          // Verify token structure
          expect(token).toHaveProperty('accessToken');
          expect(token).toHaveProperty('refreshToken');
          expect(token).toHaveProperty('expiresIn');
          expect(token.userId).toBe(user.id);
          expect(token.roles).toEqual(data.roles);

          // Verify token is valid
          const validation = await authService.validateToken(token.accessToken);
          expect(validation.valid).toBe(true);
          expect(validation.userId).toBe(user.id);
          expect(validation.roles).toEqual(data.roles);

          // Clean up
          await query('DELETE FROM users WHERE id = $1', [user.id]);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('invalid credentials throw authentication error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 5, maxLength: 20 }).map(s => `test_${s}`),
          correctPassword: fc.string({ minLength: 8, maxLength: 30 }),
          wrongPassword: fc.string({ minLength: 8, maxLength: 30 }),
          roles: fc.array(fc.constantFrom(...Object.values(Role)), { minLength: 1, maxLength: 2 }),
        }).filter(data => data.correctPassword !== data.wrongPassword),
        async (data) => {
          // Create user with correct password
          const user = await authService.createUser(
            data.username,
            data.correctPassword,
            data.roles
          );

          // Attempt authentication with wrong password
          await expect(
            authService.authenticate({
              username: data.username,
              password: data.wrongPassword,
            })
          ).rejects.toThrow('Invalid credentials');

          // Clean up
          await query('DELETE FROM users WHERE id = $1', [user.id]);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('authentication with non-existent user throws error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 5, maxLength: 20 }).map(s => `test_nonexistent_${s}`),
          password: fc.string({ minLength: 8, maxLength: 30 }),
        }),
        async (data) => {
          // Ensure user doesn't exist
          await query('DELETE FROM users WHERE username = $1', [data.username]);

          // Attempt authentication
          await expect(
            authService.authenticate({
              username: data.username,
              password: data.password,
            })
          ).rejects.toThrow('Invalid credentials');
        }
      ),
      { numRuns: 20 }
    );
  });
});
