const db = require('../database/db');

class QueueModel {
  // Add customer to queue
  static async addToQueue(customerData) {
    const { name, email, phone, party_size = 1 } = customerData;
    
    try {
      // Start transaction
      await db.query('START TRANSACTION');
      
      // Insert customer
      const [customerResult] = await db.query(
        'INSERT INTO customers (name, email, phone, party_size) VALUES (?, ?, ?, ?)',
        [name, email, phone, party_size]
      );
      
      const customerId = customerResult.insertId;
      
      // Calculate estimated wait time
      const [avgTimeResult] = await db.query(
        'SELECT setting_value FROM settings WHERE setting_key = ?',
        ['average_service_time']
      );
      const avgServiceTime = parseInt(avgTimeResult[0]?.setting_value || 15);
      
      const [waitingCount] = await db.query(
        'SELECT COUNT(*) as count FROM queue WHERE status = ?',
        ['waiting']
      );
      
      const estimatedWaitTime = (waitingCount[0].count + 1) * avgServiceTime;
      
      // Insert into queue
      const [queueResult] = await db.query(
        `INSERT INTO queue (customer_id, estimated_wait_time, check_in_time) 
         VALUES (?, ?, NOW())`,
        [customerId, estimatedWaitTime]
      );
      
      // Get token number
      const [tokenResult] = await db.query(
        'SELECT token_number FROM queue WHERE id = ?',
        [queueResult.insertId]
      );
      
      await db.query('COMMIT');
      
      return {
        queueId: queueResult.insertId,
        customerId: customerId,
        tokenNumber: tokenResult[0].token_number,
        estimatedWaitTime: estimatedWaitTime
      };
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }
  
  // Get current queue status
  static async getQueueStatus() {
    try {
      const [queue] = await db.query(`
        SELECT 
          q.id,
          q.token_number,
          q.status,
          q.estimated_wait_time,
          q.check_in_time,
          c.name,
          c.phone,
          c.party_size,
          TIMESTAMPDIFF(MINUTE, q.check_in_time, NOW()) as minutes_waited
        FROM queue q
        JOIN customers c ON q.customer_id = c.id
        WHERE q.status IN ('waiting', 'called')
        ORDER BY q.check_in_time ASC
      `);
      
      // Get counts
      const [counts] = await db.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM queue
        GROUP BY status
      `);
      
      const statusCounts = {
        waiting: 0,
        called: 0,
        served: 0,
        cancelled: 0
      };
      
      counts.forEach(row => {
        statusCounts[row.status] = row.count;
      });
      
      return {
        queue,
        counts: statusCounts,
        totalWaiting: statusCounts.waiting + statusCounts.called
      };
      
    } catch (error) {
      throw error;
    }
  }
  
  // Update queue status
  static async updateStatus(queueId, status) {
    try {
      let updateQuery = 'UPDATE queue SET status = ? WHERE id = ?';
      
      // Set appropriate time fields
      if (status === 'called') {
        updateQuery = 'UPDATE queue SET status = ?, called_time = NOW() WHERE id = ?';
      } else if (status === 'served') {
        updateQuery = 'UPDATE queue SET status = ?, served_time = NOW() WHERE id = ?';
      }
      
      const [result] = await db.query(updateQuery, [status, queueId]);
      
      if (result.affectedRows === 0) {
        throw new Error('Queue item not found');
      }
      
      // Get updated data
      const [queueData] = await db.query(`
        SELECT 
          q.*,
          c.name,
          c.phone,
          c.email
        FROM queue q
        JOIN customers c ON q.customer_id = c.id
        WHERE q.id = ?
      `, [queueId]);
      
      return queueData[0];
      
    } catch (error) {
      throw error;
    }
  }
  
  // Get specific customer's queue status
  static async getCustomerQueueStatus(customerId) {
    try {
      const [queue] = await db.query(`
        SELECT 
          q.token_number,
          q.status,
          q.estimated_wait_time,
          q.check_in_time,
          TIMESTAMPDIFF(MINUTE, q.check_in_time, NOW()) as minutes_waited,
          (
            SELECT COUNT(*) 
            FROM queue q2 
            WHERE q2.status = 'waiting' 
            AND q2.check_in_time < q.check_in_time
          ) + 1 as position
        FROM queue q
        WHERE q.customer_id = ? 
        AND q.status IN ('waiting', 'called')
        ORDER BY q.check_in_time DESC
        LIMIT 1
      `, [customerId]);
      
      return queue[0] || null;
      
    } catch (error) {
      throw error;
    }
  }
  
  // Get statistics
  static async getStats() {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_customers_today,
          SUM(CASE WHEN status = 'served' THEN 1 ELSE 0 END) as served_today,
          SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
          AVG(TIMESTAMPDIFF(MINUTE, check_in_time, served_time)) as avg_wait_time
        FROM queue
        WHERE DATE(check_in_time) = CURDATE()
      `);
      
      return stats[0];
      
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
  
  // Get recent activity
  static async getRecentActivity(limit = 10) {
    try {
      const [rows] = await db.query(`
        SELECT 
          q.id,
          q.token_number,
          q.status,
          q.check_in_time,
          q.called_time,
          q.served_time,
          c.name,
          c.email,
          CASE 
            WHEN q.status = 'served' THEN 'served'
            WHEN q.status = 'called' THEN 'called'
            WHEN q.status = 'cancelled' THEN 'cancelled'
            ELSE 'joined'
          END as type,
          TIMESTAMPDIFF(MINUTE, q.check_in_time, NOW()) as minutes_ago
        FROM queue q
        JOIN customers c ON q.customer_id = c.id
        WHERE q.status IN ('served', 'called', 'cancelled')
        ORDER BY q.check_in_time DESC
        LIMIT ?
      `, [limit]);
      
      return rows.map(row => ({
        id: row.id,
        action: `Customer #${row.token_number} (${row.name}) was ${row.status}`,
        time: row.minutes_ago < 1 ? 'Just now' : 
              row.minutes_ago < 60 ? `${row.minutes_ago} min ago` :
              `${Math.floor(row.minutes_ago / 60)} hours ago`,
        type: row.type
      }));
      
    } catch (error) {
      throw error;
    }
  }
}

module.exports = QueueModel;