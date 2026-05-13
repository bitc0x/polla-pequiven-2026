import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyA4y7aGvFKQWxJUpHjJBTUzOwIWJd7YOTs",
  authDomain: "fc-friendlies-tracker.firebaseapp.com",
  databaseURL: "https://fc-friendlies-tracker-default-rtdb.firebaseio.com",
  projectId: "fc-friendlies-tracker",
  storageBucket: "fc-friendlies-tracker.firebasestorage.app",
  messagingSenderId: "480194965245",
  appId: "1:480194965245:web:830ac0ee13cc95422bd894"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Root path for this app's data (isolates from FC tracker data)
export const DB_ROOT = "polla-pequiven-2026";
