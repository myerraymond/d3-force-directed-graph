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
    const [successMessage, setSuccessMessage] = useState(''); const infoIconRef = useRef(null);
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
        setSuccessMessage('');
        try {
            const friendId = friend.id;
            const friendDocRef = doc(db, 'users', friendId);
            const friendDoc = await getDoc(friendDocRef);
            const friendData = friendDoc.data();
    
            if (!friendData) {
                throw new Error('Friend data not found');
            }
    
            const currentUserRef = doc(db, 'users', currentUser.uid);
            const currentUserDoc = await getDoc(currentUserRef);
            const currentUserData = currentUserDoc.data();
    
            if (!currentUserData) {
                throw new Error('Current user data not found');
            }
    
            const userNodeRef = doc(db, `users/${currentUser.uid}/nodes/${friendId}`);
    
            // Add the selected user to the current user's connections
            await setDoc(userNodeRef, {
                id: friendId,
                label: friendData.displayName,
                profilePicture: friendData.profilePicture,
                connections: [currentUser.uid] // No need to add self to connections
            });
    
            // Store a notification in the selected user's database
            const notificationRef = doc(db, `users/${friendId}/notifications/${currentUser.uid}`);
            await setDoc(notificationRef, {
                displayName: currentUserData.displayName,
                email: currentUserData.email,
                message: `${currentUserData.displayName} has added you to their network.`,
                profilePicture: currentUserData.profilePicture,
                timestamp: new Date(),
                type: 'new_connection',
                userId: currentUser.uid
            });
    
            setSuccessMessage('You have successfully added ' + friend.displayName + '!');
            setAddSuccess(true);
            setSearchQuery('');
            setSearchResults([]);
            onFriendAdded(); // Callback for friend added
    
        } catch (error) {
            console.error('Error adding friend:', error);
        } finally {
            setIsAdding(false);
            setTimeout(() => {
                if (typeof onClose === 'function') {
                    onClose(); // Close the search bar
                }
                window.location.reload(); // Refresh the page
            }, 2000);
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
                            <div className="result-text">
                                <span className="display-name">{friend.displayName}</span>
                                <span className="shortened-name">{friend.shortenedName}</span>
                            </div>
                            <img src={friend.profilePicture} alt={`${friend.displayName} profile`} className="profile-picture" />
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
                        <p>{successMessage}</p>
                        <button onClick={() => setAddSuccess(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SearchBar;
