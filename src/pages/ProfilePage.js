import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../firebase'; // Import Firebase functions
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Import storage functions
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import './ProfilePage.css';

function ProfilePage() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profilePicUrl, setProfilePicUrl] = useState('');

    const navigate = useNavigate(); // Initialize useNavigate

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userId = auth.currentUser.uid;
                const userRef = doc(db, `users/${userId}`);
                const userDoc = await getDoc(userRef);

                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setUserData(data);
                    setProfilePicUrl(data.profilePicture || ''); // Set profile picture URL from Firestore
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching user data:', error);
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleProfilePicChange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            // Upload the file to Firebase Storage
            const storageRef = ref(storage, `profilePictures/${auth.currentUser.uid}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                'state_changed',
                null,
                (error) => {
                    console.error('Error uploading profile picture:', error);
                },
                async () => {
                    // Get the download URL and update Firestore
                    const newProfilePicUrl = await getDownloadURL(uploadTask.snapshot.ref);

                    try {
                        const userId = auth.currentUser.uid;
                        const userRef = doc(db, `users/${userId}`);
                        await updateDoc(userRef, { profilePicture: newProfilePicUrl });
                        setProfilePicUrl(newProfilePicUrl);
                    } catch (error) {
                        console.error('Error updating profile picture URL:', error);
                    }
                }
            );
        }
    };

    if (loading) {
        return <p>Loading...</p>;
    }

    return (
        <div className="profile-page">
            <button
                className="back-button"
                onClick={() => navigate(-1)}
            >
            </button>
            {userData ? (
                <div className="profile-info">
                    <div className="profile-pic-container">
                        <img
                            src={profilePicUrl || 'default-profile-pic-url'} // Use URL from Firestore
                            alt="Profile"
                            className="profile-pic"
                        />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePicChange}
                            className="profile-pic-input"
                        />
                    </div>
                    <h2>{userData.displayName}</h2>
                    <p>Email: {userData.email}</p>
                    {/* Add more user details as needed */}
                </div>
            ) : (
                <p>No user data found.</p>
            )}
        </div>
    );
}

export default ProfilePage;
