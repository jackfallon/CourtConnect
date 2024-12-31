import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Image, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl
} from 'react-native';
import { friendsService } from '../services/friendsService';
import { useAuth } from '../contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const FriendsScreen = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [friends, setFriends] = useState([]);
  const [activeFriends, setActiveFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Debug auth state
  useEffect(() => {
    console.log('Auth State:', { currentUser, authLoading });
  }, [currentUser, authLoading]);

  // Load friends data
  const loadFriendsData = useCallback(async () => {
    if (authLoading) {
      console.log('Auth is still loading...');
      return;
    }

    if (!currentUser?.uid) {
      console.log('No current user found:', currentUser);
      setLoading(false);
      setError('Please sign in to view friends');
      return;
    }

    try {
      console.log('Loading friends data for user:', currentUser.uid);
      setError(null);
      const [friendsList, active] = await Promise.all([
        friendsService.getFriends(currentUser.uid),
        friendsService.getActiveFriends(currentUser.uid)
      ]);
      
      setFriends(friendsList);
      setActiveFriends(active);
    } catch (err) {
      console.error('Error loading friends data:', err);
      setError('Failed to load friends data');
    }
  }, [currentUser, authLoading]);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFriendsData();
    setRefreshing(false);
  }, [loadFriendsData]);

  // Subscribe to friend requests
  useEffect(() => {
    let unsubscribe;
    
    if (currentUser) {
      unsubscribe = friendsService.subscribeFriendRequests(
        currentUser.uid,
        (requests) => setFriendRequests(requests)
      );
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  // Load initial data when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused, loading data...');
      setLoading(true);
      loadFriendsData().finally(() => setLoading(false));
    }, [loadFriendsData])
  );

  const handleSendRequest = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setSendingRequest(true);
    try {
      await friendsService.sendFriendRequest(currentUser.uid, email.trim());
      Alert.alert('Success', 'Friend request sent successfully!');
      setEmail('');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await friendsService.acceptFriendRequest(requestId);
      await loadFriendsData();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await friendsService.rejectFriendRequest(requestId);
    } catch (error) {
      Alert.alert('Error', 'Failed to reject friend request');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await friendsService.removeFriend(currentUser.uid, friendId);
              await loadFriendsData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove friend');
            }
          }
        }
      ]
    );
  };

  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading authentication...</Text>
      </View>
    );
  }

  if (!currentUser?.uid) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Please sign in to view friends</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading friends...</Text>
      </View>
    );
  }

  const renderFriendItem = ({ item }) => (
    <View style={styles.friendItem}>
      <Image 
        source={{ uri: item.profilePicture || 'https://via.placeholder.com/50' }} 
        style={styles.profileImage}
      />
      <View style={styles.friendDetails}>
        <Text style={styles.friendName}>{item.displayName}</Text>
        <Text style={styles.emailText}>{item.email}</Text>
      </View>
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => handleRemoveFriend(item.uid)}
      >
        <MaterialIcons name="person-remove" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  const renderActiveFriendItem = ({ item }) => (
    <View style={styles.friendItem}>
      <Image 
        source={{ uri: item.friend.profilePicture || 'https://via.placeholder.com/50' }} 
        style={styles.profileImage} 
      />
      <View style={styles.friendDetails}>
        <Text style={styles.friendName}>{item.friend.displayName}</Text>
        <Text style={styles.courtInfo}>Playing at {item.court.name}</Text>
        <Text style={styles.timeInfo}>
          {new Date(item.bookingTime).toLocaleTimeString()} - {new Date(item.endTime).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );

  const renderFriendRequest = ({ item }) => (
    <View style={styles.friendRequestItem}>
      <Image 
        source={{ uri: item.sender.profilePicture || 'https://via.placeholder.com/50' }} 
        style={styles.profileImage} 
      />
      <View style={styles.requestDetails}>
        <Text style={styles.friendName}>{item.sender.displayName}</Text>
        <Text style={styles.emailText}>{item.sender.email}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptRequest(item.id)}
        >
          <MaterialIcons name="check" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleRejectRequest(item.id)}
        >
          <MaterialIcons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.addFriendSection}>
        <Text style={styles.sectionTitle}>Add Friend</Text>
        <View style={styles.addFriendInputContainer}>
          <TextInput
            style={styles.emailInput}
            placeholder="Enter friend's email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!sendingRequest}
          />
          <TouchableOpacity
            style={[styles.sendButton, sendingRequest && styles.sendButtonDisabled]}
            onPress={handleSendRequest}
            disabled={sendingRequest}
          >
            {sendingRequest ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send Request</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={friends}
        ListHeaderComponent={
          <>
            {friendRequests.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Friend Requests</Text>
                <FlatList
                  data={friendRequests}
                  renderItem={renderFriendRequest}
                  keyExtractor={(item) => item.id}
                  style={styles.requestsList}
                  scrollEnabled={false}
                />
              </>
            )}
            
            {activeFriends.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Active Friends</Text>
                <FlatList
                  data={activeFriends}
                  renderItem={renderActiveFriendItem}
                  keyExtractor={(item) => item.friend.uid}
                  style={styles.activeList}
                  scrollEnabled={false}
                />
              </>
            )}

            <Text style={styles.sectionTitle}>All Friends</Text>
          </>
        }
        renderItem={renderFriendItem}
        keyExtractor={(item) => item.uid}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyMessage}>
            {error || "You don't have any friends yet"}
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addFriendSection: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    marginHorizontal: 15,
    marginTop: 15,
  },
  addFriendInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emailInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: 'white',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  friendRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  friendDetails: {
    flex: 1,
  },
  requestDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  courtInfo: {
    fontSize: 14,
    color: '#007AFF',
  },
  timeInfo: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  removeButton: {
    padding: 10,
  },
  requestsList: {
    marginBottom: 15,
  },
  activeList: {
    marginBottom: 15,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 20,
    marginHorizontal: 20,
  },
});

export default FriendsScreen;