import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase'; // Make sure this path points to your firebase config file
import './Login.css';
import logo from '../assets/logo.png'; // Import the logo image

function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [resetMessage, setResetMessage] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResetMessage(null);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/main');
        } catch (error) {
            setError('Failed to log in. Please check your credentials and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!email) {
            setError('Please enter your email to reset your password.');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            setResetMessage('Password reset email sent. Please check your inbox.');
            setError(null);
        } catch (error) {
            setError('Failed to send password reset email. Please try again.');
        }
    };

    return (
        <div className="login-container">
            <img src={logo} alt="logo" className="logo" /> {/* Display the logo */}
            {error && <p className="error">{error}</p>}
            {resetMessage && <p className="reset-message">{resetMessage}</p>}
            <form onSubmit={handleLogin}>
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
                <button type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <button className="forgot-password-link" onClick={handlePasswordReset}>
                Forgot Password?
            </button>
            <div className="links">
                <Link to="/" className="back-link">Back</Link>
                <Link to="/signup" className="signup-link">Sign Up</Link>
            </div>
        </div>
    );
}

export default Login;
