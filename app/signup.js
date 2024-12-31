import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { authService } from '@/config/FirebaseConfig';

const SignUp = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const OnCreateAccount = async () => {
    // Validate inputs
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail || !password || !trimmedName) {
      Alert.alert("Error", "Please enter all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      console.log('Starting registration process...');
      const user = await authService.registerUser(trimmedEmail, password, {
        displayName: trimmedName
      });
      
      console.log('Registration successful, user:', user.uid);
      
      // Navigate immediately after successful auth
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = "Failed to create account. Please try again.";
      
      if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please try signing in instead.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use a stronger password.";
      }
      
      Alert.alert(
        "Error",
        errorMessage,
        [
          {
            text: "OK",
            onPress: () => setLoading(false)
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create New Account</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!loading}
          maxLength={50}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
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
          placeholder="Enter password (min. 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.createButton, 
          (loading || !email.trim() || !password || !name.trim()) && styles.buttonDisabled
        ]}
        onPress={OnCreateAccount}
        disabled={loading || !email.trim() || !password || !name.trim()}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.signInButton}
        onPress={() => router.push('/login')}
        disabled={loading}
      >
        <Text style={styles.signInText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 25,
    paddingTop: 50,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 20,
  },
  inputContainer: {
    marginTop: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    color: '#666',
  },
  input: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 15,
    borderColor: '#ddd',
    fontSize: 16,
  },
  createButton: {
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    marginTop: 50,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  signInButton: {
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
    fontSize: 16,
  },
  signInText: {
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 