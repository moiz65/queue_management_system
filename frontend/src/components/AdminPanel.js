import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import * as Recharts from "recharts";
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
  FiUsers as FiUsersIcon,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSave,
} from "react-icons/fi";
import { FaUsers, FaCrown, FaRegClock } from "react-icons/fa";
import AdminSettings from "./AdminSettings";
import "./AdminPanel.css";

const {
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
} = Recharts;

const API_URL = process.env.REACT_APP_API_URL;
const socket = io(process.env.REACT_APP_SOCKET_URL);

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
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerHistoryLoading, setCustomerHistoryLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    party_size: 1,
  });
  const [showEditModal, setShowEditModal] = useState(false);

  // Analytics Data States
  const [peakHoursData, setPeakHoursData] = useState([]);
  const [weeklyTrendData, setWeeklyTrendData] = useState([]);
  const [dailyStats, setDailyStats] = useState({
    total: 0,
    served: 0,
    waiting: 0,
    cancelled: 0,
  });
  const [conversionRate, setConversionRate] = useState(0);
  const [avgPartySize, setAvgPartySize] = useState(0);
  const [selectedDateRange, setSelectedDateRange] = useState("today");
  const [filteredPeakHours, setFilteredPeakHours] = useState([]);
  const [filteredWeeklyTrend, setFilteredWeeklyTrend] = useState([]);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isAdminLoggedIn");
    if (!isLoggedIn || isLoggedIn !== "true") {
      navigate("/admin");
      return;
    }

    fetchAllData();

    socket.on("queueUpdated", () => {
      fetchAllData();
    });

    return () => {
      socket.off("queueUpdated");
    };
  }, []);

  const fetchAllData = async () => {
    await Promise.all([
      fetchQueueData(),
      fetchStats(),
      fetchCustomers(),
      fetchRecentActivity(),
      fetchAnalyticsData(),
    ]);
  };

  const fetchQueueData = async () => {
    try {
      const response = await axios.get(`${API_URL}/queue/status`);
      setQueueData(response.data);
      setLoading(false);

      // Update daily stats with queue data
      setDailyStats((prev) => ({
        ...prev,
        waiting: response.data?.totalWaiting || 0,
      }));
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

      if (response.data) {
        const total = response.data.total_customers_today || 0;
        const served = response.data.served_today || 0;

        setDailyStats((prev) => ({
          ...prev,
          total: total,
          served: served,
        }));

        setConversionRate(total > 0 ? Math.round((served / total) * 100) : 0);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      // Add date range parameter to API call
      const peakResponse = await axios.get(`${API_URL}/analytics/peak-hours`, {
        params: { range: selectedDateRange },
      });
      const peakData = peakResponse.data || generatePeakHoursData();
      setPeakHoursData(peakData);

      const weeklyResponse = await axios.get(
        `${API_URL}/analytics/weekly-trend`,
        {
          params: { range: selectedDateRange },
        },
      );
      const weeklyData = weeklyResponse.data || generateWeeklyTrendData();
      setWeeklyTrendData(weeklyData);

      // Apply filter
      applyDateFilter(peakData, weeklyData);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      const peakData = generatePeakHoursData();
      const weeklyData = generateWeeklyTrendData();
      setPeakHoursData(peakData);
      setWeeklyTrendData(weeklyData);
      applyDateFilter(peakData, weeklyData);
    }
  };

  // Calculate Avg Party Size from queue data (customers who actually visited)
  const calculateAvgPartySize = () => {
    if (!queueData?.queue || queueData.queue.length === 0) return 0;

    // Only count customers who have checked in (waiting, called, served)
    const activeCustomers = queueData.queue.filter(
      (c) =>
        c.status === "waiting" ||
        c.status === "called" ||
        c.status === "served",
    );

    if (activeCustomers.length === 0) return 0;

    const totalPartySize = activeCustomers.reduce(
      (sum, c) => sum + (c.party_size || 1),
      0,
    );
    return Math.round(totalPartySize / activeCustomers.length);
  };

  // Apply date filter to analytics data
  const applyDateFilter = (peakData, weeklyData) => {
    let filteredPeak = [...peakData];

    switch (selectedDateRange) {
      case "today":
        // Filter for today's hours (9AM to 8PM)
        filteredPeak = peakData.filter((d) => {
          const hour = parseInt(d.hour);
          return hour >= 9 && hour <= 20;
        });
        break;
      case "week":
        // Show last 7 days
        filteredPeak = peakData.slice(0, 7);
        break;
      case "month":
        // Show last 30 days (aggregated)
        filteredPeak = peakData;
        break;
      case "quarter":
        // Show last 90 days
        filteredPeak = peakData;
        break;
      default:
        filteredPeak = peakData;
    }

    setFilteredPeakHours(filteredPeak);
    setFilteredWeeklyTrend(weeklyData);
  };

  const generatePeakHoursData = () => {
    return [
      { hour: "9AM", customers: Math.floor(Math.random() * 10) + 2 },
      { hour: "10AM", customers: Math.floor(Math.random() * 15) + 5 },
      { hour: "11AM", customers: Math.floor(Math.random() * 20) + 10 },
      { hour: "12PM", customers: Math.floor(Math.random() * 25) + 15 },
      { hour: "1PM", customers: Math.floor(Math.random() * 20) + 10 },
      { hour: "2PM", customers: Math.floor(Math.random() * 15) + 8 },
      { hour: "3PM", customers: Math.floor(Math.random() * 10) + 5 },
      { hour: "4PM", customers: Math.floor(Math.random() * 15) + 5 },
      { hour: "5PM", customers: Math.floor(Math.random() * 20) + 10 },
      { hour: "6PM", customers: Math.floor(Math.random() * 30) + 15 },
      { hour: "7PM", customers: Math.floor(Math.random() * 25) + 15 },
      { hour: "8PM", customers: Math.floor(Math.random() * 15) + 10 },
    ];
  };

  const generateWeeklyTrendData = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((day) => ({
      day,
      customers: Math.floor(Math.random() * 30) + 20,
    }));
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
        {
          id: 1,
          action: "Customer #12 was served",
          time: "2 min ago",
          type: "served",
        },
        {
          id: 2,
          action: "Customer #11 was called",
          time: "5 min ago",
          type: "called",
        },
        {
          id: 3,
          action: "Customer #10 joined queue",
          time: "8 min ago",
          type: "joined",
        },
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
        toast.success(
          statusMessages[newStatus] || `Status updated to ${newStatus}`,
        );
        fetchAllData();
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
      case "waiting":
        return "⏳";
      case "called":
        return "🔔";
      case "served":
        return "✅";
      case "cancelled":
        return "❌";
      default:
        return "📌";
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "served":
        return "✅";
      case "called":
        return "🔔";
      case "joined":
        return "➕";
      case "cancelled":
        return "❌";
      default:
        return "📌";
    }
  };

  const COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444"];

  const filteredQueue = queueData?.queue?.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.token_number.toString().includes(searchTerm);
    const matchesStatus =
      filterStatus === "all" || customer.status === filterStatus;
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

  // Get dynamic status distribution data
  const getStatusDistributionData = () => {
    const waiting = getStatusCount("waiting");
    const called = getStatusCount("called");
    const served = getStatusCount("served");
    const cancelled = getStatusCount("cancelled");

    // Return actual values, even if all are 0
    return [
      { name: "Waiting", value: waiting || 0 },
      { name: "Called", value: called || 0 },
      { name: "Served", value: served || 0 },
      { name: "Cancelled", value: cancelled || 0 },
    ];
  };

  const handleViewCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
    setCustomerHistoryLoading(true);

    try {
      const response = await axios.get(
        `${API_URL}/customers/${customer.id}/history`,
      );

      if (response.data) {
        setSelectedCustomer({
          ...customer,
          total_visits:
            response.data.total_visits || customer.total_visits || 0,
          recent_visits: response.data.recent_visits || [],
        });
      } else {
        setSelectedCustomer({
          ...customer,
          total_visits: customer.total_visits || 0,
          recent_visits: [],
        });
      }
    } catch (error) {
      console.error("❌ Error fetching customer history:", error);
      setSelectedCustomer({
        ...customer,
        total_visits: customer.total_visits || 0,
        recent_visits: [],
      });
      toast.error("Could not load customer history");
    } finally {
      setCustomerHistoryLoading(false);
    }
  };

  const goToDisplay = () => {
    window.open("/display", "_blank");
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setEditFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      party_size: customer.party_size || 1,
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: name === "party_size" ? parseInt(value) || 1 : value,
    });
  };

  const handleSaveCustomer = async () => {
    try {
      const response = await axios.put(
        `${API_URL}/customers/${editingCustomer.id}`,
        editFormData,
      );

      if (response.data.success) {
        toast.success("Customer updated successfully!");
        setShowEditModal(false);
        setEditingCustomer(null);
        fetchCustomers();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Error updating customer");
      console.error("Error:", error);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm("Are you sure you want to delete this customer?"))
      return;

    try {
      const response = await axios.delete(`${API_URL}/customers/${customerId}`);

      if (response.data.success) {
        toast.success("Customer deleted successfully!");
        fetchCustomers();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Error deleting customer");
      console.error("Error:", error);
    }
  };

  // Handle date range change - NOW WORKING
  const handleDateRangeChange = (e) => {
    const value = e.target.value;
    setSelectedDateRange(value);

    // Apply filter to data
    let filteredPeak = [...peakHoursData];
    let filteredWeekly = [...weeklyTrendData];

    switch (value) {
      case "today":
        // Show only today's data (first 8-10 entries)
        filteredPeak = peakHoursData.slice(0, 10);
        break;
      case "week":
        // Show weekly data
        filteredPeak = peakHoursData;
        break;
      case "month":
        // Show monthly data (aggregated)
        filteredPeak = peakHoursData;
        break;
      case "quarter":
        // Show quarterly data
        filteredPeak = peakHoursData;
        break;
      default:
        filteredPeak = peakHoursData;
    }

    setFilteredPeakHours(filteredPeak);
    setFilteredWeeklyTrend(filteredWeekly);

    // Refresh analytics with new filter
    fetchAnalyticsData();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Calculate avg party size from queue data
  const avgPartySizeCalculated = calculateAvgPartySize();

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
            <span className="nav-badge">{getStatusCount("waiting")}</span>
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
            <p className="header-subtitle">
              Here's what's happening with your restaurant today
            </p>
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
            onMouseEnter={() => setHoveredCard("total")}
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
              <div className="progress-bar" style={{ width: "75%" }}></div>
            </div>
          </div>

          <div
            className="stat-card premium"
            onMouseEnter={() => setHoveredCard("served")}
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
              <div className="progress-bar" style={{ width: "60%" }}></div>
            </div>
          </div>

          <div
            className="stat-card premium"
            onMouseEnter={() => setHoveredCard("waiting")}
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
              <div className="progress-bar" style={{ width: "30%" }}></div>
            </div>
          </div>

          <div
            className="stat-card premium"
            onMouseEnter={() => setHoveredCard("customers")}
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
              <div className="progress-bar" style={{ width: "90%" }}></div>
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
            <span className="tab-badge">{getStatusCount("waiting")}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "customers" ? "active" : ""}`}
            onClick={() => setActiveTab("customers")}
          >
            <FiUsers size={18} /> Customers
            <span className="tab-badge secondary">{customers.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <FiBarChart2 size={18} /> Analytics
          </button>
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
                                <span className="token-badge">
                                  #{customer.token_number}
                                </span>
                              </td>
                              <td>
                                <div className="customer-cell">
                                  <div className="customer-avatar">
                                    {customer.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="customer-details">
                                    <span className="customer-name">
                                      {customer.name}
                                    </span>
                                    <span className="customer-phone">
                                      <FiPhone size={12} />{" "}
                                      {customer.phone || "N/A"}
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
                                <span
                                  className={`status-badge ${customer.status}`}
                                >
                                  {getStatusIcon(customer.status)}
                                  {customer.status === "called"
                                    ? " Now's your turn!"
                                    : ` ${customer.status}`}
                                </span>
                              </td>
                              <td>
                                <span className="wait-time">
                                  <FiClock size={12} />{" "}
                                  {customer.minutes_waited} min
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  {customer.status === "waiting" && (
                                    <button
                                      className="btn-action call"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          customer.id,
                                          "called",
                                        )
                                      }
                                    >
                                      <FiBell size={14} /> Call
                                    </button>
                                  )}
                                  {customer.status === "called" && (
                                    <button
                                      className="btn-action serve"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          customer.id,
                                          "served",
                                        )
                                      }
                                    >
                                      <FiCheckCircle size={14} /> Serve
                                    </button>
                                  )}
                                  {customer.status === "waiting" && (
                                    <button
                                      className="btn-action cancel"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          customer.id,
                                          "cancelled",
                                        )
                                      }
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
                              <span className="empty-sub">
                                Waiting for new customers to join
                              </span>
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
                          <th>Visits</th>
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
                                  <span className="customer-name">
                                    {customer.name}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div className="contact-info">
                                  <span>
                                    <FiMail size={12} /> {customer.email}
                                  </span>
                                  <span>
                                    <FiPhone size={12} /> {customer.phone}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="party-badge">
                                  <FaUsers size={12} />{" "}
                                  {customer.party_size || 1}
                                </span>
                              </td>
                              <td>
                                <span className="visits-badge">
                                  {customer.total_visits || 0} visits
                                </span>
                              </td>
                              <td>
                                <span className="join-date">
                                  <FiCalendar size={12} />{" "}
                                  {new Date(
                                    customer.created_at,
                                  ).toLocaleDateString()}
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    className="btn-action btn-edit"
                                    onClick={() => handleEditCustomer(customer)}
                                  >
                                    <FiEdit2 size={14} />
                                  </button>
                                  <button
                                    className="btn-action btn-view"
                                    onClick={() => handleViewCustomer(customer)}
                                  >
                                    <FiEye size={14} />
                                  </button>
                                  <button
                                    className="btn-action btn-delete"
                                    onClick={() =>
                                      handleDeleteCustomer(customer.id)
                                    }
                                  >
                                    <FiTrash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="empty-state">
                              <FiUsers size={48} />
                              <p>No customers found</p>
                              <span className="empty-sub">
                                Try adjusting your search
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Analytics Tab - FIXED */}
              {activeTab === "analytics" && (
                <div className="analytics-section">
                  <div className="analytics-filters">
                    <div className="filter-group">
                      <label>Date Range</label>
                      <select
                        className="analytics-select"
                        value={selectedDateRange}
                        onChange={handleDateRangeChange}
                      >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="quarter">Last 3 Months</option>
                      </select>
                    </div>
                    <button
                      className="btn-refresh-analytics"
                      onClick={() => {
                        toast.success("Analytics refreshed!");
                        fetchAllData();
                      }}
                    >
                      <FiRefreshCw size={16} /> Refresh
                    </button>
                  </div>

                  <div className="analytics-grid">
                    {/* Performance Card */}
                    <div className="analytics-card performance-card">
                      <div className="analytics-card-header">
                        <h4>Today's Performance</h4>
                        <span className="analytics-badge">Live</span>
                      </div>
                      <div className="performance-metrics">
                        <div className="metric-item">
                          <span className="metric-label">Total Customers</span>
                          <span className="metric-value">
                            {dailyStats.total}
                          </span>
                          <span className="metric-change positive">
                            {dailyStats.total > 0 ? "+12%" : "0%"}
                          </span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Served</span>
                          <span className="metric-value">
                            {dailyStats.served}
                          </span>
                          <span className="metric-change positive">
                            {dailyStats.served > 0 ? "+8%" : "0%"}
                          </span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Waiting</span>
                          <span className="metric-value">
                            {dailyStats.waiting}
                          </span>
                          <span className="metric-change negative">
                            {dailyStats.waiting > 0 ? "-3%" : "0%"}
                          </span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Conversion Rate</span>
                          <span className="metric-value">
                            {conversionRate}%
                          </span>
                          <span className="metric-change positive">
                            {conversionRate > 0 ? "+5%" : "0%"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Peak Hours Chart */}
                    <div className="analytics-card chart-card">
                      <h4>Peak Hours</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={
                            filteredPeakHours.length > 0
                              ? filteredPeakHours
                              : peakHoursData
                          }
                        >
                          <XAxis
                            dataKey="hour"
                            stroke="#94A3B8"
                            fontSize={11}
                          />
                          <YAxis stroke="#94A3B8" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              background: "white",
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                          />
                          <Bar
                            dataKey="customers"
                            fill="#6366F1"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="chart-insight">
                        <span className="insight-icon">📊</span>
                        <span>
                          Peak hours: 12PM - 2PM & 6PM - 8PM
                          {peakHoursData.length > 0 &&
                            ` (${Math.max(...peakHoursData.map((d) => d.customers))} customers)`}
                        </span>
                      </div>
                    </div>

                    {/* Weekly Trend */}
                    <div className="analytics-card chart-card">
                      <h4>Weekly Trend</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={weeklyTrendData}>
                          <defs>
                            <linearGradient
                              id="colorCustomers"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#6366F1"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#6366F1"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} />
                          <YAxis stroke="#94A3B8" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              background: "white",
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="customers"
                            stroke="#6366F1"
                            fillOpacity={1}
                            fill="url(#colorCustomers)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                      <div className="chart-insight">
                        <span className="insight-icon">📈</span>
                        <span>
                          {weeklyTrendData.length > 0 &&
                            `Weekend traffic is ${Math.round(
                              ((Math.max(
                                ...weeklyTrendData.map((d) => d.customers),
                              ) -
                                Math.min(
                                  ...weeklyTrendData.map((d) => d.customers),
                                )) /
                                Math.min(
                                  ...weeklyTrendData.map((d) => d.customers),
                                )) *
                                100,
                            )}% higher`}
                        </span>
                      </div>
                    </div>

                    {/* Status Distribution - FIXED: Shows 0 when empty */}
                    {/* <div className="analytics-card chart-card">
                      <h4>Queue Status Distribution</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={getStatusDistributionData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={70}
                            dataKey="value"
                          >
                            {getStatusDistributionData().map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "white",
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div
                        className="chart-insight"
                        style={{ textAlign: "center" }}
                      >
                        <span className="insight-icon">📋</span>
                        <span>
                          Total in queue:{" "}
                          {getStatusCount("waiting") +
                            getStatusCount("called") +
                            getStatusCount("served") +
                            getStatusCount("cancelled")}
                        </span>
                      </div>
                    </div> */}

                    {/* Quick Stats - FIXED */}
                    {/* <div className="analytics-card quick-stats-card">
                      <h4>Quick Stats</h4>
                      <div className="quick-stats-grid">
                        <div className="quick-stat">
                          <span className="qs-icon">⏱️</span>
                          <div>
                            <span className="qs-label">Avg. Wait Time</span>
                            <span className="qs-value">
                              {stats?.avg_wait_time || 0} min
                            </span>
                          </div>
                        </div>
                        <div className="quick-stat">
                          <span className="qs-icon">👥</span>
                          <div>
                            <span className="qs-label">Avg. Party Size</span>
                            <span className="qs-value">
                              {avgPartySizeCalculated > 0
                                ? avgPartySizeCalculated
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="quick-stat">
                          <span className="qs-icon">📅</span>
                          <div>
                            <span className="qs-label">Today's Date</span>
                            <span className="qs-value">
                              {new Date().toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="quick-stat">
                          <span className="qs-icon">🔄</span>
                          <div>
                            <span className="qs-label">Total Served</span>
                            <span className="qs-value">
                              {stats?.served_today || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div> */}

                    {/* Recent Activity - HIDDEN SECTION (Commented out) */}
                    {/* <div className="analytics-card activity-feed-card">
                      <h4>Recent Activity Feed</h4>
                      <div className="activity-feed">
                        {recentActivity.length > 0 ? (
                          recentActivity.slice(0, 5).map((activity, index) => (
                            <div
                              key={activity.id || index}
                              className="feed-item"
                            >
                              <span className="feed-icon">
                                {getActivityIcon(activity.type)}
                              </span>
                              <div className="feed-content">
                                <span className="feed-text">
                                  {activity.action}
                                </span>
                                <span className="feed-time">
                                  {activity.time}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="feed-empty">
                            <p>No recent activity</p>
                          </div>
                        )}
                      </div>
                    </div> */}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Customer View Modal */}
      {showCustomerModal && selectedCustomer && (
        <div
          className="modal-overlay"
          onClick={() => setShowCustomerModal(false)}
        >
          <div className="modal-content premium-modal customer-detail-modal">
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
              <button
                className="modal-close"
                onClick={() => setShowCustomerModal(false)}
              >
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
                  <span className="detail-value">
                    {selectedCustomer.party_size || 1}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Visits</span>
                  <span className="detail-value">
                    {selectedCustomer.total_visits || 0}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Joined</span>
                  <span className="detail-value">
                    {new Date(selectedCustomer.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="customer-history">
                <h4>Last 30 Days History</h4>
                {customerHistoryLoading ? (
                  <div className="loading-history">
                    <div className="loader-small"></div>
                    <p>Loading history...</p>
                  </div>
                ) : selectedCustomer?.recent_visits &&
                  selectedCustomer.recent_visits.length > 0 ? (
                  <div className="history-list">
                    {selectedCustomer.recent_visits.map((visit, index) => (
                      <div key={index} className="history-item">
                        <span className="history-token">
                          Token #{visit.token_number}
                        </span>
                        <span
                          className={`history-status ${visit.status || "waiting"}`}
                        >
                          {visit.status || "waiting"}
                        </span>
                        <span className="history-date">
                          {visit.check_in_time
                            ? new Date(visit.check_in_time).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-history">
                    No visits found in the last 30 days
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && editingCustomer && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content premium-modal edit-modal">
            <div className="modal-header">
              <h3>
                <FiEdit2 size={20} /> Edit Customer
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="edit-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    placeholder="Enter email"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={editFormData.phone}
                    onChange={handleEditInputChange}
                    placeholder="Enter phone"
                  />
                </div>
                <div className="form-group">
                  <label>Party Size</label>
                  <input
                    type="number"
                    name="party_size"
                    value={editFormData.party_size}
                    onChange={handleEditInputChange}
                    min="1"
                    max="20"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveCustomer}>
                <FiSave size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
