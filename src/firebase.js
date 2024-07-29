// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDOLx-Wi3zyWk5-Prvqca6-jr_ZhHdYxsg",
  authDomain: "net-work-40212.firebaseapp.com",
  projectId: "net-work-40212",
  storageBucket: "net-work-40212.appspot.com",
  messagingSenderId: "529297384050",
  appId: "1:529297384050:web:5059b4634680cd354e58eb",
  measurementId: "G-XRNND1BMGM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Get a Firestore instance from Firebase app
const auth = getAuth(app); // Get an Auth instance from Firebase app
const storage = getStorage(app); // Initialize Firebase Storage

export async function updateConnectionsForAllNodes(userId) {
  try {
    // Fetch all nodes
    const nodesQuerySnapshot = await getDocs(collection(db, `users/${userId}/nodes`));
    const nodes = nodesQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Update connections bidirectionally for each node
    const updatePromises = [];
    for (const node of nodes) {
      // Fetch current node's data
      const currentNodeRef = doc(db, `users/${userId}/nodes/${node.id}`);
      const currentNodeSnapshot = await getDoc(currentNodeRef);

      if (currentNodeSnapshot.exists()) {
        const currentNodeData = currentNodeSnapshot.data();
        console.log(`Checking node:`, currentNodeData);

        // Iterate through current node's connections and update bidirectionally
        for (const connectedNodeId of currentNodeData.connections) {
          if (connectedNodeId) { // Ensure connectedNodeId is defined
            const connectedNodeRef = doc(db, `users/${userId}/nodes/${connectedNodeId}`);
            const connectedNodeSnapshot = await getDoc(connectedNodeRef);

            if (connectedNodeSnapshot.exists()) {
              const connectedNodeData = connectedNodeSnapshot.data();

              // Update connected node's connections with current node if not already included
              const updatedConnections = [...new Set([...connectedNodeData.connections, currentNodeData.id])];
              console.log(`Updating connections for node ${connectedNodeId}:`, updatedConnections);
              updatePromises.push(updateDoc(connectedNodeRef, { connections: updatedConnections }));

              // Update current node's connections with connected node if not already included
              const updatedCurrentNodeConnections = [...new Set([...currentNodeData.connections, connectedNodeId])];
              console.log(`Updating connections for node ${node.id}:`, updatedCurrentNodeConnections);
              updatePromises.push(updateDoc(currentNodeRef, { connections: updatedCurrentNodeConnections }));
            } else {
              console.error(`Connected node ${connectedNodeId} not found.`);
            }
          } else {
            console.error(`Connected node ID is undefined for node ${node.id}.`);
          }
        }
      } else {
        console.error(`Current node ${node.id} not found.`);
      }
    }

    await Promise.all(updatePromises);
    console.log(`Connections updated successfully for all nodes.`);
  } catch (error) {
    console.error('Error updating connections:', error);
    throw error;
  }
}



export { db, auth, storage }; // Export Firestore instance and Auth instance for use in other modules
