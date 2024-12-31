import React, { useState, useEffect, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  ActivityIndicator, 
  Modal, 
  Text, 
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  TextInput,
  Keyboard
} from 'react-native';
import * as Location from 'expo-location';
import { firestore, auth } from '@/config/FirebaseConfig';
import { collection, doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { Calendar } from 'react-native-calendars';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const MapScreen = () => {
  const [location, setLocation] = useState(null);
  const [courts, setCourts] = useState([]);
  const [filteredCourts, setFilteredCourts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [signedUpPlayers, setSignedUpPlayers] = useState([]);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const [userSignups, setUserSignups] = useState({});
  const [playerNames, setPlayerNames] = useState({});
  const [currentUserName, setCurrentUserName] = useState(null);
  const [courtListeners, setCourtListeners] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Add snapshot listener for user data
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const userRef = doc(firestore, 'users', userId);
    const unsubscribe = onSnapshot(userRef, 
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          const displayName = userData.displayName || auth.currentUser?.displayName || 'Anonymous Player';
          setCurrentUserName(displayName);
          setPlayerNames(prev => ({
            ...prev,
            [userId]: displayName
          }));
        } else if (auth.currentUser?.displayName) {
          setCurrentUserName(auth.currentUser.displayName);
          setPlayerNames(prev => ({
            ...prev,
            [userId]: auth.currentUser.displayName
          }));
        }
      },
      (error) => {
        console.warn('Error listening to user profile:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const fetchPlayerNames = async (signups) => {
    const userIds = new Set();
    Object.values(signups).forEach(players => {
      players.forEach(playerId => userIds.add(playerId));
    });

    try {
      const userRefs = [...userIds].map(userId => doc(firestore, 'users', userId));
      const unsubscribes = userRefs.map(userRef => 
        onSnapshot(userRef, 
          (doc) => {
            if (doc.exists()) {
              const userData = doc.data();
              setPlayerNames(prev => ({
                ...prev,
                [doc.id]: userData.displayName || 'Anonymous Player'
              }));
            } else {
              const user = auth.currentUser;
              if (user && user.uid === doc.id && user.displayName) {
                setPlayerNames(prev => ({
                  ...prev,
                  [doc.id]: user.displayName
                }));
              }
            }
          },
          (error) => {
            console.warn(`Error listening to user ${userRef.id}:`, error);
          }
        )
      );

      // Store unsubscribe functions
      return () => unsubscribes.forEach(unsubscribe => unsubscribe());
    } catch (error) {
      console.error('Error setting up player name listeners:', error);
    }
  };

  // Add court formatting function before searchNearbyBasketballCourts
  const formatCourtData = (court) => ({
    ...court,
    nameLowerCase: court.name.toLowerCase(),
    addressLowerCase: court.address ? court.address.toLowerCase() : ''
  });

  const searchNearbyBasketballCourts = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${latitude},${longitude}&` +
        `radius=5000&` + // 5km radius
        `keyword=basketball+court&` +
        `key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      
      if (data.status === 'OK') {
        const courtsList = data.results.map(place => ({
          id: place.place_id,
          name: place.name,
          address: place.vicinity,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          rating: place.rating
        }));
        
        // Store courts in Firestore for offline access
        courtsList.forEach(async (court) => {
          try {
            const courtRef = doc(firestore, 'basketball_courts', court.id);
            const existingDoc = await getDoc(courtRef);
            const formattedCourt = formatCourtData(court);
            
            if (existingDoc.exists()) {
              // Preserve existing signups data
              await setDoc(courtRef, {
                ...formattedCourt,
                signups: existingDoc.data().signups || {}
              }, { merge: true });
            } else {
              // New court, initialize with empty signups
              await setDoc(courtRef, {
                ...formattedCourt,
                signups: {}
              });
            }
          } catch (error) {
            console.warn('Failed to store court data:', error);
            // Continue even if storage fails
          }
        });
        
        setCourts(courtsList);
        setFilteredCourts(courtsList);
      } else {
        console.error('Error fetching nearby courts:', data.status);
        Alert.alert('Error', 'Could not fetch nearby courts. Please try again later.');
      }
    } catch (error) {
      console.error('Error searching nearby courts:', error);
      Alert.alert('Error', 'Could not fetch nearby courts. Please check your internet connection.');
    }
  };

  useEffect(() => {
    const setup = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
          setError('Location permission denied');
          setLoading(false);
        return;
      }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });

        await searchNearbyBasketballCourts(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );
      } catch (error) {
        console.error("Error in setup:", error);
        setError('Could not get your location. Please check your settings.');
      } finally {
        setLoading(false);
      }
    };

    setup();
  }, []);

  const handleCourtPress = async (court) => {
    setSelectedCourt(court);
    setModalVisible(true); // Show modal immediately with basic court info
    
    try {
      const courtRef = doc(firestore, 'basketball_courts', court.id);
      
      // Set up real-time listener for court data
      const unsubscribe = onSnapshot(courtRef,
        (doc) => {
          if (doc.exists()) {
            const courtData = doc.data();
            const signups = courtData.signups || {};
            setSignedUpPlayers(signups);
            
            // Set up player name listeners
            fetchPlayerNames(signups).catch(error => {
              console.warn('Error setting up player name listeners:', error);
            });
            
            // Track which time slots the current user is signed up for
            const userId = auth.currentUser.uid;
            const userSlots = {};
            Object.entries(signups).forEach(([time, players]) => {
              userSlots[time] = players.includes(userId);
            });
            setUserSignups(userSlots);
          } else {
            // Create court document if it doesn't exist
            setDoc(courtRef, {
              ...court,
              signups: {}
            }).catch(error => {
              console.warn('Failed to create court document:', error);
            });
            setSignedUpPlayers({});
            setUserSignups({});
          }
        },
        (error) => {
          console.error("Error listening to court details:", error);
          if (error.code === 'unavailable') {
            Alert.alert(
              'Offline Mode',
              'You are currently offline. Some features may be limited.',
              [{ text: 'OK' }]
            );
          }
        }
      );

      // Store unsubscribe function
      setCourtListeners(prev => ({
        ...prev,
        [court.id]: unsubscribe
      }));
    } catch (error) {
      console.error("Error setting up court listener:", error);
      setSignedUpPlayers({});
      setUserSignups({});
    }
  };

  const handleSignUp = async () => {
    if (!selectedTime) {
      Alert.alert('Error', 'Please select a time');
      return;
    }

    const userId = auth.currentUser.uid;
    const timeSlotKey = `${selectedDate}_${selectedTime}`;

    // Check if user is already signed up
    if (userSignups[timeSlotKey]) {
      Alert.alert('Error', 'You are already signed up for this time slot');
      return;
    }

    // Get display name from Auth first (faster than Firestore)
    const displayName = auth.currentUser.displayName || 'Anonymous Player';

    // Immediately update UI with current user's name
    setPlayerNames(prev => ({
      ...prev,
      [userId]: displayName
    }));

    // Optimistically update the UI
    setSignedUpPlayers(prev => ({
      ...prev,
      [timeSlotKey]: [...(prev[timeSlotKey] || []), userId]
    }));
    setUserSignups(prev => ({
      ...prev,
      [timeSlotKey]: true
    }));

    try {
      const courtRef = doc(firestore, 'basketball_courts', selectedCourt.id);
      await updateDoc(courtRef, {
        [`signups.${timeSlotKey}`]: arrayUnion(userId)
      });

      // Try to update display name in Firestore in the background
      try {
        const userRef = doc(firestore, 'users', userId);
        await setDoc(userRef, {
          displayName,
          email: auth.currentUser.email,
          updatedAt: new Date()
        }, { merge: true });
      } catch (error) {
        console.warn('Background user document update error:', error);
      }
      
      Alert.alert('Success', 'Successfully signed up!');
    } catch (error) {
      console.error("Error signing up:", error);
      
      // Revert optimistic updates
      setSignedUpPlayers(prev => ({
        ...prev,
        [timeSlotKey]: (prev[timeSlotKey] || []).filter(id => id !== userId)
      }));
      setUserSignups(prev => ({
        ...prev,
        [timeSlotKey]: false
      }));

      if (error.code === 'unavailable' || error.message?.includes('offline')) {
        Alert.alert(
          'Error',
          'You appear to be offline. Please check your internet connection and try again.',
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedTime('');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to sign up. Please try again.', [
          {
            text: 'OK',
            onPress: () => {
              setSelectedTime('');
            }
          }
        ]);
      }
    }
  };

  const handleCancelSignUp = async () => {
    if (!selectedTime) {
      Alert.alert('Error', 'Please select a time');
      return;
    }

    const userId = auth.currentUser.uid;
    const timeSlotKey = `${selectedDate}_${selectedTime}`;

    // Check if user is actually signed up
    if (!userSignups[timeSlotKey]) {
      Alert.alert('Error', 'You are not signed up for this time slot');
      return;
    }

    // Optimistically update the UI
    setSignedUpPlayers(prev => ({
      ...prev,
      [timeSlotKey]: (prev[timeSlotKey] || []).filter(id => id !== userId)
    }));
    setUserSignups(prev => ({
      ...prev,
      [timeSlotKey]: false
    }));

    try {
      const courtRef = doc(firestore, 'basketball_courts', selectedCourt.id);
      await updateDoc(courtRef, {
        [`signups.${timeSlotKey}`]: arrayRemove(userId)
      });
      
      Alert.alert('Success', 'Successfully cancelled signup!');
    } catch (error) {
      // Revert optimistic updates
      setSignedUpPlayers(prev => ({
        ...prev,
        [timeSlotKey]: [...(prev[timeSlotKey] || []), userId]
      }));
      setUserSignups(prev => ({
        ...prev,
        [timeSlotKey]: true
      }));

      console.error("Error cancelling signup:", error);
      if (error.code === 'unavailable') {
        Alert.alert(
          'Error',
          'You are currently offline. Please try again when you have an internet connection.'
        );
      } else {
        Alert.alert('Error', 'Failed to cancel signup. Please try again.');
      }
    }
  };

  // Cleanup listeners when modal is closed
  useEffect(() => {
    if (!modalVisible && selectedCourt && courtListeners[selectedCourt.id]) {
      // Call the unsubscribe function
      courtListeners[selectedCourt.id]();
      
      // Remove the listener from state
      setCourtListeners(prev => {
        const newListeners = { ...prev };
        delete newListeners[selectedCourt.id];
        return newListeners;
      });

      // Reset states
      setSelectedTime('');
      setSignedUpPlayers({});
      setUserSignups({});
    }
  }, [modalVisible]);

  // Cleanup all listeners on unmount
  useEffect(() => {
    return () => {
      Object.values(courtListeners).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [courtListeners]);

  // Add debounced search function
  const searchCourts = async (searchText) => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!searchText.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setFilteredCourts(courts);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        // First, filter local courts
        const localMatches = courts.filter(court => 
          court.name.toLowerCase().includes(searchText.toLowerCase()) ||
          (court.address && court.address.toLowerCase().includes(searchText.toLowerCase()))
        );

        // Then, search Firestore for additional courts
        const courtsRef = collection(firestore, 'basketball_courts');
        
        // Create multiple queries to search both name and address fields
        const nameStartsWithQuery = query(
          courtsRef,
          where('nameLowerCase', '>=', searchText.toLowerCase()),
          where('nameLowerCase', '<=', searchText.toLowerCase() + '\uf8ff')
        );
        
        const nameContainsQuery = query(
          courtsRef,
          where('nameLowerCase', '>=', searchText.toLowerCase())
        );

        const addressQuery = query(
          courtsRef,
          where('addressLowerCase', '>=', searchText.toLowerCase()),
          where('addressLowerCase', '<=', searchText.toLowerCase() + '\uf8ff')
        );
        
        // Execute all queries in parallel
        const [nameStartsWithSnapshot, nameContainsSnapshot, addressSnapshot] = await Promise.all([
          getDocs(nameStartsWithQuery),
          getDocs(nameContainsQuery),
          getDocs(addressQuery)
        ]);
        
        const firestoreMatches = new Set();
        
        // Process results from all queries
        const processSnapshot = (snapshot) => {
          snapshot.forEach(doc => {
            const courtData = doc.data();
            // Only add if not already in local matches and matches search text
            if (!localMatches.some(local => local.id === doc.id) && 
                (courtData.name.toLowerCase().includes(searchText.toLowerCase()) ||
                 (courtData.address && courtData.address.toLowerCase().includes(searchText.toLowerCase())))) {
              firestoreMatches.add({
                id: doc.id,
                ...courtData
              });
            }
          });
        };

        processSnapshot(nameStartsWithSnapshot);
        processSnapshot(nameContainsSnapshot);
        processSnapshot(addressSnapshot);

        // Combine and deduplicate results
        const allMatches = [...localMatches, ...Array.from(firestoreMatches)];
        const uniqueMatches = Array.from(new Set(allMatches.map(court => court.id)))
          .map(id => allMatches.find(court => court.id === id));

        setSuggestions(uniqueMatches);
        setShowSuggestions(true);
        setFilteredCourts(uniqueMatches);

        // If we have matches and a map reference, fit the map
        if (uniqueMatches.length > 0 && mapRef.current) {
          const coordinates = uniqueMatches.map(court => ({
            latitude: court.latitude,
            longitude: court.longitude,
          }));
          
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
      } catch (error) {
        console.error('Error searching courts:', error);
      }
    }, 300); // 300ms debounce
  };

  // Update search effect
  useEffect(() => {
    searchCourts(searchQuery);
  }, [searchQuery]);

  const handleSuggestionPress = (court) => {
    setSearchQuery(court.name);
    setShowSuggestions(false);
    Keyboard.dismiss();
    
    // Center map on selected court
    mapRef.current?.animateToRegion({
      latitude: court.latitude,
      longitude: court.longitude,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    }, 1000);

    // Optional: Open court details
    handleCourtPress(court);
  };

  if (loading || !location) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search courts by name..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.length > 0) {
                setShowSuggestions(true);
              }
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                setShowSuggestions(false);
                setSuggestions([]);
                setFilteredCourts(courts);
                Keyboard.dismiss();
              }}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {showSuggestions && suggestions.length > 0 && (
          <ScrollView 
            style={styles.suggestionsContainer}
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((court) => (
              <TouchableOpacity
                key={court.id}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(court)}
              >
                <Text style={styles.suggestionTitle}>{court.name}</Text>
                {court.address && (
                  <Text style={styles.suggestionAddress}>{court.address}</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
      
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={location}
        showsUserLocation
        showsMyLocationButton
      >
        {filteredCourts.map(court => (
          <Marker
            key={court.id}
            coordinate={{
              latitude: court.latitude,
              longitude: court.longitude
            }}
            title={court.name}
            description={court.address || 'Basketball Court'}
            onPress={() => handleCourtPress(court)}
          />
        ))}
      </MapView>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedCourt?.name}</Text>
            <Text style={styles.modalAddress}>{selectedCourt?.address}</Text>
            {selectedCourt?.rating && (
              <Text style={styles.modalRating}>Rating: {selectedCourt.rating} ️</Text>
            )}

            <Text style={styles.sectionTitle}>Select Date</Text>
            <Calendar
              current={selectedDate}
              minDate={new Date().toISOString().split('T')[0]}
              maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: '#007AFF' }
              }}
              theme={{
                todayTextColor: '#007AFF',
                selectedDayBackgroundColor: '#007AFF',
                selectedDayTextColor: '#ffffff',
              }}
            />

            <Text style={styles.sectionTitle}>Select Time</Text>
            <View style={styles.timeSlots}>
              {['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'].map((time) => {
                const timeSlotKey = `${selectedDate}_${time}`;
                const isSignedUp = userSignups[timeSlotKey];
                const players = signedUpPlayers[timeSlotKey] || [];
                
                return (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeSlot,
                      selectedTime === time && styles.selectedTimeSlot,
                      isSignedUp && styles.signedUpTimeSlot
                    ]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      selectedTime === time && styles.selectedTimeSlotText,
                      isSignedUp && styles.signedUpTimeSlotText
                    ]}>{time}</Text>
                    <View style={styles.timeSlotInfo}>
                      {players.length > 0 && (
                        <View style={styles.playersContainer}>
                          <Text style={styles.playerCount}>
                            {players.length} {players.length === 1 ? 'player' : 'players'}:
                          </Text>
                          {players.map((playerId) => (
                            <Text key={playerId} style={styles.playerName}>
                              {playerNames[playerId] || 'Loading...'}
                            </Text>
                          ))}
                        </View>
                      )}
                      {isSignedUp && (
                        <Text style={styles.signedUpText}>You're signed up!</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.signUpButton}
                onPress={handleSignUp}
              >
                <Text style={styles.buttonText}>Sign Up</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelSignUp}
              >
                <Text style={styles.buttonText}>Cancel Signup</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    position: 'absolute',
    top: 50,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    padding: 10,
    borderRadius: 8,
    margin: 10,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
  },
  modalView: {
    flex: 1,
    marginTop: 50,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalAddress: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  modalRating: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  timeSlots: {
    flexDirection: 'column',
    marginBottom: 20,
  },
  timeSlot: {
    flexDirection: 'row',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeSlotText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  selectedTimeSlotText: {
    color: '#fff',
  },
  signedUpTimeSlot: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  signedUpTimeSlotText: {
    color: '#fff',
  },
  timeSlotInfo: {
    flex: 2,
    alignItems: 'flex-end',
  },
  playersContainer: {
    alignItems: 'flex-end',
  },
  playerCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  playerName: {
    fontSize: 14,
    color: '#666',
  },
  signedUpText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonContainer: {
    gap: 10,
    marginTop: 20,
    paddingBottom: 20,
  },
  signUpButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#000',
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    width: '90%',
    alignSelf: 'center',
    zIndex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
    marginRight: 5,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: 'white',
    borderRadius: 10,
    marginTop: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionTitle: {
    fontSize: 16,
    color: '#000',
  },
  suggestionAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default MapScreen;
