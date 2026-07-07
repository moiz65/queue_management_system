const db = require('../database/db');
const QueueModel = require('../models/queueModel');

class QueueController {
  // Add to queue - Complete flow
  static async addToQueue(req, res) {
    try {
      const { name, email, phone, party_size = 1, customerId } = req.body;
      
      console.log('📝 Add to queue request:', { name, email, phone, party_size, customerId });
      
      let finalCustomerId = customerId;
      let isNewCustomer = false;
      
      // Step 1: If customerId not provided, check by phone
      if (!finalCustomerId) {
        // Check if customer exists by phone
        const [existing] = await db.query(
          'SELECT id, name, email, phone FROM customers WHERE phone = ?',
          [phone]
        );
        
        if (existing.length > 0) {
          // Existing customer
          finalCustomerId = existing[0].id;
          console.log('✅ Existing customer found:', finalCustomerId);
        } else {
          // New customer - create
          console.log('🆕 Creating new customer...');
          const [result] = await db.query(
            'INSERT INTO customers (name, email, phone, party_size) VALUES (?, ?, ?, ?)',
            [name, email, phone, party_size]
          );
          finalCustomerId = result.insertId;
          isNewCustomer = true;
          console.log('✅ New customer created:', finalCustomerId);
        }
      }
      
      // Step 2: Add to queue
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
      
      const [queueResult] = await db.query(
        `INSERT INTO queue (customer_id, estimated_wait_time, check_in_time) 
         VALUES (?, ?, NOW())`,
        [finalCustomerId, estimatedWaitTime]
      );
      
      // Get token number and position
      const [tokenResult] = await db.query(
        'SELECT token_number FROM queue WHERE id = ?',
        [queueResult.insertId]
      );
      
      const [positionResult] = await db.query(
        `SELECT COUNT(*) + 1 as position 
         FROM queue 
         WHERE status = 'waiting' 
         AND check_in_time <= (SELECT check_in_time FROM queue WHERE id = ?)`,
        [queueResult.insertId]
      );
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        const queueStatus = await QueueModel.getQueueStatus();
        io.emit('queueUpdated', queueStatus);
      }
      
      const message = isNewCustomer ? 
        `Added to queue with token #${tokenResult[0].token_number}` :
        `Added to queue with token #${tokenResult[0].token_number}`;
      
      res.status(201).json({
        success: true,
        data: {
          queueId: queueResult.insertId,
          customerId: finalCustomerId,
          tokenNumber: tokenResult[0].token_number,
          estimatedWaitTime: estimatedWaitTime,
          position: positionResult[0]?.position || 1,
          isNewCustomer: isNewCustomer
        },
        message: message
      });
      
    } catch (error) {
      console.error('Error adding to queue:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get queue status
  static async getQueueStatus(req, res) {
    try {
      const status = await QueueModel.getQueueStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting queue status:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update queue status
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['waiting', 'called', 'served', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      const updated = await QueueModel.updateStatus(id, status);
      
      const io = req.app.get('io');
      if (io) {
        const queueStatus = await QueueModel.getQueueStatus();
        io.emit('queueUpdated', queueStatus);
        
        if (status === 'called') {
          io.emit('customerCalled', { 
            customerId: updated.customer_id,
            tokenNumber: updated.token_number,
            name: updated.name,
            message: 'Now it\'s your turn!'
          });
        }
      }
      
      res.json({
        success: true,
        data: updated,
        message: `Status updated to ${status}`
      });
      
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get customer queue status
  static async getCustomerQueueStatus(req, res) {
    try {
      const { customerId } = req.params;
      const status = await QueueModel.getCustomerQueueStatus(customerId);
      
      if (!status) {
        return res.json({
          inQueue: false,
          message: 'You are not in the queue'
        });
      }
      
      res.json({
        inQueue: true,
        ...status
      });
      
    } catch (error) {
      console.error('Error getting customer status:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get statistics
  static async getStats(req, res) {
    try {
      const stats = await QueueModel.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get recent activity
  static async getRecentActivity(req, res) {
    try {
      const activity = await QueueModel.getRecentActivity();
      res.json(activity);
    } catch (error) {
      console.error('Error getting recent activity:', error);
      res.json([]);
    }
  }
}

module.exports = QueueController;