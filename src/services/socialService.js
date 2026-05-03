import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDoc 
} from 'firebase/firestore';

/**
 * Helper to safely fetch user data (so we can display real usernames)
 */
const fetchUserData = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
  } catch (error) {
    console.warn("Failed to fetch user data for", uid, error);
  }
  return { username: 'Unknown Agent', friendCode: 'XXXXXX' };
};

/**
 * Sends a friend request to a target friend code.
 */
export const sendFriendRequest = async (currentUid, targetFriendCode) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('friendCode', '==', targetFriendCode.toUpperCase()));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error('Target friend code not found.');
  }

  const targetUserDoc = querySnapshot.docs[0];
  const targetUserUid = targetUserDoc.id;

  if (targetUserUid === currentUid) {
    throw new Error('You cannot wire a request to yourself.');
  }

  const friendshipsRef = collection(db, 'friendships');
  
  // Check if current user already sent to target
  const check1 = query(friendshipsRef, where('senderId', '==', currentUid), where('receiverId', '==', targetUserUid));
  const check1Snap = await getDocs(check1);
  if (!check1Snap.empty) {
    throw new Error('Request already sent or connection exists.');
  }

  // Check if target already sent to current user
  const check2 = query(friendshipsRef, where('senderId', '==', targetUserUid), where('receiverId', '==', currentUid));
  const check2Snap = await getDocs(check2);
  if (!check2Snap.empty) {
    throw new Error('They already sent you a request. Check Pending Wires.');
  }

  // Create the pending friendship document
  await addDoc(friendshipsRef, {
    senderId: currentUid,
    receiverId: targetUserUid,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
};

/**
 * Listens to incoming pending friend requests for the current user.
 */
export const listenToPendingRequests = (currentUid, callback) => {
  const q = query(
    collection(db, 'friendships'),
    where('receiverId', '==', currentUid),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, async (snapshot) => {
    // We must fetch the sender's username so the UI isn't just UIDs
    const requestsPromises = snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const senderData = await fetchUserData(data.senderId);
      return {
        id: docSnap.id,
        ...data,
        senderUsername: senderData.username,
        senderFriendCode: senderData.friendCode
      };
    });

    const requests = await Promise.all(requestsPromises);
    callback(requests);
  });
};

/**
 * Accepts a pending friend request.
 */
export const acceptFriendRequest = async (friendshipDocId) => {
  const docRef = doc(db, 'friendships', friendshipDocId);
  await updateDoc(docRef, { 
    status: 'accepted',
    acceptedAt: new Date().toISOString()
  });
};

/**
 * Listens to accepted friendships where the user is either the sender or receiver.
 * Since Firestore doesn't easily support OR queries across different fields with complex indexes,
 * we use two separate listeners and merge the results.
 */
export const listenToFriendsList = (currentUid, callback) => {
  let senderFriends = [];
  let receiverFriends = [];

  const notify = async () => {
    const combined = [...senderFriends, ...receiverFriends];
    
    // Fetch user data for the friend (whoever is not the current user)
    const populatedPromises = combined.map(async (f) => {
      const friendUid = f.senderId === currentUid ? f.receiverId : f.senderId;
      const friendData = await fetchUserData(friendUid);
      return {
        id: f.id,
        friendUid,
        username: friendData.username,
        friendCode: friendData.friendCode,
        status: f.status
      };
    });

    const populated = await Promise.all(populatedPromises);
    callback(populated);
  };

  const q1 = query(collection(db, 'friendships'), where('senderId', '==', currentUid), where('status', '==', 'accepted'));
  const unsub1 = onSnapshot(q1, (snap) => {
    senderFriends = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    notify();
  });

  const q2 = query(collection(db, 'friendships'), where('receiverId', '==', currentUid), where('status', '==', 'accepted'));
  const unsub2 = onSnapshot(q2, (snap) => {
    receiverFriends = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    notify();
  });

  // Return a function to unsubscribe from both listeners
  return () => {
    unsub1();
    unsub2();
  };
};
