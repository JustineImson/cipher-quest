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
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { notifyUser } from './notificationService';

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

  // Send push notification to the target user
  const senderData = await fetchUserData(currentUid);
  notifyUser(targetUserUid, {
    title: 'New Friend Request',
    body: `${senderData.username} wants to add you as a friend.`,
    type: 'friend_request',
    link: '/profile',
    senderName: senderData.username,
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
export const acceptFriendRequest = async (friendshipDocId, currentUid) => {
  const docRef = doc(db, 'friendships', friendshipDocId);
  const friendshipSnap = await getDoc(docRef);
  
  await updateDoc(docRef, { 
    status: 'accepted',
    acceptedAt: new Date().toISOString()
  });

  // Notify the original sender that their request was accepted
  if (friendshipSnap.exists()) {
    const { senderId } = friendshipSnap.data();
    const acceptorData = currentUid ? await fetchUserData(currentUid) : { username: 'Someone' };
    notifyUser(senderId, {
      title: 'Friend Request Accepted',
      body: `${acceptorData.username} accepted your friend request!`,
      type: 'friend_accepted',
      link: '/profile',
      senderName: acceptorData.username,
    });
  }
};

/**
 * Listens to accepted friendships where the user is either the sender or receiver.
 * Since Firestore doesn't easily support OR queries across different fields with complex indexes,
 * we use two separate listeners and merge the results.
 */
export const listenToFriendsList = (currentUid, callback) => {
  let senderFriends = [];
  let receiverFriends = [];
  let friendDataCache = {};
  let userListeners = {};

  const notify = () => {
    const combined = [...senderFriends, ...receiverFriends];
    
    const populated = combined.map((f) => {
      const friendUid = f.senderId === currentUid ? f.receiverId : f.senderId;
      const data = friendDataCache[friendUid] || { username: 'Unknown', friendCode: 'XXXXXX', isOnline: false, lastActiveAt: 0 };
      return {
        id: f.id,
        friendUid,
        username: data.username,
        friendCode: data.friendCode,
        status: f.status,
        isOnline: data.isOnline || false,
        lastActiveAt: data.lastActiveAt || 0
      };
    });

    callback(populated);
  };

  const updateFriendListeners = () => {
    const combined = [...senderFriends, ...receiverFriends];
    const currentFriendUids = combined.map(f => f.senderId === currentUid ? f.receiverId : f.senderId);
    
    // Start listeners for new friends
    currentFriendUids.forEach(uid => {
      if (!userListeners[uid]) {
        userListeners[uid] = onSnapshot(doc(db, 'users', uid), (snap) => {
          if (snap.exists()) {
            friendDataCache[uid] = snap.data();
            notify();
          }
        });
      }
    });
    
    // Cleanup listeners for removed friends
    Object.keys(userListeners).forEach(uid => {
      if (!currentFriendUids.includes(uid)) {
        userListeners[uid](); // Unsubscribe
        delete userListeners[uid];
        delete friendDataCache[uid];
      }
    });
    
    notify();
  };

  const q1 = query(collection(db, 'friendships'), where('senderId', '==', currentUid), where('status', '==', 'accepted'));
  const unsub1 = onSnapshot(q1, (snap) => {
    senderFriends = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateFriendListeners();
  });

  const q2 = query(collection(db, 'friendships'), where('receiverId', '==', currentUid), where('status', '==', 'accepted'));
  const unsub2 = onSnapshot(q2, (snap) => {
    receiverFriends = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateFriendListeners();
  });

  // Return a function to unsubscribe from both listeners and all user listeners
  return () => {
    unsub1();
    unsub2();
    Object.values(userListeners).forEach(unsub => unsub());
    userListeners = {};
  };
};

/**
 * Sends a game invite to a verified friend.
 */
export const sendGameInvite = async (senderUid, receiverUid, roomCode) => {
  const invitesRef = collection(db, 'gameInvites');
  
  // Check if there is already a pending invite for this receiver
  const check = query(invitesRef, 
    where('senderId', '==', senderUid), 
    where('receiverId', '==', receiverUid),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(check);
  
  // If there are pending invites, cancel them so the new one can replace it
  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      batch.update(d.ref, { status: 'canceled', resolvedAt: new Date().toISOString() });
    });
    await batch.commit();
  }

  await addDoc(invitesRef, {
    senderId: senderUid,
    receiverId: receiverUid,
    roomCode,
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  // Notify the receiver of the game invite
  const senderData = await fetchUserData(senderUid);
  notifyUser(receiverUid, {
    title: 'Cipher Duel Challenge',
    body: `${senderData.username} is challenging you to a cipher duel!`,
    type: 'direct_challenge',
    link: '/multiplayer',
    senderName: senderData.username,
    roomCode: roomCode || '',
  });
};

/**
 * Listens to incoming game invites for the current user.
 */
export const listenToIncomingGameInvites = (currentUid, callback) => {
  const q = query(
    collection(db, 'gameInvites'),
    where('receiverId', '==', currentUid),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, async (snapshot) => {
    const invitesPromises = snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const senderData = await fetchUserData(data.senderId);
      return {
        id: docSnap.id,
        ...data,
        senderUsername: senderData.username,
        senderFriendCode: senderData.friendCode
      };
    });

    const invites = await Promise.all(invitesPromises);
    callback(invites);
  });
};

/**
 * Resolves a game invite (accepted or declined).
 */
export const resolveGameInvite = async (inviteId, newStatus, currentUid) => {
  const docRef = doc(db, 'gameInvites', inviteId);
  const inviteSnap = await getDoc(docRef);

  // EDGE-2: Re-validate the invite is still pending before resolving.
  // The host may have left (canceled) or the invite could already be resolved.
  if (!inviteSnap.exists()) {
    throw new Error('This challenge no longer exists.');
  }
  const currentStatus = inviteSnap.data().status;
  if (currentStatus !== 'pending') {
    throw new Error(
      currentStatus === 'canceled'
        ? 'This challenge has expired — the host left the room.'
        : 'This challenge has already been resolved.'
    );
  }

  await updateDoc(docRef, { 
    status: newStatus,
    resolvedAt: new Date().toISOString()
  });

  // Notify the sender about the invite resolution
  const { senderId } = inviteSnap.data();
  const resolverData = currentUid ? await fetchUserData(currentUid) : { username: 'Someone' };

  if (newStatus === 'accepted') {
    notifyUser(senderId, {
      title: 'Challenge Accepted!',
      body: `${resolverData.username} accepted your duel invite. Get ready!`,
      type: 'invite_accepted',
      link: '/multiplayer',
      senderName: resolverData.username,
    });
  } else if (newStatus === 'declined') {
    notifyUser(senderId, {
      title: 'Invite Declined',
      body: `${resolverData.username} can't make it this time.`,
      type: 'invite_declined',
      link: '/profile',
      senderName: resolverData.username,
    });
  }
};

/**
 * EDGE-2: Cancels all pending game invites for a specific room.
 * Called when the host leaves before the receiver accepts.
 * Fire-and-forget — failures are silently logged.
 */
export const cancelPendingInvitesForRoom = async (senderUid, roomCode) => {
  try {
    const invitesRef = collection(db, 'gameInvites');
    const q = query(
      invitesRef,
      where('senderId', '==', senderUid),
      where('roomCode', '==', roomCode),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        status: 'canceled',
        resolvedAt: new Date().toISOString()
      });
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed to cancel pending invites for room:', roomCode, err);
  }
};

