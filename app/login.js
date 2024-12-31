import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { authService } from '@/config/FirebaseConfig';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter all fields");
      return;
    }

    setLoading(true);
    try {
      const user = await authService.loginUser(email.trim(), password);
      
      // Navigate immediately after successful auth
      router.replace('/(tabs)');
      
      // Update user document in the background
      authService.ensureUserDocument(user).catch(error => {
        console.warn('Background user document update error:', error);
      });
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Failed to sign in. Please try again.";
      
      if (error.code === 'auth/invalid-credential' || 
          error.code === 'auth/invalid-email' || 
          error.code === 'auth/wrong-password' || 
          error.code === 'auth/user-not-found') {
        errorMessage = "Incorrect email or password";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={styles.container}
    >
      <Text style={styles.title}>Let's Sign You In</Text>
      <Text style={styles.subtitle}>Welcome Back</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.signInButton,
          (loading || !email.trim() || !password) && styles.buttonDisabled
        ]}
        onPress={onSignIn}
        disabled={loading || !email.trim() || !password}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.createAccountButton}
        onPress={() => router.push('/signup')}
        disabled={loading}
      >
        <Text style={styles.createAccountText}>Create Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 25,
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: 80,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 30,
  },
  subtitle: {
    fontSize: 30,
    color: '#666',
    marginTop: 20,
  },
  inputContainer: {
    marginTop: 20,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 15,
    borderColor: '#ddd',
  },
  signInButton: {
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    marginTop: 50,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  createAccountButton: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  createAccountText: {
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: 'bold',
  },
}); 