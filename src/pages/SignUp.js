import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';  // Import Firebase services
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './SignUp.css';

function SignUp() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [profilePicture, setProfilePicture] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const defaultFriendProfilePictureURL = '../../1.png'; // Set this to your actual default image URL

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setProfilePicture(e.target.files[0]);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true); // Set loading to true when signup starts
        try {
            // Create user with email and password
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Upload profile picture to Firebase Storage
            let profilePictureURL = '';
            if (profilePicture) {
                const profilePictureRef = ref(storage, `profilePictures/${user.uid}`);
                await uploadBytes(profilePictureRef, profilePicture);
                profilePictureURL = await getDownloadURL(profilePictureRef);
            }

            // Save user data to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                displayName: username,
                profilePicture: profilePictureURL,
            });

            // Create primary node for the user with user's UID as the node ID
            const primaryNodeRef = doc(db, `users/${user.uid}/nodes`, user.uid);
            await setDoc(primaryNodeRef, {
                label: `${username}`,
                profilePicture: profilePictureURL,
                connections: []
            });

            // Create an initial friend node titled "friend"
            await addDoc(collection(db, `users/${user.uid}/nodes`), {
                label: 'friend',
                profilePicture: defaultFriendProfilePictureURL,
                connections: [user.uid]  // Connect to the primary node
            });

            // Redirect to the main page
            navigate('/main');
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false); // Set loading to false after signup completes
        }
    };

    return (
        <div className="signup-container">
            <h1>Sign Up Page</h1>
            {error && <p className="error">{error}</p>}
            {loading && <p className="loading">Signing up, please wait... Don't refresh this page.</p>}
            <form onSubmit={handleSignUp}>
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <input type="file" onChange={handleFileChange} />
                <button type="submit" disabled={loading}>Sign Up</button>
            </form>
            <div className="links">
                <Link to="/">Back</Link>
                <Link to="/login">Login</Link>
            </div>
        </div>
    );
}

export default SignUp;
