import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
    const navigate = useNavigate();

    const handleLogin = () => {
        // Handle login logic here, then redirect to the main page
        navigate('/main');
    };

    return (
        <div className="login-container">
            <h1>Login Page</h1>
            <form>
                <input type="text" placeholder="Username" />
                <input type="password" placeholder="Password" />
                <button onClick={handleLogin}>Login</button>
            </form>
            <div className="links">
                <Link to="/">Back</Link>
                <Link to="/signup">Sign Up</Link>
            </div>
        </div>
    );
}

export default Login;
