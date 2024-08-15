import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './SignUp.css';
import logo from '../assets/logo.png'; // Import the logo image

function SignUp() {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [profilePicture, setProfilePicture] = useState(null);
    const [emailError, setEmailError] = useState(null);
    const [usernameError, setUsernameError] = useState(null);
    const [passwordError, setPasswordError] = useState(null);
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

    const validateEmailFormat = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const isUsernameTaken = async (username) => {
        const usernameDoc = await getDoc(doc(db, 'usernames', username));
        return usernameDoc.exists();
    };

    const isEmailTaken = async (email) => {
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);
        return signInMethods.length > 0;
    };

    const checkEmail = async (email) => {
        if (!validateEmailFormat(email)) {
            setEmailError('Please enter a valid email.');
            return;
        }
    
        try {
            const emailTaken = await isEmailTaken(email);
            if (emailTaken) {
                setEmailError('Email is already in use.');
            } else {
                setEmailError(null);
            }
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                setEmailError('Email is already in use.');
            } else {
                setEmailError('An error occurred. Please try again.');
            }
        }
    };
    
    const checkUsername = async (username) => {
        if (username === '') {
            setUsernameError(null);
            return;
        }

        const usernameTaken = await isUsernameTaken(username);
        if (usernameTaken) {
            setUsernameError('Username is already taken.');
        } else {
            setUsernameError(null);
        }
    };

    const handleEmailChange = async (e) => {
        const newEmail = e.target.value;
        setEmail(newEmail);
        await checkEmail(newEmail);
    };

    const handleUsernameChange = async (e) => {
        const newUsername = e.target.value;
        setUsername(newUsername);
        await checkUsername(newUsername);
    };

    const handlePasswordChange = (e) => {
        const newPassword = e.target.value;
        setPassword(newPassword);

        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match.');
        } else {
            setPasswordError(null);
        }
    };

    const handleConfirmPasswordChange = (e) => {
        const newConfirmPassword = e.target.value;
        setConfirmPassword(newConfirmPassword);

        if (newConfirmPassword !== password) {
            setPasswordError('Passwords do not match.');
        } else {
            setPasswordError(null);
        }
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

            if (emailError || usernameError) {
                setError('Please fix the errors before submitting.');
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
            <img src={logo} alt="logo" className="logo" /> {/* Display the logo */}
            {error && <p className="error">{error}</p>}
            {loading && <p className="loading">Signing up, please wait... Don't refresh this page.</p>}
            <form onSubmit={handleSignUp}>
                <p className="required-fields">All fields are required</p>
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
                    onChange={handleEmailChange}
                    required
                />
                {emailError && <p className="error">{emailError}</p>}
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                />
                <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    required
                />
                {passwordError && <p className="error">{passwordError}</p>}
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={handleUsernameChange}
                    required
                />
                {usernameError && <p className="error">{usernameError}</p>}
                <input type="file" onChange={handleFileChange} />
                <button type="submit" disabled={loading}>Sign Up</button>
            </form>
            <Link to="/login" className="login-link">Already have an account? Log in here</Link>
        </div>
    );
}

export default SignUp;
