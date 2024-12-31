import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRequireAuth } from '../hooks/useRequireAuth';

const ProtectedScreen = () => {
  const { currentUser, loading } = useRequireAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text>Protected Content</Text>
      {/* Your protected content here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProtectedScreen; 