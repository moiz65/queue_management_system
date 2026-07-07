const CustomerModel = require("../models/customerModel");
const db = require("../database/db");

class CustomerController {
  // Get all customers
  static async getAllCustomers(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;

      const [rows] = await db.query(
        `
        SELECT 
          c.*,
          COALESCE((SELECT COUNT(*) FROM queue WHERE customer_id = c.id), 0) as total_visits
        FROM customers c 
        ORDER BY c.created_at DESC 
        LIMIT ?
      `,
        [limit],
      );

      res.json(rows);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get customer by ID
  static async getCustomerById(req, res) {
    try {
      const { id } = req.params;
      const customer = await CustomerModel.getCustomerById(id);

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get customer by email
  static async getCustomerByEmail(req, res) {
    try {
      const { email } = req.params;
      const customer = await CustomerModel.getCustomerByEmail(email);

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Create customer
  static async createCustomer(req, res) {
    try {
      const { name, email, phone, party_size } = req.body;

      if (!name || !email || !phone) {
        return res
          .status(400)
          .json({ error: "Name, email, and phone are required" });
      }

      // Check if customer already exists
      const existing = await CustomerModel.getCustomerByEmail(email);
      if (existing) {
        return res
          .status(409)
          .json({ error: "Customer with this email already exists" });
      }

      const customer = await CustomerModel.createCustomer(req.body);
      res.status(201).json({
        success: true,
        data: customer,
        message: "Customer created successfully",
      });
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update customer
  static async updateCustomer(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, party_size } = req.body;

      if (!name || !email || !phone) {
        return res
          .status(400)
          .json({ error: "Name, email, and phone are required" });
      }

      const updated = await CustomerModel.updateCustomer(id, req.body);

      if (!updated) {
        return res.status(404).json({ error: "Customer not found" });
      }

      res.json({
        success: true,
        message: "Customer updated successfully",
      });
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Delete customer
  static async deleteCustomer(req, res) {
    try {
      const { id } = req.params;
      const deleted = await CustomerModel.deleteCustomer(id);

      if (!deleted) {
        return res.status(404).json({ error: "Customer not found" });
      }

      res.json({
        success: true,
        message: "Customer deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get customer queue history
  static async getCustomerHistory(req, res) {
    try {
      const { id } = req.params;
      const customer = await CustomerModel.getCustomerById(id);

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const history = await CustomerModel.getCustomerQueueHistory(id);
      res.json({
        customer,
        history,
      });
    } catch (error) {
      console.error("Error fetching customer history:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get customer stats
  static async getCustomerStats(req, res) {
    try {
      const { id } = req.params;
      const customer = await CustomerModel.getCustomerById(id);

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const stats = await CustomerModel.getCustomerStats(id);
      res.json({
        customer,
        stats,
      });
    } catch (error) {
      console.error("Error fetching customer stats:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ CHECK CUSTOMER BY PHONE OR EMAIL
  static async checkCustomer(req, res) {
    try {
      const { phone, email } = req.query;

      console.log("🔍 Checking customer with:", { phone, email });

      if (!phone && !email) {
        return res.status(400).json({
          error: "Phone or email is required",
        });
      }

      let query =
        "SELECT id, name, email, phone, party_size, created_at FROM customers WHERE ";
      let params = [];

      if (phone) {
        query += "phone = ?";
        params.push(phone);
      } else if (email) {
        query += "email = ?";
        params.push(email);
      }

      const [rows] = await db.query(query, params);

      console.log("📊 Query result:", rows);

      if (rows.length > 0) {
        res.json({
          exists: true,
          customerId: rows[0].id,
          customer: rows[0],
        });
      } else {
        res.json({
          exists: false,
          customerId: null,
          customer: null,
        });
      }
    } catch (error) {
      console.error("❌ Error checking customer:", error);
      res.status(500).json({
        error: "Failed to check customer",
        details: error.message,
      });
    }
  }

  // Get customer with full history
  static async getCustomerWithHistory(req, res) {
    try {
      const { id } = req.params;

      console.log("🔍 Fetching history for customer:", id);

      // Get customer details
      const [customer] = await db.query(
        "SELECT * FROM customers WHERE id = ?",
        [id],
      );

      if (customer.length === 0) {
        return res.status(404).json({ error: "Customer not found" });
      }

      // Get total visits
      const [visits] = await db.query(
        "SELECT COUNT(*) as total_visits FROM queue WHERE customer_id = ?",
        [id],
      );

      // Get last 30 days history with all details
      const [history] = await db.query(
        `
        SELECT 
          q.id,
          q.token_number, 
          q.status, 
          q.check_in_time, 
          q.called_time, 
          q.served_time,
          q.estimated_wait_time,
          TIMESTAMPDIFF(MINUTE, q.check_in_time, COALESCE(q.served_time, NOW())) as wait_duration
        FROM queue q
        WHERE q.customer_id = ? 
        AND q.check_in_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY q.check_in_time DESC
      `,
        [id],
      );

      console.log("📊 History found:", history.length);

      res.json({
        ...customer[0],
        total_visits: visits[0].total_visits || 0,
        recent_visits: history || [],
      });
    } catch (error) {
      console.error("Error getting customer history:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = CustomerController;
