import * as functions from 'firebase-functions';
import { findMutualConnections } from './mutualConnections';

export const updateMutualConnections = functions.pubsub.schedule('every 5 minutes').onRun(async () => {
    await findMutualConnections();
});
