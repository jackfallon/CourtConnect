# CourtConnect 🏀

CourtConnect is a mobile application that helps basketball enthusiasts find and reserve court time at nearby public basketball courts. Users can view available courts on a map, sign up for specific time slots, and see who else is planning to play.

## Features

- 📍 Map view of nearby basketball courts
- 📅 Calendar-based court reservation system
- 👥 Real-time player signup tracking
- 🔍 Court search functionality
- 📱 Mobile-friendly interface

## Tech Stack

- React Native / Expo
- Firebase (Authentication & Firestore)
- Google Maps API
- React Native Calendars

## Demo

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/yourusername/CourtConnect.git
cd CourtConnect
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables and configuration:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Copy Firebase configuration template:
     ```bash
     cp config/FirebaseConfig.example.js config/FirebaseConfig.js
     ```
   - Fill in your API keys and configuration values in both `.env` and `config/FirebaseConfig.js`

4. Required API Keys/Services:
   - Google Maps API key (for court location services)
   - Firebase project configuration
     - Create a new project at [Firebase Console](https://console.firebase.google.com)
     - Enable Authentication and Firestore
     - Add your app to get the configuration values
     - Add these values to both `.env` and ensure `FirebaseConfig.js` is properly configured

5. Start the development server:
```bash
npx expo start
```

## Environment Variables

The following environment variables are required in your `.env` file:

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

## Security Note

The repository includes example configuration files:
- `.env.example`: Template for environment variables
- `config/FirebaseConfig.example.js`: Template for Firebase configuration

The actual configuration files (`.env` and `config/FirebaseConfig.js`) are not included in the repository for security reasons. You must create these files locally with your own API keys and Firebase configuration values.


