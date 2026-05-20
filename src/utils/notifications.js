import { getMessaging, getToken } from "firebase/messaging";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase"; // Import auth and db
import { getApp } from "firebase/app";

/**
 * Requests notification permissions from the browser and generates an FCM token.
 * Automatically saves the token to the current user's document in Firestore.
 */
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(getApp());

      // Explicitly register the FCM service worker so getToken can find it.
      // VitePWA registers its own SW; without this, FCM fails silently on mobile.
      let swRegistration;
      if ('serviceWorker' in navigator) {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/firebase-cloud-messaging-push-scope'
        });
      }

      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        ...(swRegistration ? { serviceWorkerRegistration: swRegistration } : {})
      });
      
      if (token) {
        console.log('FCM Token Generated:', token);
        
        // Save to Firestore if user is logged in
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            fcmToken: token,
            notificationsEnabled: true
          }).catch(async (error) => {
            // If the document doesn't exist, we might need to set it instead
            if (error.code === 'not-found') {
               await setDoc(userRef, {
                 fcmToken: token,
                 notificationsEnabled: true
               }, { merge: true });
            } else {
               console.error("Error saving FCM token to Firestore:", error);
            }
          });
          console.log("FCM token saved to user document.");
        } else {
          console.log("User not logged in, token not saved to Firestore.");
        }
        
        return token;
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Notification permission denied or dismissed.');
    }
  } catch (err) {
    console.error('An error occurred while requesting notification permission:', err);
  }
};
