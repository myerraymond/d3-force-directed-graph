// src/scripts/findMutualConnections.js
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';

export async function findMutualConnections(userId) {
    const userConnectionsRef = collection(db, `users/${userId}/nodes`);
    const userConnectionsSnapshot = await getDocs(userConnectionsRef);

    const connections = userConnectionsSnapshot.docs.map(doc => doc.id);

    for (const connectionId of connections) {
        const connectionNodeRef = collection(db, `users/${connectionId}/nodes`);
        const connectionNodeSnapshot = await getDocs(connectionNodeRef);

        for (const connectionNode of connectionNodeSnapshot.docs) {
            const mutualConnectionId = connectionNode.id;
            if (mutualConnectionId !== userId && !connections.includes(mutualConnectionId)) {
                await updateDoc(doc(db, `users/${userId}/nodes/${connectionId}`), {
                    connections: arrayUnion(mutualConnectionId)
                });
                await updateDoc(doc(db, `users/${mutualConnectionId}/nodes/${userId}`), {
                    connections: arrayUnion(connectionId)
                });
            }
        }
    }
}
