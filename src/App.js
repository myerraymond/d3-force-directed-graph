import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import MainPage from './pages/MainPage';
import data from './components/data.json';
import UserGraphPage from './pages/UserGraphPage';
import Discover from './pages/Discover';
import ProfilePage from './pages/ProfilePage';

function App() {
    const [graphData, setGraphData] = useState(data);

    const handleAddNode = (nodeName) => {
        // Example logic to add a new node
        const newNode = { id: graphData.nodes.length + 1, name: nodeName };
        const newNodes = [...graphData.nodes, newNode];
        const newLinks = [...graphData.links]; // Add links as needed

        setGraphData({ nodes: newNodes, links: newLinks });
    };

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/main" element={<MainPage handleAddNode={handleAddNode} />} />
                <Route path="*" element={<Navigate to="/" />} />
                <Route path="/user/:userId" element={<UserGraphPage />} />
                <Route path="/discover" Component={Discover} />
                <Route path="/profile" Component={ProfilePage} />
            </Routes>
        </Router>
    );
}

export default App;
