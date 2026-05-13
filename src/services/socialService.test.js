import { 
  sendGameInvite, 
  listenToIncomingGameInvites, 
  resolveGameInvite 
} from './socialService';
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

// Mock the Firebase db
jest.mock('./firebase', () => ({
  db: {}
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn()
}));

describe('socialService.js - Multiplayer Invites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendGameInvite', () => {
    it('should throw an error if an invite is already pending', async () => {
      // Setup mock to simulate a non-empty snapshot (pending invite exists)
      getDocs.mockResolvedValueOnce({ empty: false });
      
      await expect(sendGameInvite('userA', 'userB', 'ROOM123'))
        .rejects
        .toThrow('An invite is already pending for this contact.');
        
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('should add a new invite document if no pending invite exists', async () => {
      // Simulate empty snapshot (no pending invites)
      getDocs.mockResolvedValueOnce({ empty: true });
      collection.mockReturnValueOnce('mockInvitesCollection');
      
      await sendGameInvite('userA', 'userB', 'ROOM123');
      
      expect(addDoc).toHaveBeenCalledWith('mockInvitesCollection', expect.objectContaining({
        senderId: 'userA',
        receiverId: 'userB',
        roomCode: 'ROOM123',
        status: 'pending'
      }));
    });
  });

  describe('listenToIncomingGameInvites', () => {
    it('should fetch user data and return formatted invites via callback', async () => {
      const mockCallback = jest.fn();
      
      // Mock onSnapshot to immediately call its callback with a mock snapshot
      onSnapshot.mockImplementation((q, snapCallback) => {
        snapCallback({
          docs: [
            {
              id: 'invite1',
              data: () => ({ senderId: 'userA', receiverId: 'userB', status: 'pending', roomCode: 'ROOM123' })
            }
          ]
        });
        return jest.fn(); // Mock unsubscribe function
      });
      
      // Mock getDoc for the fetchUserData call inside the mapping
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ username: 'Agent Alpha', friendCode: 'ALPHA1' })
      });
      
      listenToIncomingGameInvites('userB', mockCallback);
      
      // Since fetchUserData makes async getDoc calls inside map, we need to wait a tick
      await new Promise(process.nextTick);

      expect(onSnapshot).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith([
        {
          id: 'invite1',
          senderId: 'userA',
          receiverId: 'userB',
          status: 'pending',
          roomCode: 'ROOM123',
          senderUsername: 'Agent Alpha',
          senderFriendCode: 'ALPHA1'
        }
      ]);
    });
  });

  describe('resolveGameInvite', () => {
    it('should update the invite status to the provided status (accepted/declined)', async () => {
      doc.mockReturnValueOnce('mockDocRef');
      
      // Test accepting the invite
      await resolveGameInvite('invite1', 'accepted');
      
      expect(doc).toHaveBeenCalledWith(db, 'gameInvites', 'invite1');
      expect(updateDoc).toHaveBeenCalledWith('mockDocRef', expect.objectContaining({
        status: 'accepted'
      }));
    });
  });
});
