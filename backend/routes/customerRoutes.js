const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customerController');

// Check if customer exists by phone or email
router.get('/check', CustomerController.checkCustomer);

// Get all customers
router.get('/', CustomerController.getAllCustomers);

// Get customer with history (MUST come before /:id)
router.get('/:id/history', CustomerController.getCustomerWithHistory);

// Get customer by ID
router.get('/:id', CustomerController.getCustomerById);

// Create customer
router.post('/', CustomerController.createCustomer);

// Update customer
router.put('/:id', CustomerController.updateCustomer);

// Delete customer
router.delete('/:id', CustomerController.deleteCustomer);

module.exports = router;