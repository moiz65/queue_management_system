import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { 
  FiUsers, 
  FiCheckCircle, 
  FiClock, 
  FiUser, 
  FiLogOut,
  FiSearch,
  FiFilter,
  FiPhone,
  FiMail,
  FiCalendar,
  FiUserCheck,
  FiUserX,
  FiBell,
  FiRefreshCw,
  FiDownload,
  FiEye,
  FiUserPlus,
  FiList,
  FiGrid,
  FiActivity,
  FiPieChart,
  FiArrowRight,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertCircle,
  FiMoreVertical,
  FiStar,
  FiAward,
  FiBarChart2,
  FiSettings,
  FiHome,
  FiMonitor,
  FiClock as FiClockIcon,
  FiUsers as FiUsersIcon
} from "react-icons/fi";
import { FaUsers, FaCrown, FaRegClock } from "react-icons/fa";
import AdminSettings from "./AdminSettings";
import "./AdminPanel.css";

require('dotenv').config();

const API_URL = process.env.APP_API_URL || "http://localhost:5000/api";
const socket = io(process.env.APP_BACKEND_URL || "http://localhost:5000");

function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("queue");
  const [queueData, setQueueData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isAdminLoggedIn");
    if (!isLoggedIn || isLoggedIn !== "true") {
      navigate("/admin");
      return;
    }

    fetchQueueData();
    fetchStats();
    fetchCustomers();
    fetchRecentActivity();

    socket.on("queueUpdated", () => {
      fetchQueueData();
      fetchStats();
      fetchRecentActivity();
    });

    return () => {
      socket.off("queueUpdated");
    };
  }, []);

  const fetchQueueData = async () => {
    try {
      const response = await axios.get(`${API_URL}/queue/status`);
      setQueueData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching queue:", error);
      toast.error("Error fetching queue data");
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/queue/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API_URL}/customers`);
      setCustomers(response.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Error fetching customers data");
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await axios.get(`${API_URL}/queue/recent-activity`);
      setRecentActivity(response.data || []);
    } catch (error) {
      const activities = [
        { id: 1, action: "Customer #12 was served", time: "2 min ago", type: "served" },
        { id: 2, action: "Customer #11 was called", time: "5 min ago", type: "called" },
        { id: 3, action: "Customer #10 joined queue", time: "8 min ago", type: "joined" },
      ];
      setRecentActivity(activities);
    }
  };

  const handleStatusUpdate = async (queueId, newStatus) => {
    try {
      const response = await axios.put(`${API_URL}/queue/${queueId}/status`, {
        status: newStatus,
      });

      if (response.data.success) {
        const statusMessages = {
          called: "Customer called! They have been notified.",
          served: "Customer served successfully!",
          cancelled: "Customer cancelled.",
        };
        toast.success(statusMessages[newStatus] || `Status updated to ${newStatus}`);
        fetchQueueData();
        fetchStats();
        fetchRecentActivity();
        fetchCustomers();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Error updating status");
      console.error("Error:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAdminLoggedIn");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminSession");
    socket.disconnect();
    toast.success("Logged out successfully!");
    window.location.href = "/admin";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "waiting": return "⏳";
      case "called": return "🔔";
      case "served": return "✅";
      case "cancelled": return "❌";
      default: return "📌";
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "served": return "✅";
      case "called": return "🔔";
      case "joined": return "➕";
      case "cancelled": return "❌";
      default: return "📌";
    }
  };

  const COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444"];

  const filteredQueue = queueData?.queue?.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.token_number.toString().includes(searchTerm);
    const matchesStatus = filterStatus === "all" || customer.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredCustomers = customers.filter((customer) => {
    return (
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.phone.includes(customerSearch)
    );
  });

  const getStatusCount = (status) => {
    return queueData?.queue?.filter((c) => c.status === status).length || 0;
  };

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
  };

  const goToDisplay = () => {
    window.open('/display', '_blank');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🍽️</span>
            <span className="logo-text">QueuePro</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === "queue" ? "active" : ""}`}
            onClick={() => setActiveTab("queue")}
          >
            <FiList className="nav-icon" />
            <span>Queue</span>
            <span className="nav-badge">{getStatusCount('waiting')}</span>
          </button>
          <button 
            className={`nav-item ${activeTab === "customers" ? "active" : ""}`}
            onClick={() => setActiveTab("customers")}
          >
            <FiUsers className="nav-icon" />
            <span>Customers</span>
            <span className="nav-badge">{customers.length}</span>
          </button>
          <button 
            className={`nav-item ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <FiBarChart2 className="nav-icon" />
            <span>Analytics</span>
          </button>
          <button 
            className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <FiSettings className="nav-icon" />
            <span>Settings</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item logout" onClick={handleLogout}>
            <FiLogOut className="nav-icon" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <h1>Good Morning 👋</h1>
            <p className="header-subtitle">Here's what's happening with your restaurant today</p>
          </div>
          <div className="header-right">
            <span className="live-badge">
              <span className="live-dot"></span> Live
            </span>
            <div className="header-actions">
              <button className="icon-btn display-btn" onClick={goToDisplay}>
                <FiMonitor size={20} />
                <span className="btn-label">Display</span>
              </button>
              <button className="icon-btn">
                <FiBell size={20} />
                <span className="notification-dot"></span>
              </button>
              <div className="user-profile">
                <div className="avatar">A</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div 
            className="stat-card premium"
            onMouseEnter={() => setHoveredCard('total')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="stat-card-header">
              <div className="stat-icon-wrapper blue">
                <FiUsers size={24} />
              </div>
              <span className="stat-trend positive">
                <FiTrendingUp size={14} /> 12%
              </span>
            </div>
            <div className="stat-content">
              <h4>Total Today</h4>
              <p className="stat-number">{stats?.total_customers_today || 0}</p>
              <span className="stat-change">Today's visitors</span>
            </div>
            <div className="stat-progress">
              <div className="progress-bar" style={{ width: '75%' }}></div>
            </div>
          </div>

          <div 
            className="stat-card premium"
            onMouseEnter={() => setHoveredCard('served')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="stat-card-header">
              <div className="stat-icon-wrapper green">
                <FiCheckCircle size={24} />
              </div>
              <span className="stat-trend positive">
                <FiTrendingUp size={14} /> 8%
              </span>
            </div>
            <div className="stat-content">
              <h4>Served Today</h4>
              <p className="stat-number">{stats?.served_today || 0}</p>
              <span className="stat-change">Completed orders</span>
            </div>
            <div className="stat-progress">
              <div className="progress-bar" style={{ width: '60%' }}></div>
            </div>
          </div>

          <div 
            className="stat-card premium"
            onMouseEnter={() => setHoveredCard('waiting')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="stat-card-header">
              <div className="stat-icon-wrapper orange">
                <FaRegClock size={24} />
              </div>
              <span className="stat-trend negative">
                <FiTrendingDown size={14} /> -3%
              </span>
            </div>
            <div className="stat-content">
              <h4>Currently Waiting</h4>
              <p className="stat-number">{queueData?.totalWaiting || 0}</p>
              <span className="stat-change">In queue</span>
            </div>
            <div className="stat-progress">
              <div className="progress-bar" style={{ width: '30%' }}></div>
            </div>
          </div>

          <div 
            className="stat-card premium"
            onMouseEnter={() => setHoveredCard('customers')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="stat-card-header">
              <div className="stat-icon-wrapper purple">
                <FaCrown size={24} />
              </div>
              <span className="stat-trend positive">
                <FiTrendingUp size={14} /> 25%
              </span>
            </div>
            <div className="stat-content">
              <h4>Total Customers</h4>
              <p className="stat-number">{customers.length}</p>
              <span className="stat-change">Registered users</span>
            </div>
            <div className="stat-progress">
              <div className="progress-bar" style={{ width: '90%' }}></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === "queue" ? "active" : ""}`}
            onClick={() => setActiveTab("queue")}
          >
            <FiList size={18} /> Queue
            <span className="tab-badge">{getStatusCount('waiting')}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "customers" ? "active" : ""}`}
            onClick={() => setActiveTab("customers")}
          >
            <FiUsers size={18} /> Customers
            <span className="tab-badge secondary">{customers.length}</span>
          </button>
          {/* <button
            className="tab-btn display-tab-btn"
            onClick={goToDisplay}
          >
            <FiMonitor size={18} /> Display View
            <span className="tab-badge display-badge">📺</span>
          </button> */}
        </div>

        {/* Content Area */}
        <div className="content-area">
          {activeTab === "settings" ? (
            <AdminSettings onClose={() => setActiveTab("queue")} />
          ) : (
            <>
              {/* Queue Tab */}
              {activeTab === "queue" && (
                <div className="queue-section">
                  <div className="queue-controls-bar">
                    <div className="search-wrapper">
                      <FiSearch size={18} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search by name or token..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                      />
                    </div>
                    <div className="filter-wrapper">
                      <FiFilter size={18} className="filter-icon" />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="filter-select"
                      >
                        <option value="all">All Status</option>
                        <option value="waiting">Waiting</option>
                        <option value="called">Called</option>
                        <option value="served">Served</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    {/* <button className="btn-display-small" onClick={goToDisplay}>
                      <FiMonitor size={16} /> Display
                    </button> */}
                  </div>

                  <div className="table-container">
                    <table className="queue-table">
                      <thead>
                        <tr>
                          <th>Token</th>
                          <th>Customer</th>
                          <th>Party</th>
                          <th>Status</th>
                          <th>Wait Time</th>
                          <th className="actions-header">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredQueue?.length > 0 ? (
                          filteredQueue.map((customer) => (
                            <tr key={customer.id} className="table-row">
                              <td className="token-cell">
                                <span className="token-badge">#{customer.token_number}</span>
                              </td>
                              <td>
                                <div className="customer-cell">
                                  <div className="customer-avatar">
                                    {customer.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="customer-details">
                                    <span className="customer-name">{customer.name}</span>
                                    <span className="customer-phone">
                                      <FiPhone size={12} /> {customer.phone || "N/A"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="party-badge">
                                  <FaUsers size={12} /> {customer.party_size}
                                </span>
                              </td>
                              <td>
                                <span className={`status-badge ${customer.status}`}>
                                  {getStatusIcon(customer.status)}
                                  {customer.status === "called" ? " Now's your turn!" : ` ${customer.status}`}
                                </span>
                              </td>
                              <td>
                                <span className="wait-time">
                                  <FiClock size={12} /> {customer.minutes_waited} min
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  {customer.status === "waiting" && (
                                    <button
                                      className="btn-action call"
                                      onClick={() => handleStatusUpdate(customer.id, "called")}
                                    >
                                      <FiBell size={14} /> Call
                                    </button>
                                  )}
                                  {customer.status === "called" && (
                                    <button
                                      className="btn-action serve"
                                      onClick={() => handleStatusUpdate(customer.id, "served")}
                                    >
                                      <FiCheckCircle size={14} /> Serve
                                    </button>
                                  )}
                                  {customer.status === "waiting" && (
                                    <button
                                      className="btn-action cancel"
                                      onClick={() => handleStatusUpdate(customer.id, "cancelled")}
                                    >
                                      <FiUserX size={14} />
                                    </button>
                                  )}
                                  {customer.status === "served" && (
                                    <span className="completed-badge">
                                      <FiCheckCircle size={14} /> Done
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="empty-state">
                              <FiUsers size={48} />
                              <p>No customers in queue</p>
                              <span className="empty-sub">Waiting for new customers to join</span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Customers Tab */}
              {activeTab === "customers" && (
                <div className="customers-section">
                  <div className="customers-header-bar">
                    <div className="search-wrapper">
                      <FiSearch size={18} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search by name, email or phone..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="search-input"
                      />
                    </div>
                    <div className="customers-stats">
                      <span className="stat-label">
                        <FiUsers size={16} /> Total: {filteredCustomers.length}
                      </span>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="customers-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Customer</th>
                          <th>Contact</th>
                          <th>Party</th>
                          <th>Joined</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <tr key={customer.id} className="table-row">
                              <td className="id-cell">#{customer.id}</td>
                              <td>
                                <div className="customer-cell">
                                  <div className="customer-avatar small">
                                    {customer.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="customer-name">{customer.name}</span>
                                </div>
                              </td>
                              <td>
                                <div className="contact-info">
                                  <span><FiMail size={12} /> {customer.email}</span>
                                  <span><FiPhone size={12} /> {customer.phone}</span>
                                </div>
                              </td>
                              <td>
                                <span className="party-badge">
                                  <FaUsers size={12} /> {customer.party_size || 1}
                                </span>
                              </td>
                              <td>
                                <span className="join-date">
                                  <FiCalendar size={12} /> {new Date(customer.created_at).toLocaleDateString()}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn-view"
                                  onClick={() => handleViewCustomer(customer)}
                                >
                                  <FiEye size={14} /> View
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="empty-state">
                              <FiUsers size={48} />
                              <p>No customers found</p>
                              <span className="empty-sub">Try adjusting your search</span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && selectedCustomer && (
        <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
          <div className="modal-content premium-modal">
            <div className="modal-header">
              <div className="modal-user-info">
                <div className="modal-avatar large">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{selectedCustomer.name}</h3>
                  <span className="modal-user-role">Customer</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowCustomerModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{selectedCustomer.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{selectedCustomer.phone}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Party Size</span>
                  <span className="detail-value">{selectedCustomer.party_size || 1}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Joined</span>
                  <span className="detail-value">
                    {new Date(selectedCustomer.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;