import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { authService } from '@/config/FirebaseConfig';
import { auth } from '@/config/FirebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/config/FirebaseConfig';
import { useRouter } from 'expo-router';

const ProfileScreen = () => {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Load profile immediately from Auth
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser?.displayName) {
      setDisplayName(currentUser.displayName);
      setLoading(false);
    }
    
    // Then try to load from Firestore in the background
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      // Try to get the Firestore profile
      const userRef = doc(firestore, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.displayName) {
          setDisplayName(userData.displayName);
        }
      } else if (!displayName) {
        // If no Firestore document and no display name set, create one with Auth data
        const defaultProfile = {
          email: currentUser.email,
          displayName: currentUser.displayName || '',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        try {
          await setDoc(userRef, defaultProfile);
        } catch (error) {
          console.warn('Failed to create default profile:', error);
        }
      }
    } catch (error) {
      console.warn('Error loading profile from Firestore:', error);
      // Don't show alert unless we have no display name at all
      if (!displayName && !currentUser.displayName) {
        Alert.alert(
          'Warning',
          'Some profile features may be limited while offline.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    const newDisplayName = displayName.trim();
    if (!newDisplayName) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    // Don't update if the name hasn't changed
    if (newDisplayName === auth.currentUser?.displayName) {
      Alert.alert('Info', 'Display name is already up to date');
      return;
    }

    setUpdating(true);
    try {
      // Update Auth and Firestore
      await authService.updateUserProfile(newDisplayName);
      
      // Update local state immediately
      setDisplayName(newDisplayName);
      
      // Show success message
      Alert.alert(
        'Success',
        'Profile updated successfully. Changes will sync when online.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      
      if (error.code === 'auth/network-request-failed') {
        Alert.alert(
          'Network Error',
          'Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to update profile. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      await authService.logoutUser();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert(
        'Error',
        'Failed to log out. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your display name"
              autoCapitalize="words"
              editable={!updating}
              maxLength={50}
            />
            <Text style={styles.hint}>
              This name will be visible to other players when you sign up for courts
            </Text>
          </View>

          <TouchableOpacity 
            style={[
              styles.button, 
              updating && styles.buttonDisabled,
              !displayName.trim() && styles.buttonDisabled
            ]}
            onPress={handleUpdateProfile}
            disabled={updating || !displayName.trim()}
          >
            {updating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Update Profile</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.logoutButton, loggingOut && styles.buttonDisabled]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Log Out</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
});

export default ProfileScreen; 