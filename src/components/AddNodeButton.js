import React, { useState, useEffect } from 'react';
import './AddNodeButton.css';
import { db } from '../firebase';
import { collection, doc, updateDoc, arrayUnion, getDocs } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

function AddNodeButton({ onAddNode }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [nodes, setNodes] = useState([]);
    const [selectedNode1, setSelectedNode1] = useState('');
    const [selectedNode2, setSelectedNode2] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const { currentUser } = useAuth();

    useEffect(() => {
        if (isModalOpen) {
            loadNodes();
        }
    }, [isModalOpen]);

    const loadNodes = async () => {
        setIsLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, `users/${currentUser.uid}/nodes`));
            const nodesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNodes(nodesList);
            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            console.error("Error loading nodes: ", error);
        }
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedNode1('');
        setSelectedNode2('');
        setIsLoading(false);
        setSuccessMessage(''); // Clear the success message when closing the modal
    };

    const handleAddConnectionClick = async () => {
        if (selectedNode1 && selectedNode2 && selectedNode1 !== selectedNode2) {
            setIsLoading(true);
            try {
                const nodeRef1 = doc(db, `users/${currentUser.uid}/nodes/${selectedNode1}`);
                const nodeRef2 = doc(db, `users/${currentUser.uid}/nodes/${selectedNode2}`);
                
                await updateDoc(nodeRef1, {
                    connections: arrayUnion(selectedNode2)
                });

                await updateDoc(nodeRef2, {
                    connections: arrayUnion(selectedNode1)
                });

                onAddNode({ id: selectedNode1 }, { id: selectedNode2 });

                // Display success message
                setSuccessMessage('Connection successfully added!');
                
                // Log for debugging
                console.log('Success message set:', 'Connection successfully added!');
                
                // Clear the form and success message after a delay
                setTimeout(() => {
                    handleCloseModal(); // Close the modal
                }, 2000); // Keep the success message for 2 seconds

                setIsLoading(false);
            } catch (error) {
                setIsLoading(false);
                console.error("Error adding connection: ", error);
            }
        }
    };

    return (
        <>
            <button className="add-node-btn" onClick={handleOpenModal}>+</button>
            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close" onClick={handleCloseModal}>&times;</span>
                        <h2>Add a connection between nodes</h2>
                        <div className="dropdown-container">
                            <label htmlFor="node1">Select Node 1</label>
                            <select
                                id="node1"
                                value={selectedNode1}
                                onChange={(e) => setSelectedNode1(e.target.value)}
                            >
                                <option value="">Select a node</option>
                                {nodes.map(node => (
                                    <option key={node.id} value={node.id}>{node.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="dropdown-container">
                            <label htmlFor="node2">Select Node 2</label>
                            <select
                                id="node2"
                                value={selectedNode2}
                                onChange={(e) => setSelectedNode2(e.target.value)}
                            >
                                <option value="">Select a node</option>
                                {nodes.map(node => (
                                    <option key={node.id} value={node.id}>{node.label}</option>
                                ))}
                            </select>
                        </div>
                        {successMessage && (
                            <div className="success-message">
                                {successMessage}
                                <button onClick={() => setSuccessMessage('')} className="success-close-btn">&times;</button>
                            </div>
                        )}
                        <button 
                            onClick={handleAddConnectionClick} 
                            disabled={isLoading || !selectedNode1 || !selectedNode2 || selectedNode1 === selectedNode2}
                        >
                            {isLoading ? 'Adding...' : 'Add Connection'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default AddNodeButton;
