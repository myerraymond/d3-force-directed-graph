import React, { useState, useEffect, useCallback } from 'react';
import { auth, db, updateConnectionsForAllNodes } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';

import Graph from "../components/Graph";
import './MainPage.css';
import AddNodeButton from '../components/AddNodeButton';
import SearchBar from '../components/SearchBar';
import { Link } from 'react-router-dom';
import ShareButton from '../components/ShareButton'; // Import the ShareButton
import logo from '../assets/logo.png'; // Import your logo

function MainPage({ handleAddNode }) {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(true);
    const [friendsCount, setFriendsCount] = useState(0);
    const [showSearchBar, setShowSearchBar] = useState(true);

    const fetchUserData = async (userId) => {
        try {
            const userRef = doc(db, `users/${userId}`);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                setUsername(userDoc.data().displayName);

                const nodesQuerySnapshot = await getDocs(collection(db, `users/${userId}/nodes`));
                const nodes = nodesQuerySnapshot.docs.map(doc => doc.data());

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
                fetchUserData(user.uid);
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleAddNodeAndRefresh = useCallback(async (nodeName) => {
        handleAddNode(nodeName);
        setFriendsCount(prev => prev + 1);  // Increment friendsCount to trigger refresh
    }, [handleAddNode]);

    const handleRefreshPage = async () => {
        try {
            const userId = auth.currentUser.uid;
            await fetchUserData(userId);
            await updateConnectionsForAllNodes(userId);
            setFriendsCount(prev => prev + 1);  // Increment friendsCount to trigger refresh
        } catch (error) {
            console.error('Error updating connections on page refresh:', error);
        }
    };

    const handleFriendSelect = async (friend) => {
        try {
            const userId = auth.currentUser.uid;
            const friendId = friend.id;

            const userNodeRef = doc(db, `users/${userId}/nodes/${friendId}`);
            const friendNodeRef = doc(db, `users/${friendId}/nodes/${userId}`);

            await setDoc(userNodeRef, { connections: [friendId] }, { merge: true });
            await setDoc(friendNodeRef, { connections: [userId] }, { merge: true });

            await handleRefreshPage();
        } catch (error) {
            console.error('Error adding friend:', error);
        }
    };

    const handleFriendAdded = async () => {
        await handleRefreshPage();
    };

    return (
        <div className="main-page">
            <div className="header-container">
                <img src={logo} alt="Logo" className="header-logo" />
                <div className="username-text">
                    Welcome, {username}
                </div>
            </div>
            <div className="profile-link-container">
                <Link to="/profile" className="profile-button">Profile</Link>
            </div>
            <div className="graph-container">
                <Graph userId={auth.currentUser?.uid} />
            </div>
            
            <AddNodeButton onAddNode={handleAddNodeAndRefresh} />
            <SearchBar showSearchBar={showSearchBar} setShowSearchBar={setShowSearchBar} handleFriendSelect={handleFriendSelect} />
            <ShareButton /> {/* Add the ShareButton component */}
            {/* <div className="add-section">
                <h3>Advertisement</h3>
                <p>Check out our new features!</p>
                <a href="#" className="ad-link">Learn More</a>
            </div> */}
        </div>
    );
}

export default MainPage;
