import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, Megaphone, Swords, UserPlus, Check, XCircle } from 'lucide-react';
import { db } from '../../services/firebase';
import {
  collection, doc, onSnapshot, updateDoc, query, where, getDocs, orderBy
} from 'firebase/firestore';
import { acceptFriendRequest, resolveGameInvite } from '../../services/socialService';

function seenKey(uid) { return `cq_seen_ann_${uid}`; }
function getSeenIds(uid) {
  try { return new Set(JSON.parse(localStorage.getItem(seenKey(uid)) || '[]')); }
  catch { return new Set(); }
}
function saveSeenIds(uid, ids) {
  try { localStorage.setItem(seenKey(uid), JSON.stringify([...ids])); } catch {}
}

export default function InboxModal({ onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('announcements');
  const [announcements, setAnnouncements] = useState([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [seenIds, setSeenIds] = useState(() => getSeenIds(currentUser?.uid));
  const [gameInvites, setGameInvites] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const navigate = useNavigate();
  const latestAnnouncements = useRef([]);

  const uid = currentUser?.uid;

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(typeof ts === 'number' ? ts : ts.seconds * 1000);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ── Real-time announcement subcollection listener ─────────────
  useEffect(() => {
    setAnnLoading(true);
    const unsub = onSnapshot(
      query(collection(db, 'system', 'announcements', 'items'), orderBy('createdAt', 'desc')),
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAnnouncements(items);
        latestAnnouncements.current = items;
        setAnnLoading(false);
      },
      (err) => {
        console.error('Announcement listener error:', err);
        setAnnLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ── Mark all announcements as seen when modal closes ──────────
  const handleClose = () => {
    if (uid) {
      const allIds = new Set(latestAnnouncements.current.map(a => a.id));
      saveSeenIds(uid, allIds);
      setSeenIds(allIds);
    }
    onClose();
  };

  // ── Real-time invites listeners ───────────────────────────────
  useEffect(() => {
    if (!uid) { setInviteLoading(false); return; }

    setInviteLoading(true);
    let loaded = 0;
    const checkDone = () => { loaded++; if (loaded >= 2) setInviteLoading(false); };

    // Game invites
    const unsubGame = onSnapshot(
      query(collection(db, 'gameInvites'), where('receiverId', '==', uid), where('status', '==', 'pending')),
      async (snap) => {
        const items = await Promise.all(snap.docs.map(async (d) => {
          const data = d.data();
          let senderName = 'Unknown Agent';
          try {
            const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', data.senderId)));
            if (!userSnap.empty) senderName = userSnap.docs[0].data().username || senderName;
          } catch (_) {}
          return { id: d.id, ...data, senderUsername: senderName, kind: 'game' };
        }));
        setGameInvites(items);
        checkDone();
      },
      () => checkDone()
    );

    // Friend requests
    const unsubFriend = onSnapshot(
      query(collection(db, 'friendships'), where('receiverId', '==', uid), where('status', '==', 'pending')),
      async (snap) => {
        const items = await Promise.all(snap.docs.map(async (d) => {
          const data = d.data();
          let senderName = 'Unknown Agent';
          let senderCode = '';
          try {
            const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', data.senderId)));
            if (!userSnap.empty) {
              senderName = userSnap.docs[0].data().username || senderName;
              senderCode = userSnap.docs[0].data().friendCode || '';
            }
          } catch (_) {}
          return { id: d.id, ...data, senderUsername: senderName, senderFriendCode: senderCode, kind: 'friend' };
        }));
        setFriendRequests(items);
        checkDone();
      },
      () => checkDone()
    );

    return () => { unsubGame(); unsubFriend(); };
  }, [uid]);

  const totalInvites = gameInvites.length + friendRequests.length;
  const unseenAnnCount = uid ? announcements.filter(a => !seenIds.has(a.id)).length : 0;
  const totalBadge = totalInvites + unseenAnnCount;

  const handleAcceptGame = async (invite) => {
    setActionId(invite.id);
    try {
      await resolveGameInvite(invite.id, 'accepted', uid);
      setStatusMsg('Challenge accepted! Joining room...');
      setTimeout(() => {
        onClose();
        navigate(`/multiplayer?room=${invite.roomCode}`);
      }, 800);
    } catch (err) {
      setStatusMsg(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleDeclineGame = async (invite) => {
    setActionId(invite.id);
    try {
      await resolveGameInvite(invite.id, 'declined', uid);
      setStatusMsg('Invite declined.');
    } catch (err) {
      setStatusMsg(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleAcceptFriend = async (req) => {
    setActionId(req.id);
    try {
      await acceptFriendRequest(req.id, uid);
      setStatusMsg('Friend request accepted!');
    } catch (err) {
      setStatusMsg(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleDeclineFriend = async (req) => {
    setActionId(req.id);
    try {
      await updateDoc(doc(db, 'friendships', req.id), { status: 'declined' });
      setStatusMsg('Friend request declined.');
    } catch (err) {
      setStatusMsg(err.message);
    } finally {
      setActionId(null);
    }
  };

  const tabs = [
    { key: 'announcements', icon: Megaphone, label: `Announcements${unseenAnnCount > 0 ? ` (${unseenAnnCount})` : ''}` },
    { key: 'invites', icon: Swords, label: `Invites${totalInvites > 0 ? ` (${totalInvites})` : ''}` },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative w-full max-w-xl mx-4 flex flex-col"
        style={{
          background: '#0f0c07',
          border: '1px solid rgba(200,160,50,0.45)',
          boxShadow: '0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(200,160,50,0.06)',
          maxHeight: '82vh',
          fontFamily: "'Special Elite', monospace",
        }}
      >
        {/* Header */}
        <div style={{
          background: '#1a1208',
          borderBottom: '1px solid rgba(200,160,50,0.3)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={16} style={{ color: '#c9a84c' }} />
            <span style={{ color: '#c9a84c', fontSize: 13, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
              Agent Inbox
            </span>
            {totalBadge > 0 && (
              <span style={{
                background: '#8b1a1a', color: '#e8dcc0', fontSize: 10,
                padding: '1px 7px', borderRadius: 2, letterSpacing: '0.05em',
              }}>
                {totalBadge} NEW
              </span>
            )}
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#7a6030', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(200,160,50,0.2)', flexShrink: 0 }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setStatusMsg(''); }}
              style={{
                flex: 1, padding: '10px 0',
                background: activeTab === tab.key ? '#1a1208' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #c9a84c' : '2px solid transparent',
                color: activeTab === tab.key ? '#c9a84c' : '#7a6030',
                fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6, transition: 'all 0.15s',
              }}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status message */}
        {statusMsg && (
          <div style={{
            padding: '8px 20px', fontSize: 12, color: '#5a9e6f',
            background: '#0f1a0f', borderBottom: '1px solid rgba(90,158,111,0.2)',
            letterSpacing: '0.08em', flexShrink: 0,
          }}>
            {statusMsg}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {activeTab === 'announcements' ? (
            <AnnouncementTab announcements={announcements} seenIds={seenIds} loading={annLoading} formatDate={formatDate} />
          ) : (
            <InvitesTab
              uid={uid}
              gameInvites={gameInvites}
              friendRequests={friendRequests}
              loading={inviteLoading}
              actionId={actionId}
              formatDate={formatDate}
              onAcceptGame={handleAcceptGame}
              onDeclineGame={handleDeclineGame}
              onAcceptFriend={handleAcceptFriend}
              onDeclineFriend={handleDeclineFriend}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Announcement Tab ──────────────────────────────────────────
function AnnouncementTab({ announcements, seenIds, loading, formatDate }) {
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#7a6030', fontSize: 13 }}>
        Decrypting transmissions...
      </div>
    );
  }
  if (!announcements || announcements.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <Megaphone size={32} style={{ color: '#3a2c18', margin: '0 auto 12px' }} />
        <p style={{ color: '#7a6030', fontSize: 13, letterSpacing: '0.1em' }}>No active announcements</p>
      </div>
    );
  }
  return (
    <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {announcements.map(ann => {
        const isNew = !seenIds.has(ann.id);
        return (
          <div key={ann.id} style={{
            background: '#1a1208',
            border: `1px solid ${isNew ? 'rgba(200,160,50,0.5)' : 'rgba(200,160,50,0.2)'}`,
            borderLeft: `3px solid ${isNew ? '#c9a84c' : '#4a3a18'}`,
            padding: '14px 16px',
            position: 'relative',
          }}>
            {isNew && (
              <span style={{
                position: 'absolute', top: 10, right: 12,
                background: '#8b1a1a', color: '#e8dcc0',
                fontSize: 9, padding: '1px 6px', letterSpacing: '0.1em',
              }}>NEW</span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, background: isNew ? '#c9a84c' : '#4a3a18', transform: 'rotate(45deg)', flexShrink: 0 }} />
              <span style={{ color: isNew ? '#c9a84c' : '#7a6030', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Official Dispatch
              </span>
            </div>
            <p style={{ color: isNew ? '#e8dcc0' : '#a89060', fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>
              {ann.text}
            </p>
            {ann.createdAt && (
              <p style={{ color: '#7a6030', fontSize: 10, letterSpacing: '0.06em' }}>
                — Issued: {formatDate(ann.createdAt)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Invites Tab ───────────────────────────────────────────────
function InvitesTab({ uid, gameInvites, friendRequests, loading, actionId, formatDate, onAcceptGame, onDeclineGame, onAcceptFriend, onDeclineFriend }) {
  if (!uid) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <Swords size={32} style={{ color: '#3a2c18', margin: '0 auto 12px' }} />
        <p style={{ color: '#7a6030', fontSize: 13, letterSpacing: '0.1em' }}>Sign in to view invites</p>
      </div>
    );
  }
  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#7a6030', fontSize: 13 }}>Loading invites...</div>;
  }
  if (gameInvites.length === 0 && friendRequests.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <Swords size={32} style={{ color: '#3a2c18', margin: '0 auto 12px' }} />
        <p style={{ color: '#7a6030', fontSize: 13, letterSpacing: '0.1em' }}>No pending invites</p>
      </div>
    );
  }

  const btnBase = {
    border: 'none', cursor: 'pointer', borderRadius: 2,
    fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5,
    transition: 'all 0.15s',
  };

  return (
    <div>
      {/* Battle invites */}
      {gameInvites.length > 0 && (
        <div>
          <div style={{
            padding: '8px 20px', background: '#15100a',
            borderBottom: '1px solid rgba(200,160,50,0.15)',
            color: '#7a6030', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Swords size={11} /> Battle Challenges
          </div>
          {gameInvites.map(inv => (
            <div key={inv.id} style={{
              padding: '14px 20px', borderBottom: '1px solid rgba(200,160,50,0.1)',
              background: '#0f0c07',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 7, height: 7, background: '#c9a84c', transform: 'rotate(45deg)', flexShrink: 0 }} />
                    <span style={{ color: '#e8dcc0', fontSize: 13, letterSpacing: '0.08em' }}>
                      {inv.senderUsername}
                    </span>
                    <span style={{ color: '#8b1a1a', fontSize: 10, background: '#1a0a0a', padding: '1px 6px', letterSpacing: '0.1em' }}>
                      DUEL
                    </span>
                  </div>
                  <p style={{ color: '#7a6030', fontSize: 11, marginLeft: 15 }}>
                    Room: <span style={{ color: '#c9a84c', fontFamily: 'monospace' }}>{inv.roomCode}</span>
                    {inv.createdAt && <span style={{ marginLeft: 8 }}>· {formatDate(inv.createdAt)}</span>}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => onAcceptGame(inv)}
                    disabled={actionId === inv.id}
                    style={{ ...btnBase, background: '#0f1a0f', color: '#5a9e6f', border: '1px solid rgba(90,158,111,0.5)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#5a9e6f'; e.currentTarget.style.color = '#0a0a0f'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#0f1a0f'; e.currentTarget.style.color = '#5a9e6f'; }}
                  >
                    <Check size={11} /> Accept
                  </button>
                  <button
                    onClick={() => onDeclineGame(inv)}
                    disabled={actionId === inv.id}
                    style={{ ...btnBase, background: '#1a0f0f', color: '#8b1a1a', border: '1px solid rgba(139,26,26,0.5)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#8b1a1a'; e.currentTarget.style.color = '#e8dcc0'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#1a0f0f'; e.currentTarget.style.color = '#8b1a1a'; }}
                  >
                    <XCircle size={11} /> Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friend requests */}
      {friendRequests.length > 0 && (
        <div>
          <div style={{
            padding: '8px 20px', background: '#15100a',
            borderBottom: '1px solid rgba(200,160,50,0.15)',
            color: '#7a6030', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <UserPlus size={11} /> Friend Requests
          </div>
          {friendRequests.map(req => (
            <div key={req.id} style={{
              padding: '14px 20px', borderBottom: '1px solid rgba(200,160,50,0.1)',
              background: '#0f0c07',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 7, height: 7, background: '#5a9e6f', borderRadius: '50%', flexShrink: 0 }} />
                    <span style={{ color: '#e8dcc0', fontSize: 13, letterSpacing: '0.08em' }}>
                      {req.senderUsername}
                    </span>
                    <span style={{ color: '#5a9e6f', fontSize: 10, background: '#0a1a0a', padding: '1px 6px', letterSpacing: '0.1em' }}>
                      FRIEND
                    </span>
                  </div>
                  {req.senderFriendCode && (
                    <p style={{ color: '#7a6030', fontSize: 11, marginLeft: 15 }}>
                      Code: <span style={{ color: '#c9a84c', fontFamily: 'monospace' }}>{req.senderFriendCode}</span>
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => onAcceptFriend(req)}
                    disabled={actionId === req.id}
                    style={{ ...btnBase, background: '#0f1a0f', color: '#5a9e6f', border: '1px solid rgba(90,158,111,0.5)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#5a9e6f'; e.currentTarget.style.color = '#0a0a0f'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#0f1a0f'; e.currentTarget.style.color = '#5a9e6f'; }}
                  >
                    <Check size={11} /> Accept
                  </button>
                  <button
                    onClick={() => onDeclineFriend(req)}
                    disabled={actionId === req.id}
                    style={{ ...btnBase, background: '#1a0f0f', color: '#8b1a1a', border: '1px solid rgba(139,26,26,0.5)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#8b1a1a'; e.currentTarget.style.color = '#e8dcc0'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#1a0f0f'; e.currentTarget.style.color = '#8b1a1a'; }}
                  >
                    <XCircle size={11} /> Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
