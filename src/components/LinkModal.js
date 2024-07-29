// LinkModal.js

import React from 'react';
import './LinkModal.css'; // Create LinkModal.css for styling if needed

const LinkModal = ({ nodes, closeModal, handleLinkNode }) => {
  return (
    <div className="link-modal">
      <h2>Select Node to Link</h2>
      <ul>
        {nodes.map(node => (
          <li key={node.id}>
            <button onClick={() => handleLinkNode(node.id)}>Link with {node.label}</button>
          </li>
        ))}
      </ul>
      <button onClick={closeModal}>Cancel</button>
    </div>
  );
};

export default LinkModal;
