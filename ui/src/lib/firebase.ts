import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
} from "firebase/auth";
import type { FirebaseOptions } from "firebase/app";

// Get Firebase config from environment variables
// For local development, set these in a .env file
// For Vercel production, set these as environment variables in the Vercel dashboard
function getFirebaseConfig(): FirebaseOptions {
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  // Validate that all required env vars are present
  if (
    !envConfig.apiKey ||
    !envConfig.authDomain ||
    !envConfig.projectId ||
    !envConfig.storageBucket ||
    !envConfig.messagingSenderId ||
    !envConfig.appId
  ) {
    throw new Error(
      "Firebase configuration not found. Please set VITE_FIREBASE_* environment variables.\n" +
      "For local development, create a .env file with:\n" +
      "  VITE_FIREBASE_API_KEY=your-api-key\n" +
      "  VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com\n" +
      "  VITE_FIREBASE_PROJECT_ID=your-project-id\n" +
      "  VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com\n" +
      "  VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id\n" +
      "  VITE_FIREBASE_APP_ID=your-app-id\n" +
      "  VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id (optional)\n" +
      "\n" +
      "For Vercel production, set these as environment variables in the Vercel dashboard."
    );
  }

  return envConfig as FirebaseOptions;
}

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Connect to Firebase Auth emulator only when explicitly enabled
// Check both env var names for compatibility
const useEmulator = 
  import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true" || 
  import.meta.env.VITE_FIREBASE_EMULATOR === "true";

if (useEmulator) {
  try {
    const firebaseAuthPort =
      import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT || "5503";
    const emulatorUrl = `http://localhost:${firebaseAuthPort}`;
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
    console.log(`🧪 Connected to Firebase Auth emulator at ${emulatorUrl}`);
  } catch (error) {
    // Emulator already connected or not available
    console.debug("Firebase Auth emulator connection skipped:", error);
  }
} else {
  console.log(
    `🏭 Using production Firebase Auth (Project: ${firebaseConfig.projectId})`
  );
}
