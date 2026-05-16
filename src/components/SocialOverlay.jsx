import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { sendFriendRequest, listenToPendingRequests, acceptFriendRequest, listenToFriendsList, sendGameInvite, listenToIncomingGameInvites, resolveGameInvite } from '../services/socialService';
import { useSfx } from '../hooks/useSfx';
import { Check, Users, Mail, UserPlus, AlertCircle, Swords, X, Loader2 } from 'lucide-react';

export default function SocialOverlay({ activeRoomCode = null, onAcceptGameInvite = () => {}, onDirectChallenge = () => {}, challengingUid = null }) {
  const { currentUser } = useGameStore();
  const { playClick, playKeyTap } = useSfx();

  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [pendingRequests, setPendingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incomingGameInvites, setIncomingGameInvites] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    
    // Set up real-time listeners for friend requests and accepted friends
    const unsubPending = listenToPendingRequests(currentUser.uid, (requests) => {
      setPendingRequests(requests);
    });

    const unsubFriends = listenToFriendsList(currentUser.uid, (friendList) => {
      setFriends(friendList);
    });

    const unsubInvites = listenToIncomingGameInvites(currentUser.uid, (invites) => {
      setIncomingGameInvites(invites);
    });

    return () => {
      unsubPending();
      unsubFriends();
      unsubInvites();
    };
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center w-full md:w-80 h-full bg-[#1a1208]/95 border-l border-[#c9a84c]/30 shadow-[-10px_0_30px_rgba(0,0,0,0.8)] p-6 font-['Special_Elite'] text-[#e8dcc0]">
        <AlertCircle size={32} className="text-[#8b1a1a] mb-4 opacity-50" />
        <p className="text-center text-[#7a6030] text-xs tracking-[0.2em] uppercase leading-loose">
          Secure connection<br/>requires authorization.
          <br/><br/>
          Return to main menu<br/>to verify identity.
        </p>
      </div>
    );
  }

  const handleSendWire = async () => {
    playClick();
    setError('');
    setSuccess('');

    if (!inviteCode.trim() || inviteCode.length !== 8) {
      setError('Invalid code format. (8 chars required)');
      return;
    }

    setIsLoading(true);
    try {
      await sendFriendRequest(currentUser.uid, inviteCode);
      setSuccess('Wire dispatched successfully.');
      setInviteCode('');
    } catch (err) {
      setError(err.message || 'Transmission failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (docId) => {
    playClick();
    try {
      await acceptFriendRequest(docId, currentUser.uid);
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  const handleSendGameInvite = async (friendUid) => {
    playClick();
    if (!activeRoomCode) return;
    try {
      await sendGameInvite(currentUser.uid, friendUid, activeRoomCode);
    } catch (err) {
      console.error('Failed to send game invite:', err);
    }
  };

  const handleDirectChallenge = (friendUid) => {
    playClick();
    onDirectChallenge(friendUid);
  };

  return (
    <div className="flex flex-col w-full md:w-80 h-full bg-[#1a1208]/95 border-l border-[#c9a84c]/30 shadow-[-10px_0_30px_rgba(0,0,0,0.8)] p-6 font-['Special_Elite'] text-[#e8dcc0] overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col items-center mb-8 border-b border-[#7a6030]/50 pb-6">
        <Users size={32} className="text-[#c9a84c] mb-2" />
        <h2 className="font-['Playfair_Display'] text-2xl tracking-widest text-[#e8c96a] uppercase text-center">Social Intel</h2>
        <p className="text-[10px] text-[#7a6030] tracking-[0.2em] mt-1 text-center">Your Intercept Frequency:</p>
        <div className="bg-[#0e0a04] border border-[#c9a84c]/50 px-4 py-2 mt-2 font-mono text-xl text-[#e8c96a] tracking-[0.3em] select-all shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] text-center w-full">
          {currentUser.friendCode}
        </div>
      </div>

      {/* Invite Section */}
      <div className="mb-8">
        <h3 className="text-xs text-[#c9a84c] tracking-[0.2em] uppercase mb-3 flex items-center gap-2"><UserPlus size={14}/> Dispatch Wire</h3>
        
        {error && (
          <div className="mb-3 p-2 bg-[#2a0808]/80 border border-[#8b1a1a]/50 text-[#ff6b6b] text-[10px] flex items-start gap-2 leading-relaxed">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-3 p-2 bg-[#0a1a0f]/80 border border-[#5a9e6f]/50 text-[#5a9e6f] text-[10px] flex items-start gap-2 leading-relaxed">
            <Check size={12} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <input 
            type="text" 
            value={inviteCode}
            maxLength={8}
            onChange={(e) => {
              setInviteCode(e.target.value.toUpperCase());
              if (e.nativeEvent.inputType !== 'deleteContentBackward') playKeyTap();
            }}
            placeholder="8-CHAR CODE"
            className="w-full bg-[#0e0a04] border border-[#7a6030]/50 text-[#e8dcc0] font-mono px-3 py-2 text-center tracking-[0.3em] uppercase focus:outline-none focus:border-[#c9a84c] transition-colors placeholder:text-[#7a6030]/50 placeholder:text-xs"
          />
          <button 
            onClick={handleSendWire}
            disabled={isLoading}
            className="w-full py-2 bg-[#1a1208]/60 border border-[#c9a84c]/60 text-[#c9a84c] text-xs tracking-[0.2em] uppercase hover:bg-[#32230c] hover:border-[#c9a84c] hover:text-[#e8c96a] transition-all disabled:opacity-50"
          >
            {isLoading ? 'Transmitting...' : 'Send Wire'}
          </button>
        </div>
      </div>

      {/* Game Invites */}
      {incomingGameInvites.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs text-[#5a9e6f] tracking-[0.2em] uppercase mb-3 flex items-center gap-2">
            <Swords size={14}/> Incoming Duels 
            <span className="bg-[#5a9e6f] text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-[0_0_5px_#5a9e6f]">{incomingGameInvites.length}</span>
          </h3>
          
          <div className="flex flex-col gap-3">
            {incomingGameInvites.map((invite) => (
              <div key={invite.id} className="bg-[#0a1a0f]/50 border border-[#5a9e6f]/30 p-3 flex flex-col gap-2 relative overflow-hidden animate-pulse">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#5a9e6f]"></div>
                <div className="pl-2">
                  <p className="text-sm text-[#e8c96a] font-['Playfair_Display'] truncate">{invite.senderUsername} challenges you</p>
                  <p className="text-[9px] text-[#5a9e6f] tracking-widest font-mono">ROOM: {invite.roomCode}</p>
                </div>
                <div className="flex gap-2 mt-1">
                  <button 
                    onClick={() => {
                       playClick();
                       resolveGameInvite(invite.id, 'accepted', currentUser.uid);
                       onAcceptGameInvite(invite.roomCode);
                    }}
                    className="flex-1 py-1.5 bg-[#0a1a0f]/80 border border-[#5a9e6f]/40 text-[#5a9e6f] text-[10px] tracking-widest uppercase hover:bg-[#5a9e6f] hover:text-[#0e0a04] transition-all flex justify-center items-center gap-1"
                  >
                    <Check size={10}/> Accept
                  </button>
                  <button 
                    onClick={() => {
                       playClick();
                       resolveGameInvite(invite.id, 'declined', currentUser.uid);
                    }}
                    className="flex-1 py-1.5 bg-[#1a0f0f]/80 border border-[#8b1a1a]/40 text-[#8b1a1a] text-[10px] tracking-widest uppercase hover:bg-[#8b1a1a] hover:text-[#0e0a04] transition-all flex justify-center items-center gap-1"
                  >
                    <X size={10}/> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Wires */}
      <div className="mb-8">
        <h3 className="text-xs text-[#c9a84c] tracking-[0.2em] uppercase mb-3 flex items-center gap-2">
          <Mail size={14}/> Pending Wires 
          {pendingRequests.length > 0 && <span className="bg-[#8b1a1a] text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-[0_0_5px_#8b1a1a]">{pendingRequests.length}</span>}
        </h3>
        
        <div className="flex flex-col gap-3">
          {pendingRequests.length === 0 ? (
            <p className="text-[10px] text-[#7a6030] italic">No incoming transmissions.</p>
          ) : (
            pendingRequests.map((req) => (
              <div key={req.id} className="bg-[#2a1e0e]/50 border border-[#7a6030]/30 p-3 flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#c9a84c]"></div>
                <div className="pl-2">
                  <p className="text-sm text-[#e8c96a] font-['Playfair_Display'] truncate">{req.senderUsername}</p>
                  <p className="text-[9px] text-[#7a6030] tracking-widest font-mono">CODE: {req.senderFriendCode}</p>
                </div>
                <button 
                  onClick={() => handleAccept(req.id)}
                  className="mt-1 flex items-center justify-center gap-1 w-full py-1.5 bg-[#0a1a0f]/40 border border-[#5a9e6f]/40 text-[#5a9e6f] text-[10px] tracking-widest uppercase hover:bg-[#0a1a0f]/80 hover:border-[#5a9e6f] transition-all"
                >
                  <Check size={12}/> Accept
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Verified Contacts */}
      <div className="flex-1">
        <h3 className="text-xs text-[#c9a84c] tracking-[0.2em] uppercase mb-3 flex items-center gap-2"><Users size={14}/> Verified Contacts</h3>
        
        <div className="flex flex-col gap-2">
          {friends.length === 0 ? (
            <p className="text-[10px] text-[#7a6030] italic">No contacts established.</p>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="bg-[#1a1208] border border-[#7a6030]/20 p-3 flex items-center justify-between hover:bg-[#2a1e0e] transition-colors group">
                <div className="flex flex-col max-w-[45%]">
                  <span className="text-sm text-[#e8c96a] font-['Playfair_Display'] group-hover:text-[#fff] transition-colors truncate">{friend.username}</span>
                  <span className="text-[9px] text-[#7a6030] tracking-widest font-mono">{friend.friendCode}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Existing room invite — only when host has a room */}
                  {activeRoomCode && (
                     <button
                       onClick={() => handleSendGameInvite(friend.friendUid)}
                       className="text-[9px] bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/30 px-2 py-1 hover:bg-[#c9a84c] hover:text-[#0e0a04] transition-all uppercase tracking-widest"
                     >
                       Invite
                     </button>
                  )}
                  {/* Direct Challenge — always visible when NOT already hosting a room */}
                  {!activeRoomCode && (
                    <button
                      onClick={() => handleDirectChallenge(friend.friendUid)}
                      disabled={challengingUid === friend.friendUid}
                      className="text-[9px] bg-[#8b1a1a]/10 text-[#ff6b6b] border border-[#8b1a1a]/40 px-2 py-1 hover:bg-[#8b1a1a] hover:text-[#e8dcc0] transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {challengingUid === friend.friendUid ? (
                        <><Loader2 size={10} className="animate-spin" /> Sending...</>
                      ) : (
                        <><Swords size={10} /> Challenge</>
                      )}
                    </button>
                  )}
                  {/* Status indicator (green dot) */}
                  <div className="w-2 h-2 rounded-full bg-[#5a9e6f] shadow-[0_0_5px_#5a9e6f]"></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
