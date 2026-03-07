import { AuthService } from '../services/auth.service';
import { Role } from '@port-to-shelf/shared-types';
import { query } from '@port-to-shelf/database';
import jwt from 'jsonwebtoken';

describe('Authentication Service - Edge Cases', () => {
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

  describe('Expired Tokens', () => {
    test('should reject expired access token', async () => {
      // Create a token that expires immediately
      const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
      const expiredToken = jwt.sign(
        {
          userId: 'test-user-id',
          roles: [Role.RETAILER],
        },
        JWT_SECRET,
        { expiresIn: '0s' } // Expires immediately
      );

      // Wait a moment to ensure it's expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const validation = await authService.validateToken(expiredToken);
      expect(validation.valid).toBe(false);
      expect(validation.userId).toBeUndefined();
      expect(validation.roles).toBeUndefined();
    });

    test('should accept valid non-expired token', async () => {
      const user = await authService.createUser(
        'test_valid_token_user',
        'password123',
        [Role.RETAILER]
      );

      const token = await authService.authenticate({
        username: 'test_valid_token_user',
        password: 'password123',
      });

      const validation = await authService.validateToken(token.accessToken);
      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe(user.id);
      expect(validation.roles).toEqual([Role.RETAILER]);

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });

    test('should include expiration time in validation result', async () => {
      const user = await authService.createUser(
        'test_expiration_user',
        'password123',
        [Role.RETAILER]
      );

      const token = await authService.authenticate({
        username: 'test_expiration_user',
        password: 'password123',
      });

      const validation = await authService.validateToken(token.accessToken);
      expect(validation.valid).toBe(true);
      expect(validation.expiresAt).toBeInstanceOf(Date);
      expect(validation.expiresAt!.getTime()).toBeGreaterThan(Date.now());

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });
  });

  describe('Invalid Credentials', () => {
    test('should reject empty username', async () => {
      await expect(
        authService.authenticate({
          username: '',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    test('should reject empty password', async () => {
      const user = await authService.createUser(
        'test_empty_password',
        'password123',
        [Role.RETAILER]
      );

      await expect(
        authService.authenticate({
          username: 'test_empty_password',
          password: '',
        })
      ).rejects.toThrow('Invalid credentials');

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });

    test('should reject username with SQL injection attempt', async () => {
      await expect(
        authService.authenticate({
          username: "admin' OR '1'='1",
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    test('should handle very long username gracefully', async () => {
      const longUsername = 'test_' + 'a'.repeat(300);
      
      await expect(
        authService.authenticate({
          username: longUsername,
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    test('should handle very long password gracefully', async () => {
      const user = await authService.createUser(
        'test_long_password',
        'password123',
        [Role.RETAILER]
      );

      const longPassword = 'a'.repeat(1000);
      
      await expect(
        authService.authenticate({
          username: 'test_long_password',
          password: longPassword,
        })
      ).rejects.toThrow('Invalid credentials');

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });

    test('should handle special characters in password', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const user = await authService.createUser(
        'test_special_chars',
        specialPassword,
        [Role.RETAILER]
      );

      const token = await authService.authenticate({
        username: 'test_special_chars',
        password: specialPassword,
      });

      expect(token).toHaveProperty('accessToken');

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });

    test('should handle unicode characters in password', async () => {
      const unicodePassword = 'пароль密码🔐';
      const user = await authService.createUser(
        'test_unicode',
        unicodePassword,
        [Role.RETAILER]
      );

      const token = await authService.authenticate({
        username: 'test_unicode',
        password: unicodePassword,
      });

      expect(token).toHaveProperty('accessToken');

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });
  });

  describe('Missing Headers / Invalid Tokens', () => {
    test('should reject malformed JWT token', async () => {
      const validation = await authService.validateToken('not-a-valid-jwt-token');
      expect(validation.valid).toBe(false);
    });

    test('should reject token with invalid signature', async () => {
      const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
      const tokenWithWrongSignature = jwt.sign(
        {
          userId: 'test-user-id',
          roles: [Role.RETAILER],
        },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const validation = await authService.validateToken(tokenWithWrongSignature);
      expect(validation.valid).toBe(false);
    });

    test('should reject token with missing userId', async () => {
      const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
      const tokenWithoutUserId = jwt.sign(
        {
          roles: [Role.RETAILER],
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const validation = await authService.validateToken(tokenWithoutUserId);
      expect(validation.valid).toBe(false);
    });

    test('should reject token with missing roles', async () => {
      const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
      const tokenWithoutRoles = jwt.sign(
        {
          userId: 'test-user-id',
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const validation = await authService.validateToken(tokenWithoutRoles);
      expect(validation.valid).toBe(false);
    });

    test('should reject empty token string', async () => {
      const validation = await authService.validateToken('');
      expect(validation.valid).toBe(false);
    });

    test('should reject null-like token values', async () => {
      const validation1 = await authService.validateToken('null');
      expect(validation1.valid).toBe(false);

      const validation2 = await authService.validateToken('undefined');
      expect(validation2.valid).toBe(false);
    });
  });

  describe('Token Generation', () => {
    test('should generate different tokens for same user on multiple authentications', async () => {
      const user = await authService.createUser(
        'test_multiple_tokens',
        'password123',
        [Role.RETAILER]
      );

      const token1 = await authService.authenticate({
        username: 'test_multiple_tokens',
        password: 'password123',
      });

      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));

      const token2 = await authService.authenticate({
        username: 'test_multiple_tokens',
        password: 'password123',
      });

      expect(token1.accessToken).not.toBe(token2.accessToken);
      expect(token1.refreshToken).not.toBe(token2.refreshToken);

      // Both tokens should be valid
      const validation1 = await authService.validateToken(token1.accessToken);
      const validation2 = await authService.validateToken(token2.accessToken);
      expect(validation1.valid).toBe(true);
      expect(validation2.valid).toBe(true);

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });

    test('should include all user roles in token', async () => {
      const allRoles = [
        Role.RETAILER,
        Role.PORT_OPERATOR,
        Role.TRANSPORT_COORDINATOR,
        Role.SYSTEM_ADMINISTRATOR,
      ];

      const user = await authService.createUser(
        'test_all_roles',
        'password123',
        allRoles
      );

      const token = await authService.authenticate({
        username: 'test_all_roles',
        password: 'password123',
      });

      expect(token.roles).toEqual(allRoles);

      const validation = await authService.validateToken(token.accessToken);
      expect(validation.roles).toEqual(allRoles);

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });

    test('should set correct expiration time', async () => {
      const user = await authService.createUser(
        'test_expiration_time',
        'password123',
        [Role.RETAILER]
      );

      const beforeAuth = Date.now();
      const token = await authService.authenticate({
        username: 'test_expiration_time',
        password: 'password123',
      });
      const afterAuth = Date.now();

      // expiresIn should be in seconds (24 hours = 86400 seconds)
      expect(token.expiresIn).toBe(86400);

      const validation = await authService.validateToken(token.accessToken);
      const expirationTime = validation.expiresAt!.getTime();

      // Expiration should be approximately 24 hours from now
      const expectedExpiration = beforeAuth + 86400 * 1000;
      const tolerance = 5000; // 5 seconds tolerance
      expect(expirationTime).toBeGreaterThanOrEqual(expectedExpiration - tolerance);
      expect(expirationTime).toBeLessThanOrEqual(afterAuth + 86400 * 1000 + tolerance);

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });
  });

  describe('Password Hashing', () => {
    test('should hash password before storing', async () => {
      const plainPassword = 'mySecretPassword123';
      const user = await authService.createUser(
        'test_password_hash',
        plainPassword,
        [Role.RETAILER]
      );

      // Get the stored password hash
      const result = await query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
      const storedHash = result.rows[0].password_hash;

      // Hash should not equal plain password
      expect(storedHash).not.toBe(plainPassword);
      
      // Hash should start with bcrypt prefix
      expect(storedHash).toMatch(/^\$2[aby]\$/);

      // Should be able to authenticate with plain password
      const token = await authService.authenticate({
        username: 'test_password_hash',
        password: plainPassword,
      });
      expect(token).toHaveProperty('accessToken');

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });

    test('should generate different hashes for same password', async () => {
      const password = 'samePassword123';
      
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      // Hashes should be different due to different salts
      expect(hash1).not.toBe(hash2);
      
      // Both should be valid bcrypt hashes
      expect(hash1).toMatch(/^\$2[aby]\$/);
      expect(hash2).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('Context Information', () => {
    test('should log IP address when provided', async () => {
      const user = await authService.createUser(
        'test_ip_logging',
        'password123',
        [Role.RETAILER]
      );

      try {
        await authService.authenticate(
          {
            username: 'test_ip_logging',
            password: 'wrongpassword',
          },
          {
            ipAddress: '192.168.1.100',
          }
        );
      } catch (error) {
        // Expected to fail
      }

      const logs = await query(
        'SELECT * FROM auth_logs WHERE username = $1 ORDER BY timestamp DESC LIMIT 1',
        ['test_ip_logging']
      );

      expect(logs.rows.length).toBe(1);
      expect(logs.rows[0].ip_address).toBe('192.168.1.100');

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });

    test('should log user agent when provided', async () => {
      const user = await authService.createUser(
        'test_user_agent_logging',
        'password123',
        [Role.RETAILER]
      );

      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

      try {
        await authService.authenticate(
          {
            username: 'test_user_agent_logging',
            password: 'wrongpassword',
          },
          {
            userAgent,
          }
        );
      } catch (error) {
        // Expected to fail
      }

      const logs = await query(
        'SELECT * FROM auth_logs WHERE username = $1 ORDER BY timestamp DESC LIMIT 1',
        ['test_user_agent_logging']
      );

      expect(logs.rows.length).toBe(1);
      expect(logs.rows[0].user_agent).toBe(userAgent);

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });

    test('should handle missing context information gracefully', async () => {
      const user = await authService.createUser(
        'test_no_context',
        'password123',
        [Role.RETAILER]
      );

      try {
        await authService.authenticate({
          username: 'test_no_context',
          password: 'wrongpassword',
        });
      } catch (error) {
        // Expected to fail
      }

      const logs = await query(
        'SELECT * FROM auth_logs WHERE username = $1 ORDER BY timestamp DESC LIMIT 1',
        ['test_no_context']
      );

      expect(logs.rows.length).toBe(1);
      expect(logs.rows[0].ip_address).toBeNull();
      expect(logs.rows[0].user_agent).toBeNull();

      // Clean up
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });
  });
});
