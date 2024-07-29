// firebaseService.js

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDOLx-Wi3zyWk5-Prvqca6-jr_ZhHdYxsg",
    authDomain: "net-work-40212.firebaseapp.com",
    projectId: "net-work-40212",
    storageBucket: "net-work-40212.appspot.com",
    messagingSenderId: "529297384050",
    appId: "1:529297384050:web:5059b4634680cd354e58eb",
    measurementId: "G-XRNND1BMGM"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to update connections bidirectionally for all nodes connected to the primary node
export async function updateConnectionsForPrimaryNode(primaryNode, userId) {
  try {
    // Fetch primary node's connections
    const primaryNodeRef = doc(db, `users/${userId}/nodes`, primaryNode);
    const primaryNodeSnapshot = await primaryNodeRef.get();

    if (!primaryNodeSnapshot.exists()) {
      throw new Error('Primary node not found.');
    }

    const primaryNodeData = primaryNodeSnapshot.data();

    // Update connections bidirectionally for each connected node
    const updatePromises = [];
    primaryNodeData.connections.forEach(async (connectedNodeId) => {
      // Get connected node's current connections
      const connectedNodeRef = doc(db, `users/${userId}/nodes`, connectedNodeId);
      const connectedNodeSnapshot = await connectedNodeRef.get();

      if (connectedNodeSnapshot.exists()) {
        const connectedNodeData = connectedNodeSnapshot.data();

        // Update connected node's connections with primary node if not already included
        const updatedConnections = [...new Set([...connectedNodeData.connections, primaryNode])];
        updatePromises.push(updateDoc(connectedNodeRef, { connections: updatedConnections }));

        // Update primary node's connections with connected node if not already included
        const updatedPrimaryNodeConnections = [...new Set([...primaryNodeData.connections, connectedNodeId])];
        updatePromises.push(updateDoc(primaryNodeRef, { connections: updatedPrimaryNodeConnections }));
      }
    });

    await Promise.all(updatePromises);
    console.log(`Connections updated successfully for all nodes connected to ${primaryNode}.`);
  } catch (error) {
    console.error('Error updating connections:', error);
    throw error;
  }
}

export { db };
