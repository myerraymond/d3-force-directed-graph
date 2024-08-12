import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import FriendsGraph from '../components/FriendsGraph';
import { useAuth } from '../AuthContext';
import './UserGraphPage.css'; // Import the CSS file

function UserGraphPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [friendsData, setFriendsData] = useState([]);
    const [userDisplayName, setUserDisplayName] = useState('');
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Fetch the user's display name
                const userRef = doc(db, 'users', userId);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    setUserDisplayName(userDoc.data().displayName);
                } else {
                    console.error('User not found');
                }

                // Fetch the user's friends data
                const friendsRef = collection(db, `users/${userId}/nodes`);
                const friendsSnapshot = await getDocs(friendsRef);
                const friends = friendsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFriendsData(friends);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching user data:', error);
                setLoading(false);
            }
        };

        fetchUserData();
    }, [userId]);

    const handleBack = () => {
        navigate('/main');
    };

    const handleAdd = async () => {
        if (!currentUser || !userId) {
            console.error('User not authenticated or userId is missing');
            return;
        }
    
        try {
            // Retrieve current user data
            const currentUserRef = doc(db, 'users', currentUser.uid);
            const currentUserDoc = await getDoc(currentUserRef);
            const currentUserData = currentUserDoc.data();
    
            // Retrieve selected user data
            const selectedUserRef = doc(db, 'users', userId);
            const selectedUserDoc = await getDoc(selectedUserRef);
            const selectedUserData = selectedUserDoc.data();
    
            if (!currentUserData || !selectedUserData) {
                throw new Error('User data not found');
            }
    
            // Reference to the current user's node connections
            const userNodeRef = doc(db, `users/${currentUser.uid}/nodes/${userId}`);
    
            // Add the selected user to the current user's connections
            await setDoc(userNodeRef, {
                id: userId,
                label: selectedUserData.displayName,
                profilePicture: selectedUserData.profilePicture,
                connections: [currentUser.uid] // Include the current user's ID
            });
    
             // Store a notification in the selected user's database
             const notificationRef = doc(db, `users/${userId}/notifications/${currentUser.uid}`);
             await setDoc(notificationRef, {
                 type: 'new_connection',
                 message: `${currentUserData.displayName} has added you.`,
                 timestamp: new Date(),
                 userId: currentUser.uid,
                 profilePicture: currentUserData.profilePicture, // Include the profile picture
                 additionalInfo: {
                     // You can add more details here if needed
                     email: currentUserData.email,
                     displayName: currentUserData.displayName,
                 }
             });
    
            alert('User added successfully!');
        } catch (error) {
            console.error('Error adding user:', error);
            alert('Failed to add user. Please try again.');
        }
    };

    if (loading) {
        return <p>Loading...</p>;
    }

    return (
        <div className="user-graph-page">
            <div className="header">
                <button onClick={handleBack}>
                    Back
                </button>
                <button onClick={handleAdd}>
                    Add
                </button>
                <h1>{userDisplayName}'s Network</h1>
            </div>
            <FriendsGraph userId={userId} friends={friendsData.map(friend => friend.id)} />
        </div>
    );
}

export default UserGraphPage;
