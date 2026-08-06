
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { firebaseConfig } from './config';
import { getClientEmulatorHosts, shouldUseFirebaseEmulators } from './emulators';

let emulatorsConnected = false;

export function initializeFirebase(): { app: FirebaseApp; db: Firestore; auth: Auth } {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const clientEnvironment = {
    NEXT_PUBLIC_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_FIREBASE_EMULATORS,
    NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST,
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
  };

  if (shouldUseFirebaseEmulators(clientEnvironment) && !emulatorsConnected) {
    const hosts = getClientEmulatorHosts(clientEnvironment);
    connectAuthEmulator(auth, `http://${hosts.auth.host}:${hosts.auth.port}`, { disableWarnings: true });
    connectFirestoreEmulator(db, hosts.firestore.host, hosts.firestore.port);
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
