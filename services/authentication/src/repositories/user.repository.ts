import { BaseRepository } from '@port-to-shelf/database';
import { User, Role } from '@port-to-shelf/shared-types';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  protected getColumns(): string[] {
    return ['id', 'username', 'password_hash', 'roles', 'created_at', 'updated_at'];
  }

  protected mapRow(row: any): User {
    return {
      id: row.id,
      username: row.username,
      roles: row.roles as Role[],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findOneBy({ username });
  }

  async createUser(username: string, passwordHash: string, roles: Role[]): Promise<User> {
    return this.create({
      username,
      password_hash: passwordHash,
      roles,
    } as any);
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    const result = await this.executeQuery(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0].password_hash : null;
  }
}
