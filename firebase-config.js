// ===========================================
// Firebase Configuration - WEB CONFIG ONLY
// ===========================================
// ⚠️ SECURITY WARNING: NEVER expose service account keys in GitHub!
// This file contains ONLY the public Web Configuration
// Service account keys must remain private and secure

// 🔑 HOW TO GET YOUR WEB CONFIG:
// 1. Go to: https://console.firebase.google.com
// 2. Select your project: ereportanamnagar
// 3. Click Settings icon (⚙️) → Project Settings
// 4. Scroll to "Your apps" section
// 5. Find your web app (or create one with web icon <>)
// 6. Under "SDK setup and configuration", copy the config object
// 7. Replace the values below with YOUR web config

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAxmrrnKs1hh_Z6kpgIO_XjDOMWE0Z7lhc",
  authDomain: "ereportanamnagar.firebaseapp.com",
  databaseURL: "https://ereportanamnagar-default-rtdb.firebaseio.com",
  projectId: "ereportanamnagar",
  storageBucket: "ereportanamnagar.firebasestorage.app",
  messagingSenderId: "252834171777",
  appId: "1:252834171777:web:efdee0887516c6fab57680",
  measurementId: "G-JNFJ9368TB"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firestore reference
const db = firebase.firestore();
const auth = firebase.auth();

// ⚠️ SECURITY: Change these credentials before sharing!
// These are demo credentials for development only
const ADMIN_ID = "admin";
const ADMIN_PASSWORD = "Supervisor@#$123";

// 🔒 SECURITY NOTES:
// - This config is PUBLIC and safe to expose
// - The apiKey is restricted in Firebase Console
// - Service account keys are PRIVATE - never share them
// - Keep your private keys in secure backend environments only
