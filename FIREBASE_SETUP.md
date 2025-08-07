# 🔥 Firebase Setup Guide for Calendr

## Step 1: Create Firebase Project

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. **Click "Create a project"**
3. **Enter project name**: `calendr-app`
4. **Enable Google Analytics** (optional)
5. **Click "Create project"**

## Step 2: Add Web App

1. **Click the web icon** (</>) on the project overview
2. **Register app**: `calendr-web`
3. **Copy the config** - you'll need this for the next step

## Step 3: Update Firebase Configuration

1. **Open `firebase-config.js`**
2. **Replace the placeholder values** with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};
```

## Step 4: Enable Authentication

1. **Go to Authentication** in Firebase console
2. **Click "Get started"**
3. **Go to "Sign-in method" tab**
4. **Enable "Email/Password"**
5. **Click "Save"**

## Step 5: Set up Firestore Database

1. **Go to Firestore Database** in Firebase console
2. **Click "Create database"**
3. **Start in test mode** (for development)
4. **Choose location** (closest to your users)

## Step 6: Security Rules (Optional)

In Firestore Database > Rules, you can set up security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /todos/{todoId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## Step 7: Test Your Setup

1. **Open your Calendr app**
2. **Click "Sign Up"** to create an account
3. **Add some todos** to test the cloud storage
4. **Check Firebase Console** to see your data

## Features Now Available

✅ **User Authentication** - Sign up/login with email/password
✅ **Cloud Storage** - Todos stored in Firebase Firestore
✅ **Data Sync** - Todos sync across devices
✅ **Offline Support** - Works even without internet
✅ **Real-time Updates** - Changes appear instantly
✅ **User Isolation** - Each user sees only their own todos

## Free Tier Limits

- **1GB storage** - Plenty for todo data
- **50K reads/day** - Good for small to medium apps
- **20K writes/day** - Sufficient for todo management
- **20K deletes/day** - More than enough

## Troubleshooting

### "Firebase not initialized" error
- Check that `firebase-config.js` has correct values
- Ensure Firebase SDK scripts are loading

### "Permission denied" error
- Check Firestore security rules
- Ensure user is authenticated

### Todos not saving
- Check browser console for errors
- Verify Firebase project is set up correctly

## Next Steps

1. **Deploy to Firebase Hosting** for production
2. **Add Google Sign-in** for easier authentication
3. **Set up custom domain** for your app
4. **Monitor usage** in Firebase Console

Your Calendr app now has full cloud storage capabilities! 🎉 