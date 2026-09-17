/**
 * Base Repository Class
 * --------------------
 * Provides common database operations and utilities for all repositories.
 * Follows the Repository pattern to abstract database operations.
 */

import { getDatabase, generateId, getCurrentTimestamp } from './db';

export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Get database connection
   */
  async getDb() {
    return await getDatabase();
  }

  /**
   * Execute a query and return results
   */
  async query(sql, params = []) {
    const db = await getDatabase();
    const result = await db.execute(sql, params);
    return result.rows || [];
  }

  /**
   * Execute a query and return the first result
   */
  async queryFirst(sql, params = []) {
    const results = await this.query(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute a statement
   */
  async execute(sql, params = []) {
    const db = await getDatabase();
    return await db.execute(sql, params);
  }

  /**
   * Execute within a transaction
   */
  async executeTransaction(callback) {
    const db = await getDatabase();
    await db.execute('BEGIN TRANSACTION');
    try {
      const result = await callback();
      await db.execute('COMMIT');
      return result;
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  }

  /**
   * Find record by ID
   */
  async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return this.queryFirst(sql, [id]);
  }

  /**
   * Find all records with optional conditions
   */
  async findAll(whereClause = '', params = []) {
    const sql = `SELECT * FROM ${this.tableName} ${whereClause}`;
    return this.query(sql, params);
  }

  /**
   * Count records with optional conditions
   */
  async count(whereClause = '', params = []) {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
    const result = await this.queryFirst(sql, params);
    return result ? result.count : 0;
  }

  /**
   * Check if record exists
   */
  async exists(id) {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`;
    const result = await this.queryFirst(sql, [id]);
    return !!result;
  }

  /**
   * Delete record by ID
   */
  async deleteById(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.execute(sql, [id]);
    return result.changes > 0;
  }

  /**
   * Delete records with conditions
   */
  async deleteWhere(whereClause, params = []) {
    const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
    const result = await this.execute(sql, params);
    return result.changes;
  }

  /**
   * Generic insert helper
   */
  async insert(data, generateIdField = true) {
    const now = getCurrentTimestamp();
    
    // Add timestamps and ID if needed
    const insertData = {
      ...data,
      created_at: now,
      updated_at: now,
    };

    if (generateIdField && !insertData.id) {
      insertData.id = generateId();
    }

    const columns = Object.keys(insertData);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => insertData[col]);

    const sql = `
      INSERT INTO ${this.tableName} (${columns.join(', ')}) 
      VALUES (${placeholders})
    `;

    await this.execute(sql, values);
    return insertData;
  }

  /**
   * Generic update helper
   */
  async update(id, data) {
    const updateData = {
      ...data,
      updated_at: getCurrentTimestamp(),
    };

    const columns = Object.keys(updateData);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...columns.map(col => updateData[col]), id];

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    const result = await this.execute(sql, values);
    
    if (result.changes === 0) {
      throw new Error(`Record with id ${id} not found`);
    }

    return this.findById(id);
  }

  /**
   * Upsert (insert or update)
   */
  async upsert(data, idField = 'id') {
    const id = data[idField];
    
    if (!id) {
      return this.insert(data);
    }

    const exists = await this.exists(id);
    if (exists) {
      return this.update(id, data);
    } else {
      return this.insert(data, false); // Don't generate new ID
    }
  }

  /**
   * Build WHERE clause from conditions object
   */
  buildWhereClause(conditions) {
    if (!conditions || Object.keys(conditions).length === 0) {
      return { clause: '', params: [] };
    }

    const clauses = [];
    const params = [];

    Object.entries(conditions).forEach(([field, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          // IN clause for arrays
          const placeholders = value.map(() => '?').join(', ');
          clauses.push(`${field} IN (${placeholders})`);
          params.push(...value);
        } else if (typeof value === 'object' && value.operator) {
          // Custom operators like { operator: 'LIKE', value: '%test%' }
          clauses.push(`${field} ${value.operator} ?`);
          params.push(value.value);
        } else {
          // Simple equality
          clauses.push(`${field} = ?`);
          params.push(value);
        }
      }
    });

    const clause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    return { clause, params };
  }

  /**
   * Find records with conditions
   */
  async findWhere(conditions, orderBy = '', limit = '') {
    const { clause, params } = this.buildWhereClause(conditions);
    
    let sql = `SELECT * FROM ${this.tableName} ${clause}`;
    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    if (limit) sql += ` LIMIT ${limit}`;

    return this.query(sql, params);
  }

  /**
   * Find first record with conditions
   */
  async findFirstWhere(conditions, orderBy = '') {
    const records = await this.findWhere(conditions, orderBy, 1);
    return records.length > 0 ? records[0] : null;
  }

  /**
   * Batch insert multiple records
   */
  async batchInsert(records, generateIds = true) {
    if (!records || records.length === 0) return [];

    return this.executeTransaction(async () => {
      const results = [];
      for (const record of records) {
        const inserted = await this.insert(record, generateIds);
        results.push(inserted);
      }
      return results;
    });
  }

  /**
   * Paginated query
   */
  async paginate(conditions = {}, orderBy = 'created_at DESC', page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const { clause, params } = this.buildWhereClause(conditions);

    // Get total count
    const totalSql = `SELECT COUNT(*) as total FROM ${this.tableName} ${clause}`;
    const totalResult = await this.queryFirst(totalSql, params);
    const total = totalResult ? totalResult.total : 0;

    // Get paginated results
    const dataSql = `
      SELECT * FROM ${this.tableName} ${clause} 
      ORDER BY ${orderBy} 
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    const data = await this.query(dataSql, params);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page < Math.ceil(total / pageSize),
        hasPrevPage: page > 1,
      },
    };
  }
}

export default BaseRepository;