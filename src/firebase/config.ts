export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export const LOCAL_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "demo-key",
  authDomain: "demo-coctels-e2e.firebaseapp.com",
  projectId: "demo-coctels-e2e",
  storageBucket: "demo-coctels-e2e.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:demo-coctels-e2e",
};

type PublicFirebaseEnvironment = Record<string, string | undefined>;

export function getFirebaseConfig(environment: PublicFirebaseEnvironment): FirebaseConfig {
  const useLocalDefaults = environment.NEXT_PUBLIC_FIREBASE_EMULATORS === "true";
  const value = (name: string, localDefault: string): string => environment[name] ?? (useLocalDefaults ? localDefault : "");

  return {
    apiKey: value("NEXT_PUBLIC_FIREBASE_API_KEY", LOCAL_FIREBASE_CONFIG.apiKey),
    authDomain: value("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", LOCAL_FIREBASE_CONFIG.authDomain),
    projectId: value("NEXT_PUBLIC_FIREBASE_PROJECT_ID", LOCAL_FIREBASE_CONFIG.projectId),
    storageBucket: value("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", LOCAL_FIREBASE_CONFIG.storageBucket),
    messagingSenderId: value("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", LOCAL_FIREBASE_CONFIG.messagingSenderId),
    appId: value("NEXT_PUBLIC_FIREBASE_APP_ID", LOCAL_FIREBASE_CONFIG.appId),
  };
}

export const firebaseConfig = getFirebaseConfig({
  NEXT_PUBLIC_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_FIREBASE_EMULATORS,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
