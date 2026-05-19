const SERVER_URL = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3001`;

/**
 * Sends a push notification to a target user via the Node.js server.
 * This is a fire-and-forget helper — failures are silently logged
 * so notification issues never block the main user action.
 *
 * @param {string} targetUid - Target user's Firebase UID
 * @param {object} options - { title, body, type, link }
 */
export async function notifyUser(targetUid, { title, body, type, link }) {
  try {
    console.log('[Notification] Sending to:', targetUid, { title, type });
    const response = await fetch(`${SERVER_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid, title, body, type, link }),
    });
    if (!response.ok) {
      console.warn('[Notification] Failed to send:', response.status, response.statusText);
    } else {
      console.log('[Notification] Sent successfully to:', targetUid);
    }
  } catch (err) {
    console.warn('[Notification] Error sending notification:', err.message);
    // Silent fail — notification is non-critical
  }
}
