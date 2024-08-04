// src/components/SearchBar.js
import React, { useState, useRef, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { findMutualConnections } from '../scripts/findMutualConnections'; // Import the function
import './SearchBar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { faTimes } from '@fortawesome/free-solid-svg-icons'; // Import the cancel icon

function SearchBar({ onFriendSelect, onFriendAdded, onClose }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState('bottom');
    const [isAdding, setIsAdding] = useState(false);
    const [addSuccess, setAddSuccess] = useState(false);
    const infoIconRef = useRef(null);
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    useEffect(() => {
        if (tooltipVisible && infoIconRef.current) {
            const iconRect = infoIconRef.current.getBoundingClientRect();
            const tooltipHeight = 40; // Adjust this value based on your tooltip's height
            const viewportHeight = window.innerHeight;
            const tooltipPosition = iconRect.top + tooltipHeight > viewportHeight ? 'top' : 'bottom';
            setTooltipPosition(tooltipPosition);
        }
    }, [tooltipVisible]);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('displayName', '>=', searchQuery), where('displayName', '<=', searchQuery + '\uf8ff'));
            const querySnapshot = await getDocs(q);
            const results = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(user => user.id !== currentUser.uid); // Exclude the current user from search results
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching users:', error);
        }
        setLoading(false);
    };

    const handleSelect = async (friend) => {
        setIsAdding(true);
        setAddSuccess(false);
        try {
            const friendId = friend.id;
    
            // Retrieve full friend details from Firestore
            const friendDocRef = doc(db, 'users', friendId);
            const friendDoc = await getDoc(friendDocRef);
            const friendData = friendDoc.data();
    
            if (!friendData) {
                throw new Error('Friend data not found');
            }
    
            // Retrieve current user data
            const currentUserRef = doc(db, 'users', currentUser.uid);
            const currentUserDoc = await getDoc(currentUserRef);
            const currentUserData = currentUserDoc.data();
    
            if (!currentUserData) {
                throw new Error('Current user data not found');
            }
    
            // Reference to the current user's primary node
            const userNodeRef = doc(db, `users/${currentUser.uid}/nodes/${currentUser.uid}`);
            // Reference to the selected friend's primary node
            const friendNodeRef = doc(db, `users/${friendId}/nodes/${friendId}`);
    
            // Add the selected friend to the current user's connections
            await updateDoc(userNodeRef, {
                connections: arrayUnion(friendId)
            });
    
            // Add the current user to the selected friend's connections
            await updateDoc(friendNodeRef, {
                connections: arrayUnion(currentUser.uid)
            });
    
            // Create or update the selected friend's node in the current user's node collection
            await setDoc(doc(db, `users/${currentUser.uid}/nodes/${friendId}`), {
                id: friendId,
                label: friendData.displayName,
                profilePicture: friendData.profilePicture,
                connections: [currentUser.uid]
            });
    
            // Create or update the current user's node in the selected friend's node collection
            await setDoc(doc(db, `users/${friendId}/nodes/${currentUser.uid}`), {
                id: currentUser.uid,
                label: currentUserData.displayName,
                profilePicture: currentUserData.profilePicture,
                connections: [friendId]
            });
    
            // Retrieve all connections of the selected friend
            const friendConnectionsRef = collection(db, `users/${friendId}/nodes`);
            const friendConnectionsSnapshot = await getDocs(friendConnectionsRef);
            const friendConnections = friendConnectionsSnapshot.docs.map(doc => doc.id);
    
            // Add all connections of the friend to the current user's node collection
            for (const connectionId of friendConnections) {
                if (connectionId !== currentUser.uid) {
                    // Check if the connection already exists in the current user's node collection
                    const connectionDocRef = doc(db, `users/${currentUser.uid}/nodes/${connectionId}`);
                    const connectionDoc = await getDoc(connectionDocRef);
    
                    if (!connectionDoc.exists()) {
                        // Retrieve connection details
                        const connectionDocRefInUsers = doc(db, `users/${connectionId}`);
                        const connectionDocInUsers = await getDoc(connectionDocRefInUsers);
                        const connectionData = connectionDocInUsers.data();
    
                        // Add the connection as a node in the current user's node collection
                        await setDoc(doc(db, `users/${currentUser.uid}/nodes/${connectionId}`), {
                            id: connectionId,
                            label: connectionData.displayName,
                            profilePicture: connectionData.profilePicture,
                            connections: [friendId]
                        });
    
                        // Add the current user as a connection of the new node
                        await updateDoc(doc(db, `users/${connectionId}/nodes/${currentUser.uid}`), {
                            connections: arrayUnion(friendId)
                        });
                    }
                }
            }
    
            // Update mutual connections
            await findMutualConnections(currentUser.uid);
    
            // Notify the parent component to refresh the graph
            onFriendAdded();
    
            setAddSuccess(true);
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            console.error('Error adding friend:', error);
        } finally {
            setIsAdding(false);
            if (typeof onClose === 'function') {
                setTimeout(() => {
                    setAddSuccess(false);
                    // Only close the search results, not the entire search bar
                    setSearchResults([]);
                }, 2000);
            }
        }
    };
    
    const handleView = (friendId) => {
        navigate(`/user/${friendId}`);
    };

    const toggleTooltip = () => {
        setTooltipVisible(prev => !prev);
    };

    const handleCancel = () => {
        setSearchQuery('');
        setSearchResults([]);
    };

    return (
        <div className="search-bar">
            <div className="search-bar-header">
                <input
                    type="text"
                    placeholder="Search for friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="info-icon" onClick={toggleTooltip} ref={infoIconRef}>
                    <FontAwesomeIcon icon={faInfoCircle} />
                    {tooltipVisible && (
                        <div className={`tooltip ${tooltipPosition} ${tooltipVisible ? 'show' : ''}`}>
                            Psst! Usernames are case-sensitive.
                        </div>
                    )}
                </div>
                {searchQuery && (
                    <button className="cancel-search" onClick={handleCancel}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                )}
            </div>
            <div className="search-buttons">
                <button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
                    Search
                </button>
            </div>
            <div className="search-results">
                {loading ? <p>Loading...</p> : (
                    searchResults.map(friend => (
                        <div key={friend.id} className="search-result">
                            <span>{friend.displayName}</span>
                            <div className="buttons">
                                <button className="view" onClick={() => handleView(friend.id)}>View</button>
                                <button 
                                    className="add" 
                                    onClick={() => handleSelect(friend)}
                                    disabled={isAdding} // Disable while adding
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {isAdding && (
                <div className="modal">
                    <div className="modal-content">
                        <p>Processing...</p>
                        <div className="loader"></div> {/* Add your loader here */}
                    </div>
                </div>
            )}
            {addSuccess && !isAdding && (
                <div className="modal">
                    <div className="modal-content">
                        <p>Friend added successfully!</p>
                        <button onClick={() => setAddSuccess(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SearchBar;
