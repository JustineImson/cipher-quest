/**
 * logService.js
 * Centralized structured audit logging to Firestore `audit_logs` collection.
 *
 * All security-sensitive events (login, logout, OTP, admin actions, etc.)
 * are written here with a timestamp, level, and structured metadata.
 * The `audit_logs` collection is admin-read-only in Firestore rules.
 */

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/** Log severity levels */
export const LOG_LEVEL = {
  INFO:     'INFO',
  WARN:     'WARN',
  ERROR:    'ERROR',
  SECURITY: 'SECURITY',
};

/**
 * Internal: Write a log entry to Firestore.
 * Never throws — logging must never break the main flow.
 *
 * @param {string} level - LOG_LEVEL constant
 * @param {string} event - Descriptive event name (e.g. 'LOGIN_SUCCESS')
 * @param {object} details - Additional metadata object
 * @param {string|null} uid - Firebase UID of the user involved, if any
 */
async function writeLog(level, event, details = {}, uid = null) {
  try {
    const entry = {
      level,
      event,
      uid: uid || null,
      details,
      timestamp: serverTimestamp(),
      // Browser fingerprint (non-PII) for anomaly detection
      userAgent: navigator?.userAgent?.slice(0, 120) || 'unknown',
      origin: window?.location?.origin || 'unknown',
    };

    await addDoc(collection(db, 'audit_logs'), entry);
  } catch (err) {
    // Silently swallow — logging failure must never surface to the user
    console.warn('[logService] Failed to write audit log:', err?.message);
  }
}

// ─── Public Logging API ────────────────────────────────────────────────────

/**
 * Authentication Events
 */
export const logAuth = {
  loginSuccess:   (uid, email)     => writeLog(LOG_LEVEL.SECURITY, 'LOGIN_SUCCESS',   { email }, uid),
  loginFailed:    (email, reason)  => writeLog(LOG_LEVEL.SECURITY, 'LOGIN_FAILED',    { email, reason }),
  registerSuccess:(uid, username)  => writeLog(LOG_LEVEL.INFO,     'REGISTER_SUCCESS',{ username }, uid),
  logout:         (uid)            => writeLog(LOG_LEVEL.INFO,     'LOGOUT',          {}, uid),
  guestLogin:     (uid)            => writeLog(LOG_LEVEL.INFO,     'GUEST_LOGIN',     {}, uid),
  resetRequested: (email)          => writeLog(LOG_LEVEL.SECURITY, 'PASSWORD_RESET_REQUESTED', { email }),
  resetConfirmed: (uid)            => writeLog(LOG_LEVEL.SECURITY, 'PASSWORD_RESET_CONFIRMED', {}, uid),
  accountDisabled:(uid)            => writeLog(LOG_LEVEL.WARN,     'ACCOUNT_DISABLED_ATTEMPT', {}, uid),
};

/**
 * MFA / OTP Events
 */
export const logMfa = {
  otpSent:     (uid, email) => writeLog(LOG_LEVEL.SECURITY, 'OTP_SENT',    { email }, uid),
  otpVerified: (uid)        => writeLog(LOG_LEVEL.SECURITY, 'OTP_VERIFIED',{}, uid),
  otpFailed:   (uid, email) => writeLog(LOG_LEVEL.WARN,     'OTP_FAILED',  { email }, uid),
  otpExpired:  (uid)        => writeLog(LOG_LEVEL.WARN,     'OTP_EXPIRED', {}, uid),
};

/**
 * Admin Action Events
 */
export const logAdmin = {
  banUser:      (adminUid, targetUid) => writeLog(LOG_LEVEL.SECURITY, 'ADMIN_BAN_USER',      { targetUid }, adminUid),
  unbanUser:    (adminUid, targetUid) => writeLog(LOG_LEVEL.SECURITY, 'ADMIN_UNBAN_USER',    { targetUid }, adminUid),
  deleteUser:   (adminUid, targetUid) => writeLog(LOG_LEVEL.SECURITY, 'ADMIN_DELETE_USER',   { targetUid }, adminUid),
  forceLogout:  (adminUid, targetUid) => writeLog(LOG_LEVEL.SECURITY, 'ADMIN_FORCE_LOGOUT',  { targetUid }, adminUid),
  resetPass:    (adminUid, targetUid) => writeLog(LOG_LEVEL.SECURITY, 'ADMIN_RESET_PASSWORD',{ targetUid }, adminUid),
  announcement: (adminUid, text)      => writeLog(LOG_LEVEL.INFO,     'ADMIN_ANNOUNCEMENT',  { text: text?.slice(0, 100) }, adminUid),
  roomClosed:   (adminUid, roomCode)  => writeLog(LOG_LEVEL.INFO,     'ADMIN_ROOM_CLOSED',   { roomCode }, adminUid),
  backupRun:    (adminUid)            => writeLog(LOG_LEVEL.INFO,     'ADMIN_BACKUP_RUN',    {}, adminUid),
};

/**
 * General Application Events
 */
export const logApp = {
  error: (event, details, uid = null) => writeLog(LOG_LEVEL.ERROR, event, details, uid),
  warn:  (event, details, uid = null) => writeLog(LOG_LEVEL.WARN,  event, details, uid),
  info:  (event, details, uid = null) => writeLog(LOG_LEVEL.INFO,  event, details, uid),
};
