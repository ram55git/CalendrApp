// Firebase Configuration
// Replace these values with your actual Firebase project configuration
// You can find these in your Firebase Console > Project Settings > General > Your apps

const firebaseConfig = {
    apiKey: "AIzaSyAnEp0mUwzgK90p6QEJv2wO8ZJ3YUoPkUY",
    authDomain: "calendr-app-b3b8b.firebaseapp.com",
    projectId: "calendr-app-b3b8b",
    storageBucket: "calendr-app-b3b8b.firebasestorage.app",
    messagingSenderId: "159563172528",
    appId: "1:159563172528:web:9ef9d617672ca0b6ad8975"
};

// Initialize Firebase with error handling
try {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    
    // Initialize Firebase services
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Export for use in other files
    window.auth = auth;
    window.db = db;
    
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    // Set fallback values
    window.auth = null;
    window.db = null;
} 