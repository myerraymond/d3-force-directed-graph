import React from 'react';
import { Link } from 'react-router-dom';
import './Welcome.css';
import logo from '../assets/logo.png'; // Import the logo image

function Welcome() {
  return (
    <div className="welcome-container">
      <img src={logo} alt="logo" className="logo" /> {/* Display the logo */}
      <Link to="/login" className="login-link">Login</Link>
      <p className="p">or</p>
      <Link to="/signup" className="signup-link">Sign Up</Link>
      <a href="/discover" target="_blank" rel="noopener noreferrer" className="discover-link">discover</a>
    </div>
  );
}

export default Welcome;
