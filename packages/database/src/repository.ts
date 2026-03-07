import { PoolClient, QueryResult } from 'pg';
import { query, getClient, withTransaction } from './pool';

/**
 * Base repository interface for CRUD operations
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

/**
 * Base repository class with common CRUD operations
 */
export abstract class BaseRepository<T> implements IRepository<T> {
  constructor(protected tableName: string) {}

  /**
   * Get the column names for this table
   */
  protected abstract getColumns(): string[];

  /**
   * Map a database row to the entity type
   */
  protected abstract mapRow(row: any): T;

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    const result = await query<any>(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find all entities
   */
  async findAll(): Promise<T[]> {
    const result = await query<any>(`SELECT * FROM ${this.tableName}`);
    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Find entities by condition
   */
  async findBy(condition: Record<string, any>): Promise<T[]> {
    const keys = Object.keys(condition);
    const values = Object.values(condition);
    const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');

    const result = await query<any>(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
      values
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Find one entity by condition
   */
  async findOneBy(condition: Record<string, any>): Promise<T | null> {
    const results = await this.findBy(condition);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create a new entity
   */
  async create(data: Partial<T>): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const result = await query<any>(
      `INSERT INTO ${this.tableName} (${columns.join(', ')}) 
       VALUES (${placeholders}) 
       RETURNING *`,
      values
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Update an entity by ID
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');

    const result = await query<any>(
      `UPDATE ${this.tableName} 
       SET ${setClause} 
       WHERE id = $1 
       RETURNING *`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Delete an entity by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Execute a custom query
   */
  protected async executeQuery<R = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<R>> {
    return query<R>(text, params);
  }

  /**
   * Execute within a transaction
   */
  protected async executeInTransaction<R>(
    callback: (client: PoolClient) => Promise<R>
  ): Promise<R> {
    return withTransaction(callback);
  }
}

/**
 * Repository factory for creating repository instances
 */
export class RepositoryFactory {
  private static repositories: Map<string, any> = new Map();

  static register<T>(name: string, repository: IRepository<T>): void {
    this.repositories.set(name, repository);
  }

  static get<T>(name: string): IRepository<T> {
    const repository = this.repositories.get(name);
    if (!repository) {
      throw new Error(`Repository ${name} not found`);
    }
    return repository;
  }
}
