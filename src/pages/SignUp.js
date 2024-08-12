import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './SignUp.css';

function SignUp() {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // Added confirmPassword state
    const [username, setUsername] = useState('');
    const [profilePicture, setProfilePicture] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (allowedTypes.includes(file.type)) {
                setProfilePicture(file);
                setError(null);
            } else {
                setError('Please upload a valid image file (jpg, png, gif).');
            }
        }
    };

    const isUsernameTaken = async (username) => {
        const usernameDoc = await getDoc(doc(db, 'usernames', username));
        return usernameDoc.exists();
    };

    const isEmailTaken = async (email) => {
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);
        return signInMethods.length > 0;
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (password !== confirmPassword) {
                setError('Passwords do not match.');
                setLoading(false);
                return;
            }

            if (await isEmailTaken(email)) {
                setError('Email is already in use. Please use another email.');
                setLoading(false);
                return;
            }

            if (await isUsernameTaken(username)) {
                setError('Username is already taken. Please choose another one.');
                setLoading(false);
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const fullName = `${firstName} ${lastName}`;
            const shortenedName = `${firstName} ${lastName.charAt(0)}.`;

            let profilePictureURL = '';
            if (profilePicture) {
                const profilePictureRef = ref(storage, `profilePictures/${user.uid}`);
                await uploadBytes(profilePictureRef, profilePicture);
                profilePictureURL = await getDownloadURL(profilePictureRef);
            }

            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                displayName: username,
                fullName: fullName,
                shortenedName: shortenedName,
                profilePicture: profilePictureURL,
            });

            await setDoc(doc(db, 'usernames', username), {
                uid: user.uid
            });

            const primaryNodeRef = doc(db, `users/${user.uid}/nodes`, user.uid);
            await setDoc(primaryNodeRef, {
                label: username,
                profilePicture: profilePictureURL,
                connections: []
            });

            navigate('/main');
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-container">
            <h1>Let's get you started</h1>
            {error && <p className="error">{error}</p>}
            {loading && <p className="loading">Signing up, please wait... Don't refresh this page.</p>}
            <form onSubmit={handleSignUp}>
                <input 
                    type="text" 
                    placeholder="First Name" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    required 
                />
                <input 
                    type="text" 
                    placeholder="Last Name" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                    required 
                />
                <input 
                    type="email" 
                    placeholder="Email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                />
                <input 
                    type="password" 
                    placeholder="Confirm Password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                />
                <input 
                    type="text" 
                    placeholder="Username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                />
                <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange} 
                />
                <button type="submit" disabled={loading}>Sign Up</button>
            </form>
            <div className="links">
                <Link to="/">Home Page</Link>
                <Link to="/login">Login Page</Link>
            </div>
        </div>
    );
}

export default SignUp;
