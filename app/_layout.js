import { Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { auth } from '@/config/FirebaseConfig';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Set up an auth state listener
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        // User is not authenticated, redirect to login
        router.replace('/login');
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
    </Stack>
  );
} 