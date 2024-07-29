import React, { useState, useRef, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import './SearchBar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

function SearchBar({ onFriendSelect, onFriendAdded }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState('bottom');
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
            const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching users:', error);
        }
        setLoading(false);
    };

    const handleSelect = async (friend) => {
        try {
            const friendId = friend.id;

            // Retrieve full friend details from Firestore
            const friendDocRef = doc(db, 'users', friendId);
            const friendDoc = await getDoc(friendDocRef);
            const friendData = friendDoc.data();

            if (!friendData) {
                throw new Error('Friend data not found');
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

            // Create the selected friend's node in the current user's node collection
            await setDoc(doc(db, `users/${currentUser.uid}/nodes/${friendId}`), {
                id: friendId,
                label: friendData.displayName,
                profilePicture: friendData.profilePicture,
                connections: [currentUser.uid]
            });

            // Create the current user's node in the selected friend's node collection
            const currentUserDataRef = doc(db, 'users', currentUser.uid);
            const currentUserData = await getDoc(currentUserDataRef);
            const currentUserDetails = currentUserData.data();

            await setDoc(doc(db, `users/${friendId}/nodes/${currentUser.uid}`), {
                id: currentUser.uid,
                label: currentUserDetails.displayName,
                profilePicture: currentUserDetails.profilePicture,
                connections: [friendId]
            });

            // // Pass the friend's full details to the parent component
            // onFriendSelect({
            //     id: friendId,
            //     displayName: friendData.displayName,
            //     profilePicture: friendData.profilePicture,
            //     connections: friendData.connections || []
            // });

            // Notify the parent component to refresh the graph
            onFriendAdded();

            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            console.error('Error adding friend:', error);
        }
    };

    const handleView = (friendId) => {
        navigate(`/user/${friendId}`);
    };

    const toggleTooltip = () => {
        setTooltipVisible(prev => !prev);
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
            </div>
            <button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
                Search
            </button>
            <div className="search-results">
                {loading ? <p>Loading...</p> : (
                    searchResults.map(friend => (
                        <div key={friend.id} className="search-result">
                            <span>{friend.displayName}</span>
                            <div className="buttons">
                                <button className="view" onClick={() => handleView(friend.id)}>View</button>
                                <button className="add" onClick={() => handleSelect(friend)}>Add</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default SearchBar;
