import React from 'react';
import './Discover.css';
import logo from '../assets/logo.png'; // Importing the logo

function Discover() {
  return (
    <div className="discover-container">
      <img src={logo} alt="Kewe Logo" className="logo" />
      <p className="description">
        Explore new connections and expand your network in a fun and interactive way.
      </p>
      
      <a 
        href="https://www.linkedin.com" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="linkedin-link"
      >
        LinkedIn
      </a>

      <div className="features">
        <div className="feature">
          <h2>Visualize Your Network</h2>
          <p>
            See your social connections represented as nodes on a graph. Understand the relationships and how everyone is connected.
          </p>
        </div>
        <div className="feature">
          <h2>Mutual Connections</h2>
          <p>
            Discover mutual connections between you and others. See how your network intertwines with the networks of your friends.
          </p>
        </div>
        <div className="feature">
          <h2>Interactive Experience</h2>
          <p>
            Engage with your network like never before. Click on nodes to explore connections, add new friends, and expand your social circle.
          </p>
        </div>
        <div className="feature">
          <h2>Real-Time Updates</h2>
          <p>
            Watch your network grow in real-time as you add new friends. Stay connected with the latest changes in your social graph.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Discover;
