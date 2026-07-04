import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiBell,
  FiArrowRight,
  FiRefreshCw,
  FiInfo,
  FiMapPin,
  FiClock as FiClockIcon,
  FiTag,
  FiTrendingUp,
  FiAward,
  FiStar,
  FiGift,
  FiHeart,
  FiSmile,
  FiCalendar,
  FiHome,
} from "react-icons/fi";
import {
  FaUtensils,
  FaClock,
  FaCheck,
  FaBell as FaBellIcon,
} from "react-icons/fa";
import "./CustomerInterface.css";

const API_URL = "http://localhost:5000/api";
const socket = io("http://localhost:5000", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

function CustomerInterface() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    party_size: 1,
  });
  const [queueStatus, setQueueStatus] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [showCallNotification, setShowCallNotification] = useState(false);
  const [waitTimeProgress, setWaitTimeProgress] = useState(0);
  const notificationSoundRef = useRef(null);
  const isMounted = useRef(true);
  const customerIdRef = useRef(null);

  // Initialize audio
  useEffect(() => {
    notificationSoundRef.current = new Audio("/notification.mp3");
    notificationSoundRef.current.load();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Socket connection and listeners - Only set up once
  useEffect(() => {
    // Socket connection status
    socket.on("connect", () => {
      console.log("Socket connected");
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    // Global queue updated listener
    socket.on("queueUpdated", () => {
      console.log("Queue updated event received");
      if (customerIdRef.current) {
        fetchCustomerStatus(customerIdRef.current);
      }
    });

    // Customer called listener
    socket.on("customerCalled", (data) => {
      console.log("Customer called event received:", data);
      const currentId = customerIdRef.current;
      if (currentId && data.customerId === parseInt(currentId)) {
        handleCustomerCalled(data);
      }
    });

    // Customer served listener
    socket.on("customerServed", (data) => {
      console.log("Customer served event received:", data);
      const currentId = customerIdRef.current;
      if (currentId && data.customerId === parseInt(currentId)) {
        toast.success("You have been served! Thank you for visiting.", {
          duration: 5000,
          icon: <FiCheckCircle size={24} />,
        });
        fetchCustomerStatus(currentId);
      }
    });

    // Customer cancelled listener
    socket.on("customerCancelled", (data) => {
      console.log("Customer cancelled event received:", data);
      const currentId = customerIdRef.current;
      if (currentId && data.customerId === parseInt(currentId)) {
        toast.error("Your queue has been cancelled.", {
          duration: 5000,
        });
        handleNewQueue();
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("queueUpdated");
      socket.off("customerCalled");
      socket.off("customerServed");
      socket.off("customerCancelled");
    };
  }, []);

  // Load saved customer on mount
  useEffect(() => {
    const savedCustomerId = localStorage.getItem("customerId");
    if (savedCustomerId) {
      setCustomerId(savedCustomerId);
      customerIdRef.current = savedCustomerId;
      fetchCustomerStatus(savedCustomerId);
    }
  }, []);

  // Update customerIdRef when customerId changes
  useEffect(() => {
    customerIdRef.current = customerId;
  }, [customerId]);

  // Handle customer called event
  const handleCustomerCalled = (data) => {
    console.log("Handling customer called");
    setShowCallNotification(true);
    setQueueStatus((prev) => {
      if (prev) {
        return {
          ...prev,
          status: "called",
        };
      }
      return prev;
    });

    // Show toast notification
    toast.success("Now it's your turn! Please proceed to the counter.", {
      duration: 15000,
      icon: <FaBellIcon size={24} />,
      style: {
        background: "#4CAF50",
        color: "white",
        fontSize: "16px",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 8px 30px rgba(76, 175, 80, 0.4)",
      },
    });

    // Play notification sound
    try {
      if (notificationSoundRef.current) {
        notificationSoundRef.current
          .play()
          .catch((e) => console.log("Sound play error:", e));
      }
    } catch (e) {
      console.log("Sound not available");
    }

    // Fetch latest status
    if (customerIdRef.current) {
      fetchCustomerStatus(customerIdRef.current);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "party_size" ? parseInt(value) || 1 : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_URL}/queue/add`, formData);

      if (response.data.success) {
        toast.success(response.data.message);
        const newCustomerId = response.data.data.customerId;
        setCustomerId(newCustomerId);
        customerIdRef.current = newCustomerId;
        localStorage.setItem("customerId", newCustomerId.toString());

        // First, set queue status with API data
        setQueueStatus({
          tokenNumber: response.data.data.tokenNumber,
          estimatedWaitTime: response.data.data.estimatedWaitTime,
          position: response.data.data.position || 1, // Use position from API response
          status: "waiting",
        });
        setShowForm(false);
        setShowCallNotification(false);
        setWaitTimeProgress(33);

        // Then fetch latest status to confirm
        await fetchCustomerStatus(newCustomerId);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Error adding to queue");
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchCustomerStatus = async (id) => {
    if (!id || !isMounted.current) return;

    try {
      console.log("Fetching customer status for ID:", id);
      const response = await axios.get(`${API_URL}/queue/customer/${id}`);
      console.log("Customer status response:", response.data);

      if (response.data.inQueue) {
        const status = response.data.status;
        const newStatus = {
          tokenNumber: response.data.token_number,
          position: response.data.position || 1,
          estimatedWaitTime: response.data.estimated_wait_time,
          status: status,
          minutesWaited: response.data.minutes_waited || 0,
        };

        console.log("Setting queue status with position:", newStatus.position);
        setQueueStatus(newStatus);
        setShowForm(false);

        // Calculate progress
        let progress = 0;
        if (status === "waiting") progress = 33;
        else if (status === "called") progress = 66;
        else if (status === "served") progress = 100;
        setWaitTimeProgress(progress);

        if (status === "called") {
          setShowCallNotification(true);
        } else {
          setShowCallNotification(false);
        }
      } else {
        setQueueStatus(null);
        setShowForm(true);
        setShowCallNotification(false);
        setWaitTimeProgress(0);
        localStorage.removeItem("customerId");
        customerIdRef.current = null;
      }
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  };

  const handleNewQueue = () => {
    setQueueStatus(null);
    setShowForm(true);
    setShowCallNotification(false);
    setWaitTimeProgress(0);
    setFormData({
      name: "",
      email: "",
      phone: "",
      party_size: 1,
    });
    localStorage.removeItem("customerId");
    setCustomerId(null);
    customerIdRef.current = null;
  };

  // Auto-refresh status every 10 seconds (backup for socket)
  useEffect(() => {
    let interval;
    if (customerId && queueStatus?.status === "waiting" && isMounted.current) {
      interval = setInterval(() => {
        console.log("Auto-refresh status");
        fetchCustomerStatus(customerId);
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [customerId, queueStatus?.status]);

  return (
    <div className="customer-container">
      <div className="customer-card">
        {/* Header */}
        <div className="card-header">
          <div className="header-icon">
            <FaUtensils size={48} />
          </div>
          <h2>
            Welcome to <br />
            <span className="highlight">Fine Dining</span>
          </h2>
          <p className="subtitle">Join the queue and get your table</p>
        </div>

        {/* Call Notification */}
        {showCallNotification && (
          <div className="call-notification">
            <div className="notification-icon">
              <FaBellIcon color="white" size={36} />
            </div>
            <div className="notification-content">
              <h3>Now it's your turn!</h3>
              <p>Please proceed to the counter with your token</p>
              <div className="token-display-big">
                #{queueStatus?.tokenNumber}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="customer-form">
            <div className="form-group">
              <label>
                <FiUser className="input-icon" />
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter your full name"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label>
                <FiMail className="input-icon" />
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="your@email.com"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label>
                <FiPhone className="input-icon" />
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder="03XX-XXXXXXX"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label>
                <FiUsers className="input-icon" />
                Party Size
              </label>
              <input
                type="number"
                name="party_size"
                value={formData.party_size}
                onChange={handleInputChange}
                min="1"
                max="20"
                disabled={isSubmitting}
                className="party-size-input"
              />
              <small className="input-hint">Minimum 1 person</small>
            </div>

            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span> Joining Queue...
                </>
              ) : (
                <>
                  Join Queue <FiArrowRight className="btn-icon" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Queue Status */}
        {queueStatus && !showForm && (
          <div className="queue-status">
            <h3>
              <FiInfo className="status-title-icon" />
              Your Queue Status
            </h3>
            <div className="status-card">
              <div className="status-grid">
                <div className="status-item token-item">
                  <span className="label">
                    <FiTag size={14} /> Token
                  </span>
                  <span className="value token-number">
                    #{queueStatus.tokenNumber}
                  </span>
                </div>
                <div className="status-item time-item">
                  <span className="label">
                    <FiClockIcon size={14} /> EST Wait
                  </span>
                  <span className="value">
                    {queueStatus.estimatedWaitTime} min
                  </span>
                </div>
                {queueStatus.minutesWaited > 0 && (
                  <div className="status-item waited-item">
                    <span className="label">
                      <FaClock size={14} /> Waited
                    </span>
                    <span className="value">
                      {queueStatus.minutesWaited} min
                    </span>
                  </div>
                )}
                <div className="status-item status-item-full">
                  <span className="label">
                    <FiTrendingUp size={14} /> Status
                  </span>
                  <span className={`status-badge ${queueStatus.status}`}>
                    {queueStatus.status === "waiting" && (
                      <>
                        <FiClock size={14} /> Waiting...
                      </>
                    )}
                    {queueStatus.status === "called" && (
                      <>
                        <FiBell size={14} /> Now it's your turn!
                      </>
                    )}
                    {queueStatus.status === "served" && (
                      <>
                        <FiCheckCircle size={14} /> Served
                      </>
                    )}
                    {queueStatus.status === "cancelled" && (
                      <>
                        <FiUser size={14} /> Cancelled
                      </>
                    )}
                  </span>
                </div>
              </div>
              <div className="status-progress">
                <div className="progress-track">
                  <div
                    className={`progress-fill ${queueStatus.status}`}
                    style={{ width: `${waitTimeProgress}%` }}
                  ></div>
                </div>
                <div className="progress-labels">
                  <span
                    className={`step ${waitTimeProgress >= 33 ? "active" : ""}`}
                  >
                    <span className="step-dot"></span> Waiting
                  </span>
                  <span
                    className={`step ${waitTimeProgress >= 66 ? "active" : ""}`}
                  >
                    <span className="step-dot"></span> Called
                  </span>
                  <span
                    className={`step ${waitTimeProgress >= 100 ? "active" : ""}`}
                  >
                    <span className="step-dot"></span> Served
                  </span>
                </div>
              </div>
            </div>

            <button className="btn-new-queue" onClick={handleNewQueue}>
              Join Queue Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerInterface;
