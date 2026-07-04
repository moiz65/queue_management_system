const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customerController');

// Get all customers
router.get('/', CustomerController.getAllCustomers);

// Get customer by ID
router.get('/:id', CustomerController.getCustomerById);

// Get customer by email
router.get('/email/:email', CustomerController.getCustomerByEmail);

// Create customer
router.post('/', CustomerController.createCustomer);

// Update customer
router.put('/:id', CustomerController.updateCustomer);

// Delete customer
router.delete('/:id', CustomerController.deleteCustomer);

// Get customer queue history
router.get('/:id/history', CustomerController.getCustomerHistory);

// Get customer stats
router.get('/:id/stats', CustomerController.getCustomerStats);

module.exports = router;