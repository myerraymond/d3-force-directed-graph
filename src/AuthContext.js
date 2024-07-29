import React, { useContext, useState, useEffect } from 'react';
import { auth } from './firebase'; // Import Firebase auth instance

// Create AuthContext
const AuthContext = React.createContext();

// Custom hook to use AuthContext
export const useAuth = () => {
    return useContext(AuthContext);
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Firebase auth state change listener
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe; // Cleanup function
    }, []);

    // Function to sign up user with email and password
    const signUp = async (email, password) => {
        return auth.createUserWithEmailAndPassword(email, password);
    };

    // Function to log in user with email and password
    const logIn = async (email, password) => {
        return auth.signInWithEmailAndPassword(email, password);
    };

    // Function to log out user
    const logOut = () => {
        return auth.signOut();
    };

    // Value provided by AuthContext
    const value = {
        currentUser,
        signUp,
        logIn,
        logOut
    };

    // Render AuthContext.Provider with children components
    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
