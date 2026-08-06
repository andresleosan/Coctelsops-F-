import { describe, expect, it } from "vitest";

import { getFirebaseConfig } from "@/firebase/config";

describe("configuracion publica de Firebase", () => {
  it("usa defaults demo solo cuando el modo emulator esta activo", () => {
    expect(getFirebaseConfig({ NEXT_PUBLIC_FIREBASE_EMULATORS: "true" })).toEqual({
      apiKey: "demo-key",
      authDomain: "demo-coctels-e2e.firebaseapp.com",
      projectId: "demo-coctels-e2e",
      storageBucket: "demo-coctels-e2e.firebasestorage.app",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:demo-coctels-e2e",
    });
  });

  it("prefiere variables publicas explicitas en modo emulator", () => {
    expect(getFirebaseConfig({
      NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
      NEXT_PUBLIC_FIREBASE_API_KEY: "custom-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "custom.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "custom-project",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "custom.firebasestorage.app",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "9876543210",
      NEXT_PUBLIC_FIREBASE_APP_ID: "custom-app",
    })).toEqual({
      apiKey: "custom-key",
      authDomain: "custom.firebaseapp.com",
      projectId: "custom-project",
      storageBucket: "custom.firebasestorage.app",
      messagingSenderId: "9876543210",
      appId: "custom-app",
    });
  });

  it("no usa defaults demo fuera del modo emulator", () => {
    expect(getFirebaseConfig({
      NEXT_PUBLIC_FIREBASE_EMULATORS: "false",
    })).toEqual({
      apiKey: "",
      authDomain: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: "",
      appId: "",
    });
  });
});
