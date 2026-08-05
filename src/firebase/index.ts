
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { firebaseConfig } from './config';
import { shouldUseFirebaseEmulators } from './emulators';

let emulatorsConnected = false;

export function initializeFirebase(): { app: FirebaseApp; db: Firestore; auth: Auth } {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  if (shouldUseFirebaseEmulators() && !emulatorsConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    emulatorsConnected = true;
  }

  return { app, db, auth };
}

export function getFirebaseAuth(): Auth {
  return initializeFirebase().auth;
}

export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './error-emitter';
export * from './errors';
