import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyByWjTyISY3_XO1ms8RZUxOzkK9PDiD8sY",
  authDomain: "jedvik-artist.firebaseapp.com",
  projectId: "jedvik-artist",
  storageBucket: "jedvik-artist.firebasestorage.app",
  messagingSenderId: "52603306127",
  appId: "1:52603306127:web:78f19a8ea3d3492e7af0fa"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
