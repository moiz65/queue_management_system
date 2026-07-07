const db = require("../database/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

class AuthController {
  // Login
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Username and password are required" });
      }

      // Get user from database
      const [users] = await db.query(
        "SELECT * FROM admin_users WHERE username = ? AND is_active = TRUE",
        [username],
      );

      if (users.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const user = users[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(
        password,
        user.password_hash,
      );
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Update last login
      await db.query("UPDATE admin_users SET last_login = NOW() WHERE id = ?", [
        user.id,
      ]);

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: "24h" },
      );

      // Store session
      await db.query(
        "INSERT INTO admin_sessions (admin_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))",
        [user.id, token],
      );

      // Return user info (without password)
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      };

      res.json({
        success: true,
        token,
        user: userData,
        message: "Login successful",
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  }

  // Logout
  static async logout(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1];

      if (token) {
        // Delete session
        await db.query("DELETE FROM admin_sessions WHERE token = ?", [token]);
      }

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const [users] = await db.query(
        "SELECT id, username, email, full_name, role, last_login, created_at FROM admin_users WHERE id = ?",
        [userId],
      );

      if (users.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user settings
      const [settings] = await db.query(
        "SELECT setting_key, setting_value FROM admin_settings WHERE admin_id = ?",
        [userId],
      );

      const settingsObj = {};
      settings.forEach((s) => {
        settingsObj[s.setting_key] = s.setting_value;
      });

      res.json({
        user: users[0],
        settings: settingsObj,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: "Failed to get profile" });
    }
  }

  // Update profile
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { full_name, email, currentPassword, newPassword } = req.body;

      // Start transaction
      await db.query("START TRANSACTION");

      // Update basic info
      if (full_name || email) {
        const updates = [];
        const values = [];

        if (full_name) {
          updates.push("full_name = ?");
          values.push(full_name);
        }
        if (email) {
          updates.push("email = ?");
          values.push(email);
        }

        values.push(userId);
        await db.query(
          `UPDATE admin_users SET ${updates.join(", ")} WHERE id = ?`,
          values,
        );
      }

      // Update password if provided
      if (currentPassword && newPassword) {
        const [users] = await db.query(
          "SELECT password_hash FROM admin_users WHERE id = ?",
          [userId],
        );

        if (users.length === 0) {
          await db.query("ROLLBACK");
          return res.status(404).json({ error: "User not found" });
        }

        const isValidPassword = await bcrypt.compare(
          currentPassword,
          users[0].password_hash,
        );
        if (!isValidPassword) {
          await db.query("ROLLBACK");
          return res
            .status(401)
            .json({ error: "Current password is incorrect" });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await db.query(
          "UPDATE admin_users SET password_hash = ? WHERE id = ?",
          [newPasswordHash, userId],
        );
      }

      await db.query("COMMIT");

      res.json({
        success: true,
        message: "Profile updated successfully",
      });
    } catch (error) {
      await db.query("ROLLBACK");
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  }

  // Update settings - Make sure this method exists
  static async updateSettings(req, res) {
    try {
      const userId = req.user.id;
      const { settings } = req.body;

      console.log("📝 Updating settings for user:", userId);
      console.log("📝 Settings data:", settings);

      if (!settings || typeof settings !== "object") {
        return res.status(400).json({ error: "Invalid settings data" });
      }

      // Start transaction
      await db.query("START TRANSACTION");

      for (const [key, value] of Object.entries(settings)) {
        console.log(`📝 Updating ${key}: ${value}`);

        await db.query(
          `INSERT INTO admin_settings (admin_id, setting_key, setting_value) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
          [userId, key, value, value],
        );
      }

      await db.query("COMMIT");

      // Fetch updated settings
      const [updatedSettings] = await db.query(
        "SELECT setting_key, setting_value FROM admin_settings WHERE admin_id = ?",
        [userId],
      );

      const settingsObj = {};
      updatedSettings.forEach((s) => {
        settingsObj[s.setting_key] = s.setting_value;
      });

      console.log("✅ Settings updated successfully:", settingsObj);

      res.json({
        success: true,
        settings: settingsObj,
        message: "Settings updated successfully",
      });
    } catch (error) {
      await db.query("ROLLBACK");
      console.error("❌ Update settings error:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  }

  // Get all admins (for super admin)
  static async getAllAdmins(req, res) {
    try {
      // Check if user is super admin
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const [admins] = await db.query(
        "SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM admin_users",
      );

      res.json(admins);
    } catch (error) {
      console.error("Get admins error:", error);
      res.status(500).json({ error: "Failed to get admins" });
    }
  }

  // Create new admin (for super admin)
  static async createAdmin(req, res) {
    try {
      const { username, password, email, full_name, role } = req.body;

      // Check if user is super admin
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Username and password are required" });
      }

      // Check if username exists
      const [existing] = await db.query(
        "SELECT id FROM admin_users WHERE username = ?",
        [username],
      );

      if (existing.length > 0) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const [result] = await db.query(
        `INSERT INTO admin_users (username, password_hash, email, full_name, role) 
         VALUES (?, ?, ?, ?, ?)`,
        [username, passwordHash, email, full_name, role || "admin"],
      );

      res.status(201).json({
        success: true,
        message: "Admin created successfully",
        adminId: result.insertId,
      });
    } catch (error) {
      console.error("Create admin error:", error);
      res.status(500).json({ error: "Failed to create admin" });
    }
  }
  // Add this method to AuthController
  static async getSettings(req, res) {
    try {
      const userId = req.user.id;

      const [settings] = await db.query(
        "SELECT setting_key, setting_value FROM admin_settings WHERE admin_id = ?",
        [userId],
      );

      const settingsObj = {};
      settings.forEach((s) => {
        settingsObj[s.setting_key] = s.setting_value;
      });

      res.json({
        success: true,
        settings: settingsObj,
      });
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  }
}

module.exports = AuthController;
