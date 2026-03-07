import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Credentials, AuthToken, TokenValidation, Role, User } from '@port-to-shelf/shared-types';
import { UserRepository } from '../repositories/user.repository';
import { AuthLogRepository } from '../repositories/auth-log.repository';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface AuthContext {
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {
  private userRepository: UserRepository;
  private authLogRepository: AuthLogRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.authLogRepository = new AuthLogRepository();
  }

  /**
   * Authenticate user with credentials
   */
  async authenticate(credentials: Credentials, context?: AuthContext): Promise<AuthToken> {
    const { username, password } = credentials;

    // Find user by username
    const user = await this.userRepository.findByUsername(username);
    
    if (!user) {
      await this.logFailedAttempt(username, 'User not found', context);
      throw new Error('Invalid credentials');
    }

    // Get password hash
    const passwordHash = await this.userRepository.getPasswordHash(user.id);
    
    if (!passwordHash) {
      await this.logFailedAttempt(username, 'Password hash not found', context);
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, passwordHash);
    
    if (!isValid) {
      await this.logFailedAttempt(username, 'Invalid password', context);
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    return this.generateTokens(user);
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<TokenValidation> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        roles: Role[];
        exp: number;
      };

      return {
        valid: true,
        userId: decoded.userId,
        roles: decoded.roles,
        expiresAt: new Date(decoded.exp * 1000),
      };
    } catch (error) {
      return {
        valid: false,
      };
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Create a new user
   */
  async createUser(username: string, password: string, roles: Role[]): Promise<User> {
    const passwordHash = await this.hashPassword(password);
    return this.userRepository.createUser(username, passwordHash, roles);
  }

  /**
   * Generate JWT tokens for user
   */
  private generateTokens(user: User): AuthToken {
    const payload = {
      userId: user.id,
      roles: user.roles,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    // Parse expiration time to seconds
    const expiresIn = this.parseExpirationTime(JWT_EXPIRES_IN);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      userId: user.id,
      roles: user.roles,
    };
  }

  /**
   * Log failed authentication attempt
   */
  private async logFailedAttempt(
    username: string,
    reason: string,
    context?: AuthContext
  ): Promise<void> {
    await this.authLogRepository.logFailedAttempt(
      username,
      reason,
      context?.ipAddress,
      context?.userAgent
    );
  }

  /**
   * Parse expiration time string to seconds
   */
  private parseExpirationTime(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 86400; // Default to 24 hours
    }
  }
}
