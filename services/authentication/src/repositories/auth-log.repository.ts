import { BaseRepository } from '@port-to-shelf/database';

export interface AuthLog {
  id: string;
  username: string;
  timestamp: Date;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuthLogRepository extends BaseRepository<AuthLog> {
  constructor() {
    super('auth_logs');
  }

  protected getColumns(): string[] {
    return ['id', 'username', 'timestamp', 'reason', 'ip_address', 'user_agent'];
  }

  protected mapRow(row: any): AuthLog {
    return {
      id: row.id,
      username: row.username,
      timestamp: row.timestamp,
      reason: row.reason,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
    };
  }

  async logFailedAttempt(
    username: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthLog> {
    return this.create({
      username,
      reason,
      ip_address: ipAddress,
      user_agent: userAgent,
    } as any);
  }

  async getRecentFailedAttempts(username: string, minutes: number = 15): Promise<AuthLog[]> {
    const result = await this.executeQuery(
      `SELECT * FROM auth_logs 
       WHERE username = $1 
       AND timestamp > NOW() - INTERVAL '${minutes} minutes'
       ORDER BY timestamp DESC`,
      [username]
    );
    return result.rows.map((row) => this.mapRow(row));
  }
}
