import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Chat from './components/Chat';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!token ? <Login setAuthToken={setToken} setUser={setUser} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={token ? <Chat token={token} user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
