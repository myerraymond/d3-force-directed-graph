import React, { useState, useEffect, useCallback } from 'react';
import { auth, db, updateConnectionsForAllNodes } from '../firebase'; // Import Firebase services
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';

import Graph from "../components/Graph";
import './MainPage.css';
import AddNodeButton from '../components/AddNodeButton';
import Notifications from '../components/Notifications';
import SearchBar from '../components/SearchBar';

function MainPage({ handleAddNode }) {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshPage, setRefreshPage] = useState(false); // State for refreshing the page
    const [friendsCount, setFriendsCount] = useState(0);

    // Function to fetch user data and update connections on page refresh
    const fetchUserData = async (userId) => {
        try {
            const userRef = doc(db, `users/${userId}`); // Reference to the user document
            const userDoc = await getDoc(userRef); // Fetch user document

            if (userDoc.exists()) {
                setUsername(userDoc.data().displayName);

                // Fetch nodes and count connections
                const nodesQuerySnapshot = await getDocs(collection(db, `users/${userId}/nodes`));
                const nodes = nodesQuerySnapshot.docs.map(doc => doc.data());

                // Count connections
                let totalConnections = 0;
                nodes.forEach(node => {
                    totalConnections += node.connections.length;
                });

                setFriendsCount(nodes.length);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching user data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchUserData(user.uid); // Call fetchUserData for authenticated user
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Function to handle adding a node and trigger page refresh
    const handleAddNodeAndRefresh = useCallback(async (nodeName) => {
        // Call handleAddNode to perform the initial node addition logic
        handleAddNode(nodeName);

        // Trigger page refresh
        setRefreshPage(prev => !prev);
    }, [handleAddNode]);

    // Function to handle manual page refresh
    const handleRefreshPage = async () => {
        try {
            // Refresh user data and update connections for all nodes
            const userId = auth.currentUser.uid;
            await fetchUserData(userId); // Fetch user data to update statistics

            // Update connections bidirectionally for all nodes
            await updateConnectionsForAllNodes(userId);

            // Trigger page refresh
            setRefreshPage(prev => !prev);
        } catch (error) {
            console.error('Error updating connections on page refresh:', error);
        }
    };

    // Function to handle friend selection from search results
    const handleFriendSelect = async (friend) => {
        try {
            const userId = auth.currentUser.uid;
            const friendId = friend.id;

            // Create a connection between the current user and the selected friend
            const userNodeRef = doc(db, `users/${userId}/nodes/${friendId}`);
            const friendNodeRef = doc(db, `users/${friendId}/nodes/${userId}`);

            await setDoc(userNodeRef, { connections: [friendId] }, { merge: true });
            await setDoc(friendNodeRef, { connections: [userId] }, { merge: true });

            // Refresh page to reflect the new connection
            await handleRefreshPage();
        } catch (error) {
            console.error('Error adding friend:', error);
        }
    };

    // Mock notifications
    const notifications = [
        "John added a new connection.",
        "Emily added a new connection.",
        "You have 5 new friend requests.",
    ];

    if (loading) {
        return <p>Loading...</p>;
    }

    return (
        <>
            <div className="header-container">
                <h1>
                    <span className="header-text">net-work</span>
                    <span className="sub-title">.app</span>
                </h1>
            </div>
            {username && <h2 className="username-text">Welcome, {username}!</h2>}
            <div className="statistics-box">
                <div className="statistics-content">
                    <p>Friends: {friendsCount - 1}</p>
                </div>
                <button onClick={handleRefreshPage} className="refresh-button">
                    <FontAwesomeIcon icon={faSync} className="refresh-icon" />
                </button>
            </div>
            <SearchBar onFriendSelect={handleFriendSelect} />
            <Graph key={refreshPage.toString()} /> {/* Key prop to trigger refresh */}
            <AddNodeButton handleAddNode={handleAddNodeAndRefresh} />
        </>
    );
}

export default MainPage;
