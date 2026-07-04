const db = require('../database/db');

class CustomerModel {
  // Create new customer
  static async createCustomer(customerData) {
    const { name, email, phone, party_size = 1 } = customerData;
    
    try {
      const [result] = await db.query(
        'INSERT INTO customers (name, email, phone, party_size) VALUES (?, ?, ?, ?)',
        [name, email, phone, party_size]
      );
      
      return {
        id: result.insertId,
        name,
        email,
        phone,
        party_size
      };
    } catch (error) {
      throw error;
    }
  }

  // Get customer by ID
  static async getCustomerById(id) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM customers WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Get customer by email
  static async getCustomerByEmail(email) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM customers WHERE email = ?',
        [email]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Get all customers
  static async getAllCustomers(limit = 100) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM customers ORDER BY created_at DESC LIMIT ?',
        [limit]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Update customer
  static async updateCustomer(id, customerData) {
    const { name, email, phone, party_size } = customerData;
    
    try {
      const [result] = await db.query(
        'UPDATE customers SET name = ?, email = ?, phone = ?, party_size = ? WHERE id = ?',
        [name, email, phone, party_size, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Delete customer
  static async deleteCustomer(id) {
    try {
      const [result] = await db.query(
        'DELETE FROM customers WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get customer's queue history
  static async getCustomerQueueHistory(id) {
    try {
      const [rows] = await db.query(`
        SELECT 
          q.token_number,
          q.status,
          q.check_in_time,
          q.called_time,
          q.served_time,
          q.estimated_wait_time,
          TIMESTAMPDIFF(MINUTE, q.check_in_time, q.served_time) as actual_wait_time
        FROM queue q
        WHERE q.customer_id = ?
        ORDER BY q.check_in_time DESC
      `, [id]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get customer statistics
  static async getCustomerStats(id) {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_visits,
          SUM(CASE WHEN status = 'served' THEN 1 ELSE 0 END) as total_served,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as total_cancelled,
          AVG(TIMESTAMPDIFF(MINUTE, check_in_time, served_time)) as avg_wait_time
        FROM queue
        WHERE customer_id = ?
      `, [id]);
      
      return stats[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CustomerModel;