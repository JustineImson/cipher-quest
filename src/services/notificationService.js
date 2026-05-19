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
    await fetch(`${SERVER_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid, title, body, type, link }),
    });
  } catch {
    // Silent fail — notification is non-critical
  }
}
