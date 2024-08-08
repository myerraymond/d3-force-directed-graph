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

    const handleFriendAdded = () => {
        // Refresh graph or other actions
    };

    const handleCloseSearchBar = () => {
        setShowSearchBar(false);
    };

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
            {username && <h2 className="username-text">{username}</h2>}

            <div className="profile-link-container">
                <Link to="/profile" className="profile-button">Profile</Link>
            </div>

            {showSearchBar && (
                <SearchBar
                    onFriendSelect={handleFriendSelect}
                    onFriendAdded={handleFriendAdded}
                    onClose={handleCloseSearchBar}
                />
            )}
            <Graph key={friendsCount} />
            {/* <div class="add-section">
                <h3>Sponsored</h3>
                <p>Get a 20% discount on your next purchase at <a href="https://example.com" target="_blank" class="ad-link">Example Store</a>! Use code: SAVE20 at checkout.</p>
                <p>Hurry, offer ends soon!</p>
            </div> */}

            <ShareButton username={username} />
            <AddNodeButton handleAddNode={handleAddNodeAndRefresh} />
        </>
    );
}

export default MainPage;
