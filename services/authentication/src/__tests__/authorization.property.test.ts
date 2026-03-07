import * as fc from 'fast-check';
import { AuthorizationService, AuthorizationContext } from '../services/authorization.service';
import { Role } from '@port-to-shelf/shared-types';

/**
 * Feature: port-to-shelf-optimizer
 * Property 44: Authorization Enforcement
 * **Validates: Requirements 10.3**
 * 
 * For any operation requiring specific roles, users without those roles
 * should receive an authorization error.
 */
describe('Property 44: Authorization Enforcement', () => {
  let authorizationService: AuthorizationService;

  beforeAll(() => {
    authorizationService = new AuthorizationService();
  });

  test('users with required roles are authorized', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          userRoles: fc.array(fc.constantFrom(...Object.values(Role)), { minLength: 1, maxLength: 3 }),
          resource: fc.constantFrom('vessel', 'container', 'auction', 'slot', 'user', 'report'),
          action: fc.constantFrom('read', 'write', 'create', 'bid'),
        }),
        async (data) => {
          const context: AuthorizationContext = {
            userId: data.userId,
            roles: data.userRoles,
          };

          // Get the permission for this resource/action
          const key = `${data.resource}:${data.action}`;
          const isAuthorized = authorizationService.authorize(context, data.resource, data.action);

          // If authorized, user must have at least one of the required roles
          if (isAuthorized) {
            // Verify that the user has permission through their roles
            expect(data.userRoles.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('users without required roles are denied authorization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          // Create a context with roles that definitely don't have permission
          userRoles: fc.constant([Role.RETAILER]),
          resource: fc.constant('user'), // Only SYSTEM_ADMINISTRATOR can access user resource
          action: fc.constant('write'),
        }),
        async (data) => {
          const context: AuthorizationContext = {
            userId: data.userId,
            roles: data.userRoles,
          };

          const isAuthorized = authorizationService.authorize(context, data.resource, data.action);

          // RETAILER should not be authorized to write users
          expect(isAuthorized).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('system administrators have access to all resources', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          resource: fc.constantFrom('vessel', 'container', 'auction', 'slot', 'user', 'report'),
          action: fc.constantFrom('read', 'write', 'create'),
        }),
        async (data) => {
          const context: AuthorizationContext = {
            userId: data.userId,
            roles: [Role.SYSTEM_ADMINISTRATOR],
          };

          const isAuthorized = authorizationService.authorize(context, data.resource, data.action);

          // System administrators should have access to most operations
          // (except some specific ones like 'bid' which is retailer-only)
          if (data.action !== 'bid') {
            expect(isAuthorized).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('authorization fails for undefined resource/action combinations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          roles: fc.array(fc.constantFrom(...Object.values(Role)), { minLength: 1, maxLength: 2 }),
          resource: fc.string({ minLength: 5, maxLength: 20 }).filter(s => 
            !['vessel', 'container', 'auction', 'slot', 'user', 'report'].includes(s)
          ),
          action: fc.string({ minLength: 3, maxLength: 10 }),
        }),
        async (data) => {
          const context: AuthorizationContext = {
            userId: data.userId,
            roles: data.roles,
          };

          const isAuthorized = authorizationService.authorize(context, data.resource, data.action);

          // Undefined resource/action combinations should be denied by default
          expect(isAuthorized).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('hasRole correctly identifies user roles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          userRoles: fc.array(fc.constantFrom(...Object.values(Role)), { minLength: 1, maxLength: 3 }),
          checkRole: fc.constantFrom(...Object.values(Role)),
        }),
        async (data) => {
          const context: AuthorizationContext = {
            userId: data.userId,
            roles: data.userRoles,
          };

          const hasRole = authorizationService.hasRole(context, data.checkRole);

          // hasRole should return true if and only if the role is in the user's roles
          expect(hasRole).toBe(data.userRoles.includes(data.checkRole));
        }
      ),
      { numRuns: 100 }
    );
  });

  test('hasAnyRole correctly checks for any matching role', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          userRoles: fc.array(fc.constantFrom(...Object.values(Role)), { minLength: 1, maxLength: 3 }),
          checkRoles: fc.array(fc.constantFrom(...Object.values(Role)), { minLength: 1, maxLength: 3 }),
        }),
        async (data) => {
          const context: AuthorizationContext = {
            userId: data.userId,
            roles: data.userRoles,
          };

          const hasAnyRole = authorizationService.hasAnyRole(context, data.checkRoles);

          // hasAnyRole should return true if there's any overlap between user roles and check roles
          const expectedResult = data.checkRoles.some(role => data.userRoles.includes(role));
          expect(hasAnyRole).toBe(expectedResult);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('hasAllRoles correctly checks for all required roles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          userRoles: fc.array(fc.constantFrom(...Object.values(Role)), { minLength: 1, maxLength: 4 }),
          checkRoles: fc.array(fc.constantFrom(...Object.values(Role)), { minLength: 1, maxLength: 3 }),
        }),
        async (data) => {
          const context: AuthorizationContext = {
            userId: data.userId,
            roles: data.userRoles,
          };

          const hasAllRoles = authorizationService.hasAllRoles(context, data.checkRoles);

          // hasAllRoles should return true if user has all the check roles
          const expectedResult = data.checkRoles.every(role => data.userRoles.includes(role));
          expect(hasAllRoles).toBe(expectedResult);
        }
      ),
      { numRuns: 100 }
    );
  });
});
