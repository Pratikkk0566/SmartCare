/**
 * Base Repository Class
 * --------------------
 * Base class for all repositories with common database operations
 * All specific repositories (Patient, Investigation, etc.) extend this class
 */

import { database } from '../Database';

export default class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = database;
  }

  /**
   * Get database instance
   */
  getDatabase() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Execute a SELECT query and return all results
   */
  async selectAll(sql, params = []) {
    try {
      const db = this.getDatabase();
      return await db.getAllAsync(sql, params);
    } catch (error) {
      console.error(`[BaseRepository] Select all failed for ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Execute a SELECT query and return first result
   */
  async selectOne(sql, params = []) {
    try {
      const db = this.getDatabase();
      return await db.getFirstAsync(sql, params);
    } catch (error) {
      console.error(`[BaseRepository] Select one failed for ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Execute an INSERT, UPDATE, or DELETE query
   */
  async execute(sql, params = []) {
    try {
      const db = this.getDatabase();
      return await db.runAsync(sql, params);
    } catch (error) {
      console.error(`[BaseRepository] Execute failed for ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Execute multiple SQL statements in a transaction
   */
  async transaction(statements) {
    const db = this.getDatabase();
    
    try {
      await db.execAsync('BEGIN TRANSACTION;');
      
      for (const { sql, params = [] } of statements) {
        await db.runAsync(sql, params);
      }
      
      await db.execAsync('COMMIT;');
      return { success: true };
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      console.error(`[BaseRepository] Transaction failed for ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Count records in table
   */
  async count(whereClause = '', params = []) {
    const sql = whereClause 
      ? `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${whereClause}`
      : `SELECT COUNT(*) as count FROM ${this.tableName}`;
    
    const result = await this.selectOne(sql, params);
    return result?.count || 0;
  }

  /**
   * Check if record exists
   */
  async exists(whereClause, params = []) {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`;
    const result = await this.selectOne(sql, params);
    return !!result;
  }

  /**
   * Delete records
   */
  async delete(whereClause, params = []) {
    const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
    return await this.execute(sql, params);
  }

  /**
   * Get all records from table
   */
  async getAll(whereClause = '', params = [], orderBy = '') {
    let sql = `SELECT * FROM ${this.tableName}`;
    
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    
    return await this.selectAll(sql, params);
  }

  /**
   * Get single record by ID
   */
  async getById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`;
    return await this.selectOne(sql, [id]);
  }

  /**
   * Insert new record
   */
  async insert(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    return await this.execute(sql, values);
  }

  /**
   * Update existing record
   */
  async update(data, whereClause, params = []) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`;
    return await this.execute(sql, [...values, ...params]);
  }

  /**
   * Upsert (Insert or Update) record
   */
  async upsert(data, conflictColumns = ['id']) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const updateSet = keys
      .filter(key => !conflictColumns.includes(key))
      .map(key => `${key} = excluded.${key}`)
      .join(', ');
    
    const sql = `
      INSERT INTO ${this.tableName} (${keys.join(', ')}) 
      VALUES (${placeholders})
      ON CONFLICT(${conflictColumns.join(', ')}) 
      DO UPDATE SET ${updateSet}
    `;
    
    return await this.execute(sql, values);
  }
}