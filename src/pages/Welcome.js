import React from 'react';
import { Link } from 'react-router-dom';
import './Welcome.css';

function Welcome() {
  return (
    <div className="welcome-container">
      <h1>
        <span className="main-title">net-work.</span>
        <span className="sub-title">app</span>
      </h1>
      <Link to="/login" className="login-link">Login</Link>
      <p>or</p>
      <Link to="/signup" className="signup-link">Sign Up</Link>
    </div>
  );
}

export default Welcome;
