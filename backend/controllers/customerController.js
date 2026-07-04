const CustomerModel = require('../models/customerModel');

class CustomerController {
  // Get all customers
  static async getAllCustomers(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const customers = await CustomerModel.getAllCustomers(limit);
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get customer by ID
  static async getCustomerById(req, res) {
    try {
      const { id } = req.params;
      const customer = await CustomerModel.getCustomerById(id);
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json(customer);
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get customer by email
  static async getCustomerByEmail(req, res) {
    try {
      const { email } = req.params;
      const customer = await CustomerModel.getCustomerByEmail(email);
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json(customer);
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Create customer
  static async createCustomer(req, res) {
    try {
      const { name, email, phone, party_size } = req.body;
      
      if (!name || !email || !phone) {
        return res.status(400).json({ error: 'Name, email, and phone are required' });
      }
      
      // Check if customer already exists
      const existing = await CustomerModel.getCustomerByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Customer with this email already exists' });
      }
      
      const customer = await CustomerModel.createCustomer(req.body);
      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully'
      });
      
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update customer
  static async updateCustomer(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, party_size } = req.body;
      
      if (!name || !email || !phone) {
        return res.status(400).json({ error: 'Name, email, and phone are required' });
      }
      
      const updated = await CustomerModel.updateCustomer(id, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json({
        success: true,
        message: 'Customer updated successfully'
      });
      
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Delete customer
  static async deleteCustomer(req, res) {
    try {
      const { id } = req.params;
      const deleted = await CustomerModel.deleteCustomer(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get customer queue history
  static async getCustomerHistory(req, res) {
    try {
      const { id } = req.params;
      const customer = await CustomerModel.getCustomerById(id);
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      const history = await CustomerModel.getCustomerQueueHistory(id);
      res.json({
        customer,
        history
      });
      
    } catch (error) {
      console.error('Error fetching customer history:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get customer stats
  static async getCustomerStats(req, res) {
    try {
      const { id } = req.params;
      const customer = await CustomerModel.getCustomerById(id);
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      const stats = await CustomerModel.getCustomerStats(id);
      res.json({
        customer,
        stats
      });
      
    } catch (error) {
      console.error('Error fetching customer stats:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = CustomerController;