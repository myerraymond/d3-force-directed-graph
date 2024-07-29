import React, { useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore'; // Import necessary Firestore functions
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../AuthContext'; // Import useAuth
import './SearchBar.css';

function SearchBar({ onFriendSelect }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); // Initialize useNavigate
    const { currentUser } = useAuth(); // Access current user

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

            // Pass the friend's full details to the parent component
            onFriendSelect({
                id: friendId,
                displayName: friendData.displayName,
                profilePicture: friendData.profilePicture,
                connections: friendData.connections || [] // Ensure connections field exists
            });

            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            console.error('Error adding friend:', error);
        }
    };

    const handleView = (friendId) => {
        navigate(`/user/${friendId}`); // Route to the new page
    };

    return (
        <div className="search-bar">
            <input
                type="text"
                placeholder="Search for friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
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
