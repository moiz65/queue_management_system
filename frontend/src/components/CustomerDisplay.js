import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { 
  FiUsers, 
  FiCheckCircle, 
  FiClock, 
  FiUser, 
  FiBell,
  FiArrowRight,
  FiEye,
  FiUserCheck,
  FiUserX,
  FiList,
  FiRefreshCw,
  FiCalendar
} from "react-icons/fi";
import { FaUsers } from "react-icons/fa";
import "./CustomerDisplay.css";

const API_URL = process.env.REACT_APP_API_URL;
const socket = io(process.env.REACT_APP_BACKEND_URL);

function CustomerDisplay() {
  const [queueData, setQueueData] = useState(null);
  const [calledCustomers, setCalledCustomers] = useState([]);
  const [nextCustomers, setNextCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    fetchData();

    // Socket listeners
    socket.on("queueUpdated", () => {
      fetchData();
    });

    socket.on("customerCalled", (data) => {
      toast.success(`🔔 Customer #${data.tokenNumber} called!`);
      fetchData();
    });

    return () => {
      clearInterval(timer);
      socket.off("queueUpdated");
      socket.off("customerCalled");
    };
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_URL}/queue/status`);
      setQueueData(response.data);
      
      // Get called customers
      const called = response.data.queue?.filter(c => c.status === 'called') || [];
      setCalledCustomers(called);
      
      // Get next customers (waiting)
      const waiting = response.data.queue?.filter(c => c.status === 'waiting') || [];
      setNextCustomers(waiting.slice(0, 5)); // Show top 5 next customers
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching queue data:", error);
      toast.error("Error fetching queue data");
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "waiting": return "#F59E0B";
      case "called": return "#22C55E";
      case "served": return "#3B82F6";
      case "cancelled": return "#EF4444";
      default: return "#94A3B8";
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="display-loading">
        <div className="loader"></div>
        <p>Loading display...</p>
      </div>
    );
  }

  return (
    <div className="display-container">
      {/* Header */}
      <div className="display-header">
        <div className="header-left">
          <h1>🍽️ Queue Display</h1>
          <span className="live-badge">
            <span className="live-dot"></span> LIVE
          </span>
        </div>
        <div className="header-right">
          <span className="current-time">{formatTime(currentTime)}</span>
          <span className="total-waiting">
            <FiUsers size={18} /> {queueData?.totalWaiting || 0} Waiting
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="display-grid">
        {/* Left Side - Queue List & Up Next */}
        <div className="left-panel">
          {/* Queue List */}
          <div className="queue-list-panel">
            <div className="panel-header">
              <h2><FiList size={20} /> Current Queue</h2>
              <span className="queue-count">{queueData?.queue?.length || 0}</span>
            </div>
            <div className="queue-list">
              {queueData?.queue?.filter(c => c.status === 'waiting').map((customer, index) => (
                <div key={customer.id} className={`queue-item ${index < 3 ? 'highlight' : ''}`}>
                  <div className="queue-position">
                    <span className="position-number">{index + 1}</span>
                  </div>
                  <div className="queue-info">
                    <div className="customer-name-display">
                      <span className="token-display">#{customer.token_number}</span>
                      <span className="name-display">{customer.name}</span>
                    </div>
                    <div className="customer-meta">
                      <span className="party-size">
                        <FaUsers size={12} /> {customer.party_size} people
                      </span>
                      <span className="wait-time">
                        <FiClock size={12} /> {customer.minutes_waited} min
                      </span>
                    </div>
                  </div>
                  <div className="queue-status-indicator waiting">
                    <span>Waiting</span>
                  </div>
                </div>
              ))}
              {(!queueData?.queue || queueData.queue.filter(c => c.status === 'waiting').length === 0) && (
                <div className="empty-queue">
                  <FiUsers size={48} />
                  <p>No customers in queue</p>
                </div>
              )}
            </div>
          </div>

          {/* Up Next */}
          {/* <div className="up-next-panel">
            <div className="panel-header">
              <h2><FiArrowRight size={20} /> Up Next</h2>
              <span className="up-next-count">{nextCustomers.length}</span>
            </div>
            <div className="up-next-list">
              {nextCustomers.slice(0, 3).map((customer) => (
                <div key={customer.id} className="up-next-item">
                  <div className="up-next-number">
                    <span>#{customer.token_number}</span>
                  </div>
                  <div className="up-next-info">
                    <span className="up-next-name">{customer.name}</span>
                    <span className="up-next-party">
                      <FaUsers size={10} /> {customer.party_size}
                    </span>
                  </div>
                  <div className="up-next-time">
                    <FiClock size={12} /> ~{customer.minutes_waited + 5} min
                  </div>
                </div>
              ))}
              {nextCustomers.length === 0 && (
                <div className="empty-up-next">
                  <p>No customers waiting</p>
                </div>
              )}
            </div>
          </div> */}
        </div>

        {/* Right Side - Called Customers */}
        <div className="right-panel">
          <div className="called-panel">
            <div className="panel-header called-header">
              <h2><FiBell size={20} /> Called Customers</h2>
              <span className="called-count">{calledCustomers.length}</span>
            </div>
            <div className="called-list">
              {calledCustomers.map((customer) => (
                <div key={customer.id} className="called-item">
                  <div className="called-token">
                    <span className="called-number">#{customer.token_number}</span>
                    <span className="called-status">🔔 Called</span>
                  </div>
                  <div className="called-info">
                    <span className="called-name">{customer.name}</span>
                    <span className="called-party">
                      <FaUsers size={12} /> {customer.party_size} people
                    </span>
                  </div>
                  <div className="called-time">
                    <FiClock size={12} /> {customer.minutes_waited} min
                  </div>
                  {/* <div className="called-actions">
                    <button 
                      className="btn-serve-small"
                      onClick={() => handleStatusUpdate(customer.id, 'served')}
                    >
                      <FiCheckCircle size={14} /> Serve
                    </button>
                  </div> */}
                </div>
              ))}
              {calledCustomers.length === 0 && (
                <div className="empty-called">
                  <FiBell size={48} />
                  <p>No customers called yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerDisplay;