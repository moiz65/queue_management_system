const express = require('express');
const router = express.Router();
const QueueController = require('../controllers/queueController');

// Add to queue
router.post('/add', QueueController.addToQueue);

// Get queue status
router.get('/status', QueueController.getQueueStatus);

// Update status
router.put('/:id/status', QueueController.updateStatus);

// Get customer queue status
router.get('/customer/:customerId', QueueController.getCustomerQueueStatus);

// Get statistics
router.get('/stats', QueueController.getStats);

// Get recent activity
router.get('/recent-activity', QueueController.getRecentActivity);

module.exports = router;
