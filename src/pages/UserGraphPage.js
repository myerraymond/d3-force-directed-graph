// src/pages/UserGraphPage.js

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import Graph from '../components/Graph'; // Import the Graph component

function UserGraphPage() {
    const { userId } = useParams();
    const [friendsData, setFriendsData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFriendsData = async () => {
            try {
                const friendsRef = collection(db, `users/${userId}/friends`);
                const friendsSnapshot = await getDocs(friendsRef);
                const friends = friendsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFriendsData(friends);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching friends data:', error);
                setLoading(false);
            }
        };

        fetchFriendsData();
    }, [userId]);

    if (loading) {
        return <p>Loading...</p>;
    }

    return (
        <div>
            <h1>{userId}'s Friends</h1>
            <Graph userId={userId} friends={friendsData.map(friend => friend.id)} />
        </div>
    );
}

export default UserGraphPage;
