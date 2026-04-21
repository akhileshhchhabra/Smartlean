    // Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA71s9hN4wlVFLZTHj-qGwAJjjWXAtPSNA",
  authDomain: "smart-learn-4e62c.firebaseapp.com",
  projectId: "smart-learn-4e62c",
  storageBucket: "smart-learn-4e62c.firebasestorage.app",
  messagingSenderId: "661378763999",
  appId: "1:661378763999:web:fac2a68dcfc5a8ecd32d6a",
  measurementId: "G-C7SCT54989"
};

// Initialize Firebase (only on client)
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;