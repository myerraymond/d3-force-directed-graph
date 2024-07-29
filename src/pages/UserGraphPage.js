import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Import useNavigate
import { collection, doc, getDoc, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import Graph from '../components/Graph'; // Import the Graph component
import { useAuth } from '../AuthContext'; // Import useAuth if needed

function UserGraphPage() {
    const { userId } = useParams();
    const navigate = useNavigate(); // Initialize useNavigate
    const [friendsData, setFriendsData] = useState([]);
    const [userDisplayName, setUserDisplayName] = useState('');
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth(); // Use currentUser from AuthContext

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
        navigate('/main'); // Redirect to the main page or any other page
    };

    const handleAdd = async () => {
        if (!currentUser || !userId) {
            console.error('User not authenticated or userId is missing');
            return;
        }

        try {
            console.log('Current User ID:', currentUser.uid);
            console.log('Selected User ID:', userId);

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
        <div>
            <button onClick={handleBack} style={{ marginBottom: '20px' }}>
                Back
            </button>
            <button onClick={handleAdd} style={{ marginBottom: '20px', marginLeft: '10px' }}>
                Add
            </button>
            <h1>{userDisplayName}'s Network</h1>
            <Graph userId={userId} friends={friendsData.map(friend => friend.id)} />
        </div>
    );
}

export default UserGraphPage;
