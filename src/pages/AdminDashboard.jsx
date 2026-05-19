import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { auth } from '../services/firebase';
import {
  collection, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc,
  query, orderBy, limit, where
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { StoryCiphers } from '../game/CipherData.js';
import { suspectEvidence } from '../data/StoryEvidence.js';
import fallbackPuzzles from '../data/fallbackPuzzles.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Tab components
function PlayerManagement() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchPlayers = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(data);
    } catch (err) {
      console.error('Error fetching players:', err);
      setMessage('Error loading players');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const filteredPlayers = players.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      (p.username?.toLowerCase() || '').includes(q) ||
      (p.email?.toLowerCase() || '').includes(q) ||
      (p.friendCode?.toLowerCase() || '').includes(q)
    );
  });

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  };

  const handleBan = async (uid, ban) => {
    setActionLoading(true);
    try {
      const token = await getAuthToken();
      const endpoint = ban ? '/admin/ban-user' : '/admin/unban-user';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ uid })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`User ${ban ? 'banned' : 'unbanned'} successfully`);
        fetchPlayers();
      } else {
        setMessage(data.error || 'Action failed');
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceLogout = async (uid) => {
    setActionLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/admin/force-logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ uid })
      });
      const data = await res.json();
      setMessage(data.success ? 'User logged out successfully' : (data.error || 'Action failed'));
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (uid, email) => {
    setActionLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ uid, email, sendEmail: true })
      });
      const data = await res.json();
      setMessage(data.success ? 'Password reset email sent' : (data.error || 'Action failed'));
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (uid) => {
    if (!confirm('WARNING: This will permanently delete the user and ALL their data. Continue?')) return;
    setActionLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/admin/delete-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ uid })
      });
      const data = await res.json();
      if (data.success) {
        setMessage('User deleted successfully');
        setSelectedPlayer(null);
        fetchPlayers();
      } else {
        setMessage(data.error || 'Delete failed');
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOverrideClearance = async (uid, newLevel) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', uid), { difficulty: newLevel });
      setMessage(`Security clearance updated to ${newLevel}`);
      fetchPlayers();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetStory = async (uid) => {
    if (!confirm('This will reset the player\'s story progress. Continue?')) return;
    setActionLoading(true);
    try {
      await setDoc(doc(db, 'storyProgress', uid), {
        savedStoryProgress: null,
        collectedEvidence: [],
        updatedAt: Date.now()
      });
      setMessage('Story progress reset successfully');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="text-[#c9a84c]">Loading players...</div>;

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded text-sm ${message.includes('Error') || message.includes('failed') ? 'bg-[#3a1515] text-[#c96a6a] border border-[#8b1a1a]' : 'bg-[#0f1a0f] text-[#5a9e6f] border border-[#5a9e6f]'}`}>
          {message}
        </div>
      )}

      <div className="flex gap-4 items-center">
        <input
          type="text"
          placeholder="Search by username, email, or friend code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-4 py-2 text-sm focus:outline-none focus:border-[#c9a84c]"
        />
        <button
          onClick={fetchPlayers}
          className="px-4 py-2 bg-[#0f1510] border border-[#5a9e6f]/50 text-[#5a9e6f] text-xs uppercase tracking-wider hover:bg-[#5a9e6f] hover:text-[#0a0a0f] transition-all"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0f0f14] border border-[#7a6030]/30 overflow-hidden">
          <div className="bg-[#1a1208] px-4 py-3 border-b border-[#7a6030]/30">
            <h3 className="text-[#c9a84c] text-sm uppercase tracking-wider">Players ({filteredPlayers.length})</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {filteredPlayers.map(player => (
              <div
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className={`px-4 py-3 border-b border-[#7a6030]/20 cursor-pointer transition-colors ${
                  selectedPlayer?.id === player.id ? 'bg-[#1a1208]' : 'hover:bg-[#15151a]'
                }`}
              >
                <div className="text-[#e8dcc0] text-sm">{player.username || 'Unknown'}</div>
                <div className="text-[#7a6030] text-xs">{player.email} • {player.friendCode}</div>
              </div>
            ))}
          </div>
        </div>

        {selectedPlayer && (
          <div className="bg-[#0f0f14] border border-[#7a6030]/30">
            <div className="bg-[#1a1208] px-4 py-3 border-b border-[#7a6030]/30">
              <h3 className="text-[#c9a84c] text-sm uppercase tracking-wider">Player Details</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-[#7a6030]">UID:</div>
                <div className="text-[#e8dcc0] font-mono text-xs break-all">{selectedPlayer.id}</div>
                <div className="text-[#7a6030]">Username:</div>
                <div className="text-[#e8dcc0]">{selectedPlayer.username}</div>
                <div className="text-[#7a6030]">Email:</div>
                <div className="text-[#e8dcc0]">{selectedPlayer.email}</div>
                <div className="text-[#7a6030]">Friend Code:</div>
                <div className="text-[#e8dcc0] font-mono">{selectedPlayer.friendCode}</div>
                <div className="text-[#7a6030]">Security Level:</div>
                <div className="text-[#e8dcc0]">{selectedPlayer.difficulty || 'Medium'}</div>
              </div>

              <div className="border-t border-[#7a6030]/30 pt-4 space-y-2">
                <div className="text-[#c9a84c] text-xs uppercase tracking-wider mb-2">Account Actions</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleBan(selectedPlayer.id, true)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-[#1a0f0f] border border-[#8b1a1a]/50 text-[#8b1a1a] text-xs uppercase hover:bg-[#8b1a1a] hover:text-[#0a0a0f] transition-all disabled:opacity-50"
                  >
                    Ban User
                  </button>
                  <button
                    onClick={() => handleBan(selectedPlayer.id, false)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-[#0f1a0f] border border-[#5a9e6f]/50 text-[#5a9e6f] text-xs uppercase hover:bg-[#5a9e6f] hover:text-[#0a0a0f] transition-all disabled:opacity-50"
                  >
                    Unban User
                  </button>
                  <button
                    onClick={() => handleForceLogout(selectedPlayer.id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-[#1a1508] border border-[#c9a84c]/50 text-[#c9a84c] text-xs uppercase hover:bg-[#c9a84c] hover:text-[#0a0a0f] transition-all disabled:opacity-50"
                  >
                    Force Logout
                  </button>
                  <button
                    onClick={() => handleResetPassword(selectedPlayer.id, selectedPlayer.email)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-[#0f0f1a] border border-[#6a7a9e]/50 text-[#6a7a9e] text-xs uppercase hover:bg-[#6a7a9e] hover:text-[#0a0a0f] transition-all disabled:opacity-50"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => handleDeleteUser(selectedPlayer.id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-[#3a1515] border border-[#c96a6a]/50 text-[#c96a6a] text-xs uppercase hover:bg-[#c96a6a] hover:text-[#0a0a0f] transition-all disabled:opacity-50"
                  >
                    Delete Account
                  </button>
                </div>
              </div>

              <div className="border-t border-[#7a6030]/30 pt-4 space-y-2">
                <div className="text-[#c9a84c] text-xs uppercase tracking-wider mb-2">Data Override</div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[#7a6030] text-xs">Security Clearance:</span>
                  {['Easy', 'Medium', 'Hard'].map(level => (
                    <button
                      key={level}
                      onClick={() => handleOverrideClearance(selectedPlayer.id, level)}
                      disabled={actionLoading}
                      className="px-2 py-1 bg-[#0f0f14] border border-[#7a6030]/50 text-[#7a6030] text-xs hover:border-[#c9a84c] hover:text-[#c9a84c] transition-all disabled:opacity-50"
                    >
                      {level}
                    </button>
                  ))}
                  <button
                    onClick={() => handleResetStory(selectedPlayer.id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-[#3a2015] border border-[#c98a6a]/50 text-[#c98a6a] text-xs uppercase hover:bg-[#c98a6a] hover:text-[#0a0a0f] transition-all disabled:opacity-50 ml-4"
                  >
                    Reset Story
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderboardManagement() {
  const [activeTab, setActiveTab] = useState('timeAttack');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      console.log(`Fetching ${activeTab} leaderboard...`);
      const q = query(
        collection(db, 'leaderboards', activeTab, 'entries'),
        orderBy(activeTab === 'multiplayer' ? 'wins' : 'score', 'desc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      console.log(`Fetched ${snapshot.docs.length} entries`);
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          // For multiplayer, show wins as the score
          score: activeTab === 'multiplayer' ? (docData.wins || 0) : (docData.score || 0)
        };
      });
      setEntries(data);
      if (data.length === 0) {
        setMessage('No entries found in this leaderboard');
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setMessage(`Error loading leaderboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleDeleteEntry = async (uid) => {
    if (!confirm('Delete this leaderboard entry?')) return;
    try {
      await deleteDoc(doc(db, 'leaderboards', activeTab, 'entries', uid));
      setMessage('Entry deleted');
      fetchLeaderboard();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleResetBoard = async () => {
    if (!confirm(`WARNING: This will delete ALL entries from the ${activeTab} leaderboard. Continue?`)) return;
    try {
      const snapshot = await getDocs(collection(db, 'leaderboards', activeTab, 'entries'));
      const batch = [];
      snapshot.docs.forEach(d => batch.push(deleteDoc(d.ref)));
      await Promise.all(batch);
      setMessage('Leaderboard reset successfully');
      fetchLeaderboard();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleSetAnnouncement = async () => {
    try {
      await setDoc(doc(db, 'system', 'announcements'), {
        text: announcement,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid
      });
      setMessage('Announcement set');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded text-sm ${message.includes('Error') || message.includes('failed') ? 'bg-[#3a1515] text-[#c96a6a] border border-[#8b1a1a]' : 'bg-[#0f1a0f] text-[#5a9e6f] border border-[#5a9e6f]'}`}>
          {message}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('timeAttack')}
          className={`px-4 py-2 text-xs uppercase tracking-wider border transition-all ${
            activeTab === 'timeAttack'
              ? 'bg-[#c9a84c] text-[#0a0a0f] border-[#c9a84c]'
              : 'bg-transparent text-[#c9a84c] border-[#7a6030]/50 hover:border-[#c9a84c]'
          }`}
        >
          Time Attack
        </button>
        <button
          onClick={() => setActiveTab('multiplayer')}
          className={`px-4 py-2 text-xs uppercase tracking-wider border transition-all ${
            activeTab === 'multiplayer'
              ? 'bg-[#c9a84c] text-[#0a0a0f] border-[#c9a84c]'
              : 'bg-transparent text-[#c9a84c] border-[#7a6030]/50 hover:border-[#c9a84c]'
          }`}
        >
          Multiplayer
        </button>
      </div>

      <div className="bg-[#0f0f14] border border-[#7a6030]/30">
        <div className="bg-[#1a1208] px-4 py-3 border-b border-[#7a6030]/30 flex justify-between items-center">
          <h3 className="text-[#c9a84c] text-sm uppercase tracking-wider">{activeTab} Leaderboard ({entries.length} entries)</h3>
          <div className="flex gap-2">
            <button
              onClick={fetchLeaderboard}
              className="px-3 py-1.5 bg-[#0f1510] border border-[#5a9e6f]/50 text-[#5a9e6f] text-xs uppercase hover:bg-[#5a9e6f] hover:text-[#0a0a0f] transition-all"
            >
              Refresh
            </button>
            <button
              onClick={handleResetBoard}
              className="px-3 py-1.5 bg-[#3a1515] border border-[#c96a6a]/50 text-[#c96a6a] text-xs uppercase hover:bg-[#c96a6a] hover:text-[#0a0a0f] transition-all"
            >
              Reset Board
            </button>
          </div>
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-[#7a6030]">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-4 text-[#7a6030]">No entries found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#15151a]">
                <tr>
                  <th className="text-left px-4 py-2 text-[#7a6030] font-normal">Rank</th>
                  <th className="text-left px-4 py-2 text-[#7a6030] font-normal">Player</th>
                  <th className="text-left px-4 py-2 text-[#7a6030] font-normal">Score</th>
                  <th className="text-left px-4 py-2 text-[#7a6030] font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={entry.id} className="border-b border-[#7a6030]/20">
                    <td className="px-4 py-2 text-[#c9a84c]">#{index + 1}</td>
                    <td className="px-4 py-2 text-[#e8dcc0]">{entry.username || entry.id}</td>
                    <td className="px-4 py-2 text-[#5a9e6f] font-mono">{entry.score}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-[#8b1a1a] hover:text-[#c96a6a] text-xs uppercase"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-[#0f0f14] border border-[#7a6030]/30 p-4">
        <h3 className="text-[#c9a84c] text-sm uppercase tracking-wider mb-3">System Announcement</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter announcement text..."
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            className="flex-1 bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-4 py-2 text-sm focus:outline-none focus:border-[#c9a84c]"
          />
          <button
            onClick={handleSetAnnouncement}
            className="px-4 py-2 bg-[#1a1508] border border-[#c9a84c]/50 text-[#c9a84c] text-xs uppercase hover:bg-[#c9a84c] hover:text-[#0a0a0f] transition-all"
          >
            Set Notice
          </button>
        </div>
        <p className="text-[#7a6030] text-xs mt-2">This message will be displayed on the player-facing leaderboard page.</p>
      </div>
    </div>
  );
}

function ContentManagement() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [forceFallback, setForceFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('config');

  // Story Ciphers State
  const [storyCiphers, setStoryCiphers] = useState(() => {
    // Convert nested structure to flat array for easier editing
    const flat = [];
    Object.entries(StoryCiphers).forEach(([location, difficulties]) => {
      Object.entries(difficulties).forEach(([difficulty, data]) => {
        flat.push({
          id: `${location}_${difficulty}`,
          location,
          difficulty,
          ...data
        });
      });
    });
    return flat;
  });
  const [editingCipher, setEditingCipher] = useState(null);

  // Suspect Evidence State
  const [evidence, setEvidence] = useState(suspectEvidence);
  const [editingEvidence, setEditingEvidence] = useState(null);

  // Fallback Puzzles State
  const [fallbacks, setFallbacks] = useState(() => {
    const flat = [];
    Object.entries(fallbackPuzzles).forEach(([cipherType, puzzles]) => {
      puzzles.forEach((puzzle, index) => {
        flat.push({
          id: `${cipherType}_${index}`,
          cipherType,
          index,
          ...puzzle
        });
      });
    });
    return flat;
  });
  const [editingFallback, setEditingFallback] = useState(null);
  const [fallbackFilter, setFallbackFilter] = useState('all');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'system', 'config'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setForceFallback(data.forceFallback || false);
          setAiEnabled(data.aiEnabled !== false);
        }
      } catch (err) {
        console.error('Error loading config:', err);
      }
    };
    loadConfig();
  }, []);

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'system', 'config'), {
        forceFallback,
        aiEnabled,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid
      });
      setMessage('Configuration saved');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Story Cipher Handlers
  const handleSaveCipher = () => {
    if (!editingCipher) return;
    setStoryCiphers(prev => prev.map(c => c.id === editingCipher.id ? editingCipher : c));
    setEditingCipher(null);
    setMessage('Cipher updated (save to Firestore to persist)');
  };

  // Evidence Handlers
  const handleSaveEvidence = () => {
    if (!editingEvidence) return;
    setEvidence(prev => prev.map(e => e.id === editingEvidence.id ? editingEvidence : e));
    setEditingEvidence(null);
    setMessage('Evidence updated (save to Firestore to persist)');
  };

  // Fallback Handlers
  const handleSaveFallback = () => {
    if (!editingFallback) return;
    if (editingFallback.isNew) {
      // Add new puzzle
      const newPuzzle = { ...editingFallback };
      delete newPuzzle.isNew;
      setFallbacks(prev => [...prev, newPuzzle]);
      setMessage('New puzzle added (save to Firestore to persist)');
    } else {
      // Update existing
      setFallbacks(prev => prev.map(f => f.id === editingFallback.id ? editingFallback : f));
      setMessage('Fallback puzzle updated (save to Firestore to persist)');
    }
    setEditingFallback(null);
  };

  const filteredFallbacks = fallbackFilter === 'all'
    ? fallbacks
    : fallbacks.filter(f => f.cipherType === fallbackFilter);

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded text-sm ${message.includes('Error') ? 'bg-[#3a1515] text-[#c96a6a] border border-[#8b1a1a]' : 'bg-[#0f1a0f] text-[#5a9e6f] border border-[#5a9e6f]'}`}>
          {message}
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {['config', 'ciphers', 'evidence', 'fallbacks'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 text-xs uppercase tracking-wider border transition-all ${
              activeSubTab === tab
                ? 'bg-[#c9a84c] text-[#0a0a0f] border-[#c9a84c]'
                : 'bg-transparent text-[#c9a84c] border-[#7a6030]/50 hover:border-[#c9a84c]'
            }`}
          >
            {tab === 'config' ? 'System Config' : tab === 'ciphers' ? 'Story Ciphers' : tab === 'evidence' ? 'Suspect Evidence' : 'Fallback Puzzles'}
          </button>
        ))}
      </div>

      {activeSubTab === 'config' && (
        <div className="bg-[#0f0f14] border border-[#7a6030]/30 p-4 space-y-4">
          <h3 className="text-[#c9a84c] text-sm uppercase tracking-wider">AI & Fallback Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={forceFallback}
                onChange={(e) => setForceFallback(e.target.checked)}
                className="w-4 h-4 accent-[#c9a84c]"
              />
              <span className="text-[#e8dcc0] text-sm">Force Fallback Mode (Disable AI Generation)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#c9a84c]"
              />
              <span className="text-[#e8dcc0] text-sm">AI Generation Enabled</span>
            </label>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={loading}
            className="px-4 py-2 bg-[#1a1508] border border-[#c9a84c]/50 text-[#c9a84c] text-xs uppercase hover:bg-[#c9a84c] hover:text-[#0a0a0f] transition-all disabled:opacity-50"
          >
            Save Configuration
          </button>
        </div>
      )}

      {activeSubTab === 'ciphers' && (
        <div className="space-y-4">
          {editingCipher && (
            <div className="bg-[#1a1208] border border-[#c9a84c]/50 p-4">
              <h4 className="text-[#c9a84c] text-sm uppercase tracking-wider mb-4">
                Editing: {editingCipher.location} ({editingCipher.difficulty})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[#7a6030] text-xs uppercase block mb-1">Type</label>
                  <input
                    value={editingCipher.type || ''}
                    onChange={(e) => setEditingCipher({...editingCipher, type: e.target.value})}
                    className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[#7a6030] text-xs uppercase block mb-1">Keyword</label>
                  <input
                    value={editingCipher.keyword || editingCipher.key || ''}
                    onChange={(e) => setEditingCipher({...editingCipher, keyword: e.target.value, key: e.target.value})}
                    className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[#7a6030] text-xs uppercase block mb-1">Ciphertext</label>
                  <input
                    value={editingCipher.ciphertext || ''}
                    onChange={(e) => setEditingCipher({...editingCipher, ciphertext: e.target.value})}
                    className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[#7a6030] text-xs uppercase block mb-1">Solution</label>
                  <input
                    value={editingCipher.solution || editingCipher.plaintext || ''}
                    onChange={(e) => setEditingCipher({...editingCipher, solution: e.target.value, plaintext: e.target.value})}
                    className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[#7a6030] text-xs uppercase block mb-1">Clue</label>
                  <textarea
                    value={editingCipher.clue || ''}
                    onChange={(e) => setEditingCipher({...editingCipher, clue: e.target.value})}
                    rows={2}
                    className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveCipher}
                  className="px-4 py-2 bg-[#0f1a0f] border border-[#5a9e6f]/50 text-[#5a9e6f] text-xs uppercase hover:bg-[#5a9e6f] hover:text-[#0a0a0f] transition-all"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingCipher(null)}
                  className="px-4 py-2 bg-[#1a0f0f] border border-[#8b1a1a]/50 text-[#8b1a1a] text-xs uppercase hover:bg-[#8b1a1a] hover:text-[#0a0a0f] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
            {storyCiphers.map(cipher => (
              <div
                key={cipher.id}
                className="bg-[#0f0f14] border border-[#7a6030]/30 p-4 hover:border-[#c9a84c]/50 transition-all cursor-pointer"
                onClick={() => setEditingCipher(cipher)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[#c9a84c] text-sm uppercase tracking-wider">{cipher.location}</span>
                    <span className="text-[#7a6030] text-xs ml-2">({cipher.difficulty})</span>
                  </div>
                  <span className="text-[#5a9e6f] text-xs uppercase">{cipher.type}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="text-[#7a6030]">Keyword: <span className="text-[#e8dcc0]">{cipher.keyword || cipher.key || 'N/A'}</span></div>
                  <div className="text-[#7a6030]">Cipher: <span className="text-[#e8dcc0] font-mono">{cipher.ciphertext}</span></div>
                  <div className="text-[#7a6030]">Solution: <span className="text-[#e8dcc0] font-mono">{cipher.solution || cipher.plaintext}</span></div>
                </div>
                <div className="mt-2 text-[#7a6030] text-xs italic">{cipher.clue?.substring(0, 60)}...</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'evidence' && (
        <div className="space-y-4">
          {editingEvidence && (
            <div className="bg-[#1a1208] border border-[#c9a84c]/50 p-4">
              <h4 className="text-[#c9a84c] text-sm uppercase tracking-wider mb-4">
                Editing Evidence: {editingEvidence.id}
              </h4>
              <div className="space-y-4 mb-4">
                <div>
                  <label className="text-[#7a6030] text-xs uppercase block mb-1">Title</label>
                  <input
                    value={editingEvidence.title || ''}
                    onChange={(e) => setEditingEvidence({...editingEvidence, title: e.target.value})}
                    className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[#7a6030] text-xs uppercase block mb-1">Description</label>
                  <textarea
                    value={editingEvidence.description || ''}
                    onChange={(e) => setEditingEvidence({...editingEvidence, description: e.target.value})}
                    rows={3}
                    className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="text-[#7a6030] text-xs uppercase block mb-1">Suspect Hint</label>
                  <textarea
                    value={editingEvidence.suspectHint || ''}
                    onChange={(e) => setEditingEvidence({...editingEvidence, suspectHint: e.target.value})}
                    rows={2}
                    className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEvidence}
                  className="px-4 py-2 bg-[#0f1a0f] border border-[#5a9e6f]/50 text-[#5a9e6f] text-xs uppercase hover:bg-[#5a9e6f] hover:text-[#0a0a0f] transition-all"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingEvidence(null)}
                  className="px-4 py-2 bg-[#1a0f0f] border border-[#8b1a1a]/50 text-[#8b1a1a] text-xs uppercase hover:bg-[#8b1a1a] hover:text-[#0a0a0f] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {evidence.map(item => (
              <div
                key={item.id}
                className="bg-[#0f0f14] border border-[#7a6030]/30 p-4 hover:border-[#c9a84c]/50 transition-all cursor-pointer"
                onClick={() => setEditingEvidence(item)}
              >
                <div className="text-[#c9a84c] text-sm uppercase tracking-wider mb-1">{item.title}</div>
                <div className="text-[#7a6030] text-xs font-mono mb-2">{item.id}</div>
                <div className="text-[#e8dcc0] text-sm mb-2">{item.description?.substring(0, 100)}...</div>
                <div className="text-[#5a9e6f] text-xs italic">Hint: {item.suspectHint?.substring(0, 60)}...</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'fallbacks' && (
        <div className="space-y-4">
          {editingFallback && (
            <div className="bg-[#1a1208] border border-[#c9a84c]/50 p-4">
              <h4 className="text-[#c9a84c] text-sm uppercase tracking-wider mb-4">
                {editingFallback.isNew ? 'Add New Fallback Puzzle' : `Editing: ${editingFallback.cipherType} (${editingFallback.difficulty})`}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {editingFallback.isNew && (
                  <div>
                    <label className="text-[#7a6030] text-xs uppercase block mb-1">Cipher Type</label>
                    <select
                      value={editingFallback.cipherType}
                      onChange={(e) => setEditingFallback({...editingFallback, cipherType: e.target.value})}
                      className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm"
                    >
                      <option value="caesar">Caesar</option>
                      <option value="vigenere">Vigenere</option>
                      <option value="substitution">Substitution</option>
                      <option value="railfence">Railfence</option>
                      <option value="columnar">Columnar</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-[#7a6030] text-xs uppercase block mb-1">Plaintext</label>
                  <input
                    value={editingFallback.plaintext || ''}
                    onChange={(e) => setEditingFallback({...editingFallback, plaintext: e.target.value})}
                    className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[#7a6030] text-xs uppercase block mb-1">Ciphertext</label>
                  <input
                    value={editingFallback.ciphertext || ''}
                    onChange={(e) => setEditingFallback({...editingFallback, ciphertext: e.target.value})}
                    className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[#7a6030] text-xs uppercase block mb-1">Key</label>
                  <input
                    value={editingFallback.key || ''}
                    onChange={(e) => setEditingFallback({...editingFallback, key: e.target.value})}
                    className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[#7a6030] text-xs uppercase block mb-1">Difficulty</label>
                  <select
                    value={editingFallback.difficulty || 'easy'}
                    onChange={(e) => setEditingFallback({...editingFallback, difficulty: e.target.value})}
                    className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm"
                  >
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[#7a6030] text-xs uppercase block mb-1">Clue</label>
                  <textarea
                    value={editingFallback.clue || ''}
                    onChange={(e) => setEditingFallback({...editingFallback, clue: e.target.value})}
                    rows={2}
                    className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveFallback}
                  className="px-4 py-2 bg-[#0f1a0f] border border-[#5a9e6f]/50 text-[#5a9e6f] text-xs uppercase hover:bg-[#5a9e6f] hover:text-[#0a0a0f] transition-all"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingFallback(null)}
                  className="px-4 py-2 bg-[#1a0f0f] border border-[#8b1a1a]/50 text-[#8b1a1a] text-xs uppercase hover:bg-[#8b1a1a] hover:text-[#0a0a0f] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap items-center">
            {['all', 'caesar', 'vigenere', 'substitution', 'railfence', 'columnar'].map(type => (
              <button
                key={type}
                onClick={() => setFallbackFilter(type)}
                className={`px-3 py-1.5 text-xs uppercase tracking-wider border transition-all ${
                  fallbackFilter === type
                    ? 'bg-[#c9a84c] text-[#0a0a0f] border-[#c9a84c]'
                    : 'bg-transparent text-[#c9a84c] border-[#7a6030]/50 hover:border-[#c9a84c]'
                }`}
              >
                {type === 'all' ? 'All Types' : type}
              </button>
            ))}
            <div className="flex-1"></div>
            <button
              onClick={() => setEditingFallback({
                id: `new_${Date.now()}`,
                cipherType: fallbackFilter === 'all' ? 'caesar' : fallbackFilter,
                difficulty: 'easy',
                plaintext: '',
                ciphertext: '',
                key: '',
                clue: '',
                isNew: true
              })}
              className="px-3 py-1.5 bg-[#0f1a0f] border border-[#5a9e6f]/50 text-[#5a9e6f] text-xs uppercase hover:bg-[#5a9e6f] hover:text-[#0a0a0f] transition-all"
            >
              + Add Puzzle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
            {filteredFallbacks.map(puzzle => (
              <div
                key={puzzle.id}
                className="bg-[#0f0f14] border border-[#7a6030]/30 p-4 hover:border-[#c9a84c]/50 transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[#5a9e6f] text-xs uppercase">{puzzle.cipherType}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs uppercase ${
                      puzzle.difficulty === 'easy' ? 'text-[#5a9e6f]' :
                      puzzle.difficulty === 'moderate' ? 'text-[#c9a84c]' : 'text-[#c96a6a]'
                    }`}>
                      {puzzle.difficulty}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this fallback puzzle?')) {
                          setFallbacks(prev => prev.filter(f => f.id !== puzzle.id));
                          setMessage('Puzzle deleted (save to Firestore to persist)');
                        }
                      }}
                      className="text-[#8b1a1a] hover:text-[#c96a6a] text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div
                  className="cursor-pointer"
                  onClick={() => setEditingFallback(puzzle)}
                >
                  <div className="text-[#c9a84c] text-sm font-mono mb-1">{puzzle.plaintext}</div>
                  <div className="text-[#e8dcc0] text-sm font-mono mb-1">→ {puzzle.ciphertext}</div>
                  <div className="text-[#7a6030] text-xs">Key: <span className="text-[#e8dcc0]">{puzzle.key}</span></div>
                  <div className="mt-2 text-[#7a6030] text-xs italic">{puzzle.clue?.substring(0, 50)}...</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MultiplayerOversight() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();

      const res = await fetch(`${API_BASE_URL}/admin/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCloseRoom = async (roomCode) => {
    if (!confirm(`Close room ${roomCode}?`)) return;
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();

      const res = await fetch(`${API_BASE_URL}/admin/close-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roomCode })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Room ${roomCode} closed`);
        fetchRooms();
      } else {
        setMessage(data.error || 'Failed to close room');
      }
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastBody) {
      setMessage('Title and body are required');
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();

      const res = await fetch(`${API_BASE_URL}/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: broadcastTitle, body: broadcastBody })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Broadcast sent to ${data.sent} users`);
        setBroadcastTitle('');
        setBroadcastBody('');
      } else {
        setMessage(data.error || 'Broadcast failed');
      }
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded text-sm ${message.includes('Error') || message.includes('failed') ? 'bg-[#3a1515] text-[#c96a6a] border border-[#8b1a1a]' : 'bg-[#0f1a0f] text-[#5a9e6f] border border-[#5a9e6f]'}`}>
          {message}
        </div>
      )}

      <div className="bg-[#0f0f14] border border-[#7a6030]/30">
        <div className="bg-[#1a1208] px-4 py-3 border-b border-[#7a6030]/30 flex justify-between items-center">
          <h3 className="text-[#c9a84c] text-sm uppercase tracking-wider">Active Rooms ({rooms.length})</h3>
          <button
            onClick={fetchRooms}
            disabled={loading}
            className="px-3 py-1.5 bg-[#0f1510] border border-[#5a9e6f]/50 text-[#5a9e6f] text-xs uppercase hover:bg-[#5a9e6f] hover:text-[#0a0a0f] transition-all disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="p-4 text-[#7a6030]">No active rooms</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#15151a]">
                <tr>
                  <th className="text-left px-4 py-2 text-[#7a6030] font-normal">Room Code</th>
                  <th className="text-left px-4 py-2 text-[#7a6030] font-normal">Status</th>
                  <th className="text-left px-4 py-2 text-[#7a6030] font-normal">Players</th>
                  <th className="text-left px-4 py-2 text-[#7a6030] font-normal">Difficulty</th>
                  <th className="text-left px-4 py-2 text-[#7a6030] font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.roomCode} className="border-b border-[#7a6030]/20">
                    <td className="px-4 py-2 text-[#c9a84c] font-mono">{room.roomCode}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs uppercase ${room.status === 'playing' ? 'text-[#c9a84c]' : 'text-[#5a9e6f]'}`}>
                        {room.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[#e8dcc0]">{room.playerCount}/2</td>
                    <td className="px-4 py-2 text-[#7a6030] capitalize">{room.difficulty}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleCloseRoom(room.roomCode)}
                        className="text-[#8b1a1a] hover:text-[#c96a6a] text-xs uppercase"
                      >
                        Force Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-[#0f0f14] border border-[#7a6030]/30 p-4">
        <h3 className="text-[#c9a84c] text-sm uppercase tracking-wider mb-3">Global Broadcast</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Notification Title"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-4 py-2 text-sm focus:outline-none focus:border-[#c9a84c]"
          />
          <textarea
            placeholder="Notification Body"
            value={broadcastBody}
            onChange={(e) => setBroadcastBody(e.target.value)}
            rows={3}
            className="w-full bg-[#0a0a0f] border border-[#7a6030]/50 text-[#e8dcc0] px-4 py-2 text-sm focus:outline-none focus:border-[#c9a84c] resize-none"
          />
          <button
            onClick={handleBroadcast}
            className="px-4 py-2 bg-[#1a0f0f] border border-[#c9a84c]/50 text-[#c9a84c] text-xs uppercase hover:bg-[#c9a84c] hover:text-[#0a0a0f] transition-all"
          >
            Send Broadcast
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Admin Dashboard Component
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('players');
  const currentUser = useGameStore((state) => state.currentUser);

  const tabs = [
    { id: 'players', label: 'Players', component: PlayerManagement },
    { id: 'leaderboards', label: 'Leaderboards', component: LeaderboardManagement },
    { id: 'content', label: 'Content', component: ContentManagement },
    { id: 'multiplayer', label: 'Multiplayer', component: MultiplayerOversight },
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || PlayerManagement;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#c9a84c] font-mono">
      {/* Header */}
      <header className="bg-[#0f0f14] border-b border-[#7a6030]/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#c9a84c] rounded-full animate-pulse"></div>
            <h1 className="text-xl uppercase tracking-widest text-[#c9a84c] font-bold">
              SYSTEM OVERRIDE // ADMIN DASHBOARD
            </h1>
          </div>
          <div className="text-xs text-[#7a6030]">
            {currentUser?.email} • {new Date().toLocaleString()}
          </div>
        </div>
      </header>

      <div className="flex" style={{ minHeight: 'calc(100vh - 73px)' }}>
        {/* Sidebar */}
        <aside className="w-60 bg-[#0f0f14] border-r border-[#7a6030]/30 flex flex-col">
          <nav className="p-4 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 text-sm uppercase tracking-wider border transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#c9a84c] text-[#0a0a0f] border-[#c9a84c]'
                    : 'bg-transparent text-[#7a6030] border-transparent hover:text-[#c9a84c] hover:border-[#7a6030]/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto p-4 border-t border-[#7a6030]/30">
            <div className="text-[#5a9e6f] text-xs uppercase tracking-wider mb-2">System Status</div>
            <div className="flex items-center gap-2 text-xs text-[#7a6030]">
              <span className="w-2 h-2 bg-[#5a9e6f] rounded-full"></span>
              Online
            </div>
            <div className="mt-2 text-[#8b1a1a] text-xs uppercase tracking-wider">
              ⚠ Authorized Access Only
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl">
            <h2 className="text-lg uppercase tracking-wider text-[#c9a84c] mb-6 border-b border-[#7a6030]/30 pb-3">
              {tabs.find(t => t.id === activeTab)?.label} Management
            </h2>
            <ActiveComponent />
          </div>
        </main>
      </div>
    </div>
  );
}
