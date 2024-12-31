import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  getDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { firestore } from '@/config/FirebaseConfig';

const db = firestore;

// Helper function to get user data by ID
const getUserById = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    return {
      uid: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

export const friendsService = {
  // Find user by email
  findUserByEmail: async (email) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('User not found');
      }
      
      const userDoc = querySnapshot.docs[0];
      return {
        uid: userDoc.id,
        ...userDoc.data()
      };
    } catch (error) {
      console.error('Error finding user:', error);
      throw error;
    }
  },

  // Send friend request
  sendFriendRequest: async (senderUserId, recipientEmail) => {
    try {
      // Find recipient user
      const recipient = await friendsService.findUserByEmail(recipientEmail);
      
      if (!recipient) {
        throw new Error('User not found');
      }

      if (senderUserId === recipient.uid) {
        throw new Error('Cannot send friend request to yourself');
      }

      // Check if they're already friends
      const friendshipsRef = collection(db, 'friendships');
      const existingFriendshipQuery = query(
        friendshipsRef,
        where('users', 'array-contains', senderUserId)
      );
      const existingFriendships = await getDocs(existingFriendshipQuery);
      
      const alreadyFriends = existingFriendships.docs.some(doc => {
        const data = doc.data();
        return data.users.includes(recipient.uid) && data.status === 'accepted';
      });

      if (alreadyFriends) {
        throw new Error('Already friends with this user');
      }

      // Check for existing requests
      const requestsRef = collection(db, 'friendRequests');
      const existingRequestQuery = query(
        requestsRef,
        where('senderId', '==', senderUserId),
        where('receiverId', '==', recipient.uid)
      );
      const existingRequest = await getDocs(existingRequestQuery);
      
      if (!existingRequest.empty) {
        throw new Error('Friend request already sent');
      }

      // Check for incoming request from the same user
      const incomingRequestQuery = query(
        requestsRef,
        where('senderId', '==', recipient.uid),
        where('receiverId', '==', senderUserId)
      );
      const incomingRequest = await getDocs(incomingRequestQuery);
      
      if (!incomingRequest.empty) {
        throw new Error('This user has already sent you a friend request');
      }

      // Create the friend request
      await addDoc(requestsRef, {
        senderId: senderUserId,
        receiverId: recipient.uid,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      return recipient;
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  },

  // Accept friend request
  acceptFriendRequest: async (requestId) => {
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        throw new Error('Friend request not found');
      }

      const request = requestDoc.data();
      
      // Create friendship document
      const friendshipsRef = collection(db, 'friendships');
      await addDoc(friendshipsRef, {
        users: [request.senderId, request.receiverId],
        status: 'accepted',
        timestamp: serverTimestamp()
      });

      // Delete the request
      await deleteDoc(requestRef);

      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  },

  // Reject friend request
  rejectFriendRequest: async (requestId) => {
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      await deleteDoc(requestRef);
      return true;
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      throw error;
    }
  },

  // Get all friends
  getFriends: async (userId) => {
    try {
      const friendshipsRef = collection(db, 'friendships');
      const q = query(
        friendshipsRef,
        where('users', 'array-contains', userId),
        where('status', '==', 'accepted')
      );
      
      const friendDocs = await getDocs(q);
      const friendPromises = friendDocs.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const friendId = data.users.find(id => id !== userId);
        return await getUserById(friendId);
      });

      return await Promise.all(friendPromises);
    } catch (error) {
      console.error('Error getting friends:', error);
      throw error;
    }
  },

  // Get active friends (those currently on courts)
  getActiveFriends: async (userId) => {
    try {
      // Get all friends first
      const friends = await friendsService.getFriends(userId);
      if (friends.length === 0) return [];

      // Get active bookings for these friends
      const friendIds = friends.map(friend => friend.uid);
      const bookingsRef = collection(db, 'courtBookings');
      const activeBookingsQuery = query(
        bookingsRef,
        where('userId', 'in', friendIds),
        where('endTime', '>', new Date())
      );
      
      const bookingDocs = await getDocs(activeBookingsQuery);
      const activeBookings = bookingDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Combine booking and friend data
      return activeBookings.map(booking => {
        const friend = friends.find(f => f.uid === booking.userId);
        return {
          friend,
          court: booking.court,
          bookingTime: booking.startTime.toDate(),
          endTime: booking.endTime.toDate()
        };
      });
    } catch (error) {
      console.error('Error getting active friends:', error);
      throw error;
    }
  },

  // Get friend requests
  getFriendRequests: async (userId) => {
    try {
      const requestsRef = collection(db, 'friendRequests');
      const q = query(
        requestsRef,
        where('receiverId', '==', userId),
        where('status', '==', 'pending')
      );
      
      const requestDocs = await getDocs(q);
      const requestPromises = requestDocs.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const sender = await getUserById(data.senderId);
        return {
          id: docSnap.id,
          ...data,
          sender
        };
      });

      return await Promise.all(requestPromises);
    } catch (error) {
      console.error('Error getting friend requests:', error);
      throw error;
    }
  },

  // Subscribe to friend requests (real-time updates)
  subscribeFriendRequests: (userId, callback) => {
    const requestsRef = collection(db, 'friendRequests');
    const q = query(
      requestsRef,
      where('receiverId', '==', userId),
      where('status', '==', 'pending')
    );
    
    return onSnapshot(q, async (snapshot) => {
      try {
        const requests = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const sender = await getUserById(data.senderId);
            return {
              id: doc.id,
              ...data,
              sender
            };
          })
        );
        callback(requests);
      } catch (error) {
        console.error('Error in friend requests subscription:', error);
        callback([]);
      }
    });
  },

  // Remove friend
  removeFriend: async (userId, friendId) => {
    try {
      const friendshipsRef = collection(db, 'friendships');
      const q = query(
        friendshipsRef,
        where('users', 'array-contains', userId),
        where('status', '==', 'accepted')
      );
      
      const friendDocs = await getDocs(q);
      const friendshipToDelete = friendDocs.docs.find(doc => {
        const data = doc.data();
        return data.users.includes(friendId);
      });

      if (friendshipToDelete) {
        await deleteDoc(doc(db, 'friendships', friendshipToDelete.id));
        return true;
      }
      
      throw new Error('Friendship not found');
    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
  }
};

// Firestore Data Model Example
const userSchema = {
  uid: 'string',
  email: 'string',
  displayName: 'string',
  profilePicture: 'string (optional)',
  location: {
    city: 'string',
    state: 'string',
    country: 'string'
  },
  skills: {
    skillLevel: 'beginner|intermediate|advanced',
    preferredPosition: 'string'
  }
};

const courtBookingSchema = {
  courtId: 'string',
  bookedBy: 'string (user ID)',
  timeslot: 'datetime',
  status: 'active|completed|cancelled',
  players: ['string (user IDs)']
};