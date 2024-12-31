import React, { createContext, useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  onAuthStateChanged,
} from 'firebase/auth';
import { authService } from '../config/FirebaseConfig';

const AuthContext = createContext({
  currentUser: null,
  loading: true,
  signup: async () => {},
  login: async () => {},
  logout: async () => {},
  updateUserProfile: async () => {},
  getCurrentUserProfile: async () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    console.log('Setting up auth state listener');
    
    const unsubscribe = onAuthStateChanged(authService.auth, async (user) => {
      console.log('Auth state changed:', user ? `User logged in: ${user.email}` : 'No user');
      
      try {
        if (user) {
          // Ensure user document exists and get profile
          await authService.ensureUserDocument(user);
          const userProfile = await authService.getCurrentUserProfile();
          console.log('User profile loaded:', userProfile?.email);
          setCurrentUser(userProfile);
        } else {
          console.log('Setting current user to null');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Signup function
  const signup = async (email, password, displayName) => {
    try {
      setLoading(true);
      const user = await authService.registerUser(email, password, { displayName });
      return user;
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const user = await authService.loginUser(email, password);
      return user;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      await authService.logoutUser();
    } finally {
      setLoading(false);
    }
  };

  // Update User Profile
  const updateUserProfile = async (updates) => {
    try {
      setLoading(true);
      await authService.updateUserProfile(updates);
      const updatedProfile = await authService.getCurrentUserProfile();
      setCurrentUser(updatedProfile);
      return updatedProfile;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    updateUserProfile,
    getCurrentUserProfile: authService.getCurrentUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};