// src/hooks/useUserData.js
import { useEffect, useState } from 'react';
import { firestore } from '../firebase';

const useUserData = (userId) => {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    const unsubscribe = firestore.collection('users').doc(userId)
      .onSnapshot(doc => {
        const data = doc.data();
        if (data) {
          setNodes(data.nodes);
          setLinks(data.links);
        }
      });

    return () => unsubscribe();
  }, [userId]);

  return { nodes, links };
};

export default useUserData;
