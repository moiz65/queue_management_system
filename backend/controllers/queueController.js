const QueueModel = require('../models/queueModel');

class QueueController {
  // Add to queue
  static async addToQueue(req, res) {
    try {
      const { name, email, phone, party_size } = req.body;
      
      if (!name || !email || !phone) {
        return res.status(400).json({ error: 'Name, email, and phone are required' });
      }
      
      const result = await QueueModel.addToQueue(req.body);
      
      // Emit socket event for real-time update
      const io = req.app.get('io');
      if (io) {
        const queueStatus = await QueueModel.getQueueStatus();
        io.emit('queueUpdated', queueStatus);
      }
      
      res.status(201).json({
        success: true,
        data: result,
        message: `Added to queue with token #${result.tokenNumber}`
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
      
      // Validate status
      if (!['waiting', 'called', 'served', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      // Update status in database
      const updated = await QueueModel.updateStatus(id, status);
      
      // Emit socket events for real-time updates
      const io = req.app.get('io');
      if (io) {
        // Get updated queue status
        const queueStatus = await QueueModel.getQueueStatus();
        
        // Broadcast queue update to all connected clients
        io.emit('queueUpdated', queueStatus);
        
        // Notify specific customer when called
        if (status === 'called') {
          io.emit('customerCalled', { 
            customerId: updated.customer_id,
            tokenNumber: updated.token_number,
            name: updated.name,
            message: 'Now it\'s your turn! Please proceed to the counter.'
          });
          console.log(`🔔 Customer ${updated.customer_id} (${updated.name}) has been called!`);
        }
        
        // Notify when served
        if (status === 'served') {
          io.emit('customerServed', { 
            customerId: updated.customer_id,
            tokenNumber: updated.token_number,
            name: updated.name,
            message: 'Thank you for visiting!'
          });
          console.log(`✅ Customer ${updated.customer_id} (${updated.name}) has been served!`);
        }
        
        // Notify when cancelled
        if (status === 'cancelled') {
          io.emit('customerCancelled', { 
            customerId: updated.customer_id,
            tokenNumber: updated.token_number,
            name: updated.name,
            message: 'Queue cancelled.'
          });
          console.log(`❌ Customer ${updated.customer_id} (${updated.name}) cancelled.`);
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
      // Return empty array if error
      res.json([]);
    }
  }
}

module.exports = QueueController;