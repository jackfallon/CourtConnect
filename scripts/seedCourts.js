import { firestore } from '@/config/FirebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

const sampleCourts = [
  {
    name: "Central Park Basketball Court",
    address: "Central Park, New York, NY",
    latitude: 40.785091,
    longitude: -73.968285,
    signups: {}
  },
  {
    name: "Rucker Park",
    address: "155th St & Frederick Douglass Blvd, New York, NY",
    latitude: 40.830878,
    longitude: -73.936218,
    signups: {}
  },
  {
    name: "Venice Beach Basketball Courts",
    address: "1800 Ocean Front Walk, Venice, CA",
    latitude: 33.985271,
    longitude: -118.472769,
    signups: {}
  },
  {
    name: "The Cage",
    address: "West 4th Street Courts, New York, NY",
    latitude: 40.731411,
    longitude: -74.000602,
    signups: {}
  },
  {
    name: "Shaw Park Basketball Court",
    address: "Shaw Park, San Francisco, CA",
    latitude: 37.774929,
    longitude: -122.419416,
    signups: {}
  }
];

const seedCourts = async () => {
  try {
    const courtsRef = collection(firestore, 'basketball_courts');
    
    for (const court of sampleCourts) {
      await addDoc(courtsRef, court);
      console.log(`Added court: ${court.name}`);
    }
    
    console.log('Successfully seeded basketball courts!');
  } catch (error) {
    console.error('Error seeding courts:', error);
  }
};

// Run the seeding function
seedCourts(); 