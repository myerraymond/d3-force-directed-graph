// UserDetailsModal.js
import React, { useState } from "react";

const UserDetailsModal = ({ isOpen, onClose, onConfirm }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const handleConfirm = () => {
    onConfirm({ username, email });
    onClose();
  };

  return (
    <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
      <div className="modal">
        <h2>User Details</h2>
        <label>
          Username:
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <div className="modal-buttons">
          <button onClick={handleConfirm}>Confirm</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
