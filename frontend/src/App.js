import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import CustomerInterface from './components/CustomerInterface';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import CustomerDisplay from './components/CustomerDisplay';
import './App.css';

function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
    setIsAdminLoggedIn(loggedIn);
  }, []);

  const handleLogin = (status) => {
    setIsAdminLoggedIn(status);
    if (status) {
      localStorage.setItem('isAdminLoggedIn', 'true');
    } else {
      localStorage.removeItem('isAdminLoggedIn');
    }
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<CustomerInterface />} />
          <Route path="/display" element={<CustomerDisplay />} />
          <Route 
            path="/admin" 
            element={
              isAdminLoggedIn ? 
              <Navigate to="/admin/dashboard" replace /> : 
              <AdminLogin onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/admin/dashboard" 
            element={
              isAdminLoggedIn ? 
              <AdminPanel /> : 
              <Navigate to="/admin" replace />
            } 
          />
        </Routes>
        
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#27ae60',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#e74c3c',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;