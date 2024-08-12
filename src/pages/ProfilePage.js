import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';

function ProfilePage() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profilePicUrl, setProfilePicUrl] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [loadingNotificationId, setLoadingNotificationId] = useState(null); // New state for loading notification

    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userId = auth.currentUser.uid;
                const userRef = doc(db, `users/${userId}`);
                const userDoc = await getDoc(userRef);

                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setUserData(data);
                    setProfilePicUrl(data.profilePicture || '');
                }

                // Fetch notifications for the user
                const notificationsRef = collection(db, `users/${userId}/notifications`);
                const notificationsSnapshot = await getDocs(notificationsRef);
                const notificationsList = notificationsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setNotifications(notificationsList);

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
            const storageRef = ref(storage, `profilePictures/${auth.currentUser.uid}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                'state_changed',
                null,
                (error) => {
                    console.error('Error uploading profile picture:', error);
                },
                async () => {
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

    const handleAddBack = async (notificationId) => {
        setLoadingNotificationId(notificationId); // Set loading state for the specific notification

        try {
            const userId = auth.currentUser.uid;
            const notificationRef = doc(db, `users/${userId}/notifications/${notificationId}`);
            const notificationDoc = await getDoc(notificationRef);
            const notificationData = notificationDoc.data();

            // Add the notification back to the user's collection
            await addDoc(collection(db, `users/${userId}/notifications`), {
                message: notificationData.message,
                displayName: notificationData.displayName,
                email: notificationData.email,
                profilePicture: notificationData.profilePicture,
                timestamp: notificationData.timestamp,
                type: notificationData.type,
                userId: notificationData.userId
            });

            // Delete the notification from the current notifications
            await deleteDoc(notificationRef);

            setNotifications(prevNotifications => prevNotifications.filter(notification => notification.id !== notificationId));
        } catch (error) {
            console.error('Error adding notification back:', error);
        } finally {
            setLoadingNotificationId(null); // Reset loading state
        }
    };

    const handleCloseNotification = async (notificationId) => {
        try {
            await deleteDoc(doc(db, `users/${auth.currentUser.uid}/notifications`, notificationId));
            setNotifications(prevNotifications => prevNotifications.filter(notification => notification.id !== notificationId));
        } catch (error) {
            console.error('Error closing notification:', error);
        }
    };

    if (loading) {
        return <p>Loading...</p>;
    }

    function SettingsOption() {
        return (
            <div className="option-section">
                <h3>Settings</h3>
                <p>Adjust your application settings here.</p>
                {/* Add any settings-related options or forms here */}
            </div>
        );
    }

    function HelpSection() {
        return (
            <div className="option-section">
                <h3>Help</h3>
                <p>Find answers to common questions.</p>
                {/* Add FAQ, support links, or contact forms here */}
            </div>
        );
    }

    return (
        <div className="profile-page">
            <button className="back-button" onClick={() => navigate(-1)}>
                Back
            </button>
            <div className="scrollable-content">

                {userData ? (
                    <div className="profile-info">
                        <div className="profile-pic-container">
                            <img
                                src={profilePicUrl || 'default-profile-pic-url'}
                                alt="Profile"
                                className="profile-pic"
                            />
                            <label htmlFor="profile-pic-input" className="profile-pic-label">
                                Change Profile Picture
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleProfilePicChange}
                                id="profile-pic-input"
                                className="profile-pic-input"
                            />
                        </div>
                        <h2>{userData.displayName}</h2>
                        <p>Email: {userData.email}</p>

                        <div className="notifications-section">
                            <h3>Notifications</h3>
                            <div className="scrollable-content">

                                {notifications.length > 0 ? (
                                    <ul className="notifications-list">
                                        {notifications.map((notification) => (
                                            <li key={notification.id} className="notification-item">
                                                <img
                                                    src={notification.profilePicture || 'default-profile-pic-url'}
                                                    alt={notification.displayName}
                                                    className="notification-profile-pic"
                                                />
                                                <div className="notification-text">
                                                    <strong>{notification.displayName}</strong> {notification.message}
                                                    <p className="notification-email">{notification.email}</p>
                                                    <p className="notification-timestamp">{notification.timestamp}</p>
                                                </div>
                                                <div className="notification-actions">
                                                    {loadingNotificationId === notification.id ? (
                                                        <span className="loading-spinner">Loading...</span>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className="notification-button"
                                                                onClick={() => handleAddBack(notification.id)}
                                                            >
                                                                Add Back
                                                            </button>
                                                            <button
                                                                className="notification-button notification-close"
                                                                onClick={() => handleCloseNotification(notification.id)}
                                                            >
                                                                Close
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>No notifications available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <p>No user data found.</p>
                )}

                <div className="more-options">
                    <h2>More Options</h2>
                    <SettingsOption />
                    <HelpSection />
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;
