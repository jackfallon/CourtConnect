import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export function useRequireAuth() {
  const { currentUser, loading } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!loading && !currentUser) {
      navigation.navigate('Login');
    }
  }, [currentUser, loading, navigation]);

  return { currentUser, loading };
} 