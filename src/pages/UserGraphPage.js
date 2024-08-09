import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
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

            // Reference to the current user's primary node
            const userNodeRef = doc(db, `users/${currentUser.uid}/nodes/${currentUser.uid}`);
            // Reference to the selected user's primary node
            const selectedUserNodeRef = doc(db, `users/${userId}/nodes/${userId}`);

            // Add the selected user to the current user's connections
            await updateDoc(userNodeRef, {
                connections: arrayUnion(userId)
            });

            // Add the current user to the selected user's connections
            await updateDoc(selectedUserNodeRef, {
                connections: arrayUnion(currentUser.uid)
            });

            // Create the selected user's node in the current user's node collection
            await setDoc(doc(db, `users/${currentUser.uid}/nodes/${userId}`), {
                id: userId,
                label: selectedUserData.displayName,
                profilePicture: selectedUserData.profilePicture,
                connections: [currentUser.uid]
            });

            // Create the current user's node in the selected user's node collection
            await setDoc(doc(db, `users/${userId}/nodes/${currentUser.uid}`), {
                id: currentUser.uid,
                label: currentUserData.displayName,
                profilePicture: currentUserData.profilePicture,
                connections: [userId]
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
