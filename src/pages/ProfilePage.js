import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';

function ProfilePage() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profilePicUrl, setProfilePicUrl] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [loadingNotificationId, setLoadingNotificationId] = useState(null);

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
                const notificationsList = notificationsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        timestamp: data.timestamp.toDate().toLocaleString(),
                    };
                });

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
        if (!auth.currentUser) {
            console.error('User not authenticated');
            return;
        }

        try {
            const currentUserId = auth.currentUser.uid;
            const notificationRef = doc(db, `users/${currentUserId}/notifications/${notificationId}`);
            const notificationDoc = await getDoc(notificationRef);
            const notificationData = notificationDoc.data();

            if (!notificationData) {
                throw new Error('Notification data not found');
            }

            // Reference to the current user's node connections
            const userNodeRef = doc(db, `users/${currentUserId}/nodes/${notificationData.userId}`);

            // Add the selected user to the current user's connections
            await setDoc(userNodeRef, {
                id: notificationData.userId,
                label: notificationData.displayName,
                profilePicture: notificationData.profilePicture,
                connections: [currentUserId] // Include the current user's ID
            });

            // Store a notification in the selected user's database
            const selectedUserRef = doc(db, `users/${notificationData.userId}/notifications/${currentUserId}`);
            await setDoc(selectedUserRef, {
                type: 'new_connection',
                message: `${userData.displayName} has added you.`,
                timestamp: new Date(),
                userId: currentUserId,
                profilePicture: userData.profilePicture,
                additionalInfo: {
                    email: userData.email,
                    displayName: userData.displayName,
                }
            });

            // Delete the notification from the current notifications
            await deleteDoc(notificationRef);

            alert('User added successfully!');
        } catch (error) {
            console.error('Error adding user:', error);
            alert('Failed to add user. Please try again.');
        }
    };

    const handleDeleteNotification = async (notificationId) => {
        setLoadingNotificationId(notificationId);

        try {
            const userId = auth.currentUser.uid;
            const notificationRef = doc(db, `users/${userId}/notifications/${notificationId}`);
            await deleteDoc(notificationRef);

            setNotifications(notifications.filter(notification => notification.id !== notificationId));
            setLoadingNotificationId(null);
        } catch (error) {
            console.error('Error deleting notification:', error);
            setLoadingNotificationId(null);
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
                            {notifications.length === 0 ? (
                                <p>You'll be notified here when someone adds you as a friend!</p>
                            ) : (
                                <ul className="notifications-list">
                                    {notifications.map(notification => (
                                        <li key={notification.id} className="notification-item">
                                            <img className="notification-profile-pic" src={notification.profilePicture || 'https://via.placeholder.com/50'} alt="Profile" />
                                            <div className="notification-text">
                                                <p><strong>{notification.displayName}</strong></p>
                                                <p>{notification.message}</p>
                                                <p className="notification-timestamp">{notification.timestamp}</p>
                                            </div>
                                            <div className="notification-actions">
                                                <button
                                                    className="notification-button"
                                                    onClick={() => handleAddBack(notification.id)}
                                                    disabled={loadingNotificationId === notification.id}
                                                >
                                                    {loadingNotificationId === notification.id ? 'Adding...' : 'Add Back'}
                                                </button>
                                                <button
                                                    className="notification-button notification-close"
                                                    onClick={() => handleCloseNotification(notification.id)}
                                                    disabled={loadingNotificationId === notification.id}
                                                >
                                                    {loadingNotificationId === notification.id ? 'Deleting...' : 'Delete'}
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                ) : (
                    <p>No user data found.</p>
                )}
            </div>
        </div>
    );
}

export default ProfilePage;
