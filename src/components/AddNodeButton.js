import React, { useState } from 'react';
import './AddNodeButton.css';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

function AddNodeButton({ handleAddNode }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { currentUser } = useAuth();

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSearchQuery('');
        setIsLoading(false);
    };

    const handleAddNodeClick = async () => {
        try {
            if (searchQuery.trim() !== '') {
                setIsLoading(true);

                const newNode = {
                    label: searchQuery.trim(),
                    profilePicture: '',
                    connections: []  // Initialize connections as an empty array
                };

                // Add new node
                const nodeRef = await addDoc(collection(db, `users/${currentUser.uid}/nodes`), newNode);
                newNode.id = nodeRef.id;

                // Update the current user's node to add the new node's ID to connections
                const userNodeRef = doc(db, `users/${currentUser.uid}/nodes/${currentUser.uid}`);
                await updateDoc(userNodeRef, {
                    connections: arrayUnion(nodeRef.id)
                });

                // Update the new node to include the current user in its connections
                await updateDoc(nodeRef, {
                    connections: arrayUnion(currentUser.uid)
                });

                handleAddNode(newNode);
                setIsLoading(false);
                handleCloseModal();
            }
        } catch (error) {
            setIsLoading(false);
            console.error("Error adding node: ", error);
        }
    };

    return (
        <>
            <button className="add-node-btn" onClick={handleOpenModal}>+</button>
            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close" onClick={handleCloseModal}>&times;</span>
                        <h2>Add a connection</h2>
                        <input
                            type="text"
                            placeholder="New Connection Name"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button onClick={handleAddNodeClick}>
                            {isLoading ? 'Adding...' : 'Add Connection'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default AddNodeButton;
