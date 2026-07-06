import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiUser, FiMail, FiLock, FiSave, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import './AdminSettings.css';

const API_URL = "https://honeydew-mantis-788783.hostingersite.com/api";
const BACKEND_URL = "https://honeydew-mantis-788783.hostingersite.com";

function AdminSettings({ onClose }) {
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    username: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [settings, setSettings] = useState({
    company_name: '',
    timezone: 'Asia/Karachi',
    notification_email: ''
  });
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { user, settings } = response.data;
      setProfile({
        full_name: user.full_name || '',
        email: user.email || '',
        username: user.username
      });
      setSettings({
        company_name: settings.company_name || '',
        timezone: settings.timezone || 'Asia/Karachi',
        notification_email: settings.notification_email || user.email || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const handleProfileChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleSettingsChange = (e) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveProfile = async () => {
    if (passwordData.newPassword && passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const updateData = {
        full_name: profile.full_name,
        email: profile.email
      };

      if (passwordData.currentPassword && passwordData.newPassword) {
        updateData.currentPassword = passwordData.currentPassword;
        updateData.newPassword = passwordData.newPassword;
      }

      await axios.put(`${API_URL}/auth/profile`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Profile updated successfully');
      
      // Clear password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Update user in localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      userData.full_name = profile.full_name;
      userData.email = profile.email;
      localStorage.setItem('user', JSON.stringify(userData));

    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/auth/settings`, { settings }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className="settings-body">
          {/* Profile Section */}
          <div className="settings-section">
            <h3>Profile Information</h3>
            <div className="settings-grid">
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-group">
                  <FiUser className="input-icon" />
                  <input
                    type="text"
                    name="full_name"
                    value={profile.full_name}
                    onChange={handleProfileChange}
                    placeholder="Enter full name"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <div className="input-group">
                  <FiMail className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleProfileChange}
                    placeholder="Enter email"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Username</label>
                <div className="input-group">
                  <FiUser className="input-icon" />
                  <input
                    type="text"
                    value={profile.username}
                    disabled
                    className="disabled"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Password Section */}
          <div className="settings-section">
            <h3>Change Password</h3>
            <div className="settings-grid">
              <div className="form-group">
                <label>Current Password</label>
                <div className="input-group">
                  <FiLock className="input-icon" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>New Password</label>
                <div className="input-group">
                  <FiLock className="input-icon" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="input-group">
                  <FiLock className="input-icon" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Settings Section */}
          <div className="settings-section">
            <h3>Restaurant Settings</h3>
            <div className="settings-grid">
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  name="company_name"
                  value={settings.company_name}
                  onChange={handleSettingsChange}
                  placeholder="Enter company name"
                />
              </div>
              <div className="form-group">
                <label>Timezone</label>
                <select
                  name="timezone"
                  value={settings.timezone}
                  onChange={handleSettingsChange}
                >
                  <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notification Email</label>
                <div className="input-group">
                  <FiMail className="input-icon" />
                  <input
                    type="email"
                    name="notification_email"
                    value={settings.notification_email}
                    onChange={handleSettingsChange}
                    placeholder="Enter notification email"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-save" 
            onClick={handleSaveProfile}
            disabled={loading}
          >
            <FiSave size={18} /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;