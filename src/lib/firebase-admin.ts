import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { requireEnv } from "@/lib/server-env";
import { assertLoopbackEmulatorHosts } from "@/firebase/emulators";

let adminApp: App | undefined;

function isServerEmulatorMode(environment: Record<string, string | undefined> = process.env): boolean {
  if (environment.FIREBASE_EMULATORS !== "true") {
    return false;
  }

  assertLoopbackEmulatorHosts(environment);
  return true;
}

export function getAdminApp(): App {
  const useEmulators = isServerEmulatorMode();

  if (adminApp) {
    return adminApp;
  }

  const existingApp = getApps()[0];
  if (existingApp) {
    adminApp = existingApp;
    return adminApp;
  }

  if (useEmulators) {
    adminApp = initializeApp({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
    });
    return adminApp;
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });

  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
