import { beforeEach, describe, expect, it, vi } from "vitest";

const firebaseMocks = vi.hoisted(() => ({
  getFirebaseAuth: vi.fn(() => ({ id: "auth" })),
}));
const authMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  GoogleAuthProvider: vi.fn(function GoogleAuthProvider() {
    return { providerId: "google.com" };
  }),
}));

vi.mock("@/firebase", () => firebaseMocks);
vi.mock("firebase/auth", () => authMocks);
import {
  loginWithEmail,
  loginWithGoogle,
  logout,
  registerWithEmail,
  sendPasswordReset,
  sendVerificationEmail,
  translateAuthError,
} from "@/lib/auth-client";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("translateAuthError", () => {
  it.each([
    ["auth/invalid-credential", "El correo o la contraseña no son correctos."],
    ["auth/email-already-in-use", "Ya existe una cuenta con este correo."],
    ["auth/weak-password", "La contraseña debe tener al menos 8 caracteres."],
    ["auth/network-request-failed", "No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo."],
    ["auth/too-many-requests", "Demasiados intentos. Espera un momento e inténtalo de nuevo."],
    ["auth/popup-blocked", "El navegador bloqueó la ventana de Google. Permite ventanas emergentes e inténtalo de nuevo."],
  ])("traduce %s sin exponer detalles de Firebase", (code, message) => {
    expect(translateAuthError({ code, message: "detalle interno de Firebase" })).toBe(message);
  });

  it("traduce credenciales inválidas aunque Firebase use códigos alternativos", () => {
    expect(translateAuthError({ code: "auth/wrong-password" })).toBe(
      "El correo o la contraseña no son correctos."
    );
    expect(translateAuthError({ code: "auth/user-not-found" })).toBe(
      "El correo o la contraseña no son correctos."
    );
  });

  it("devuelve un mensaje seguro para errores desconocidos", () => {
    expect(translateAuthError({ code: "auth/otro-error", message: "secreto" })).toBe(
      "No pudimos completar el acceso. Inténtalo de nuevo."
    );
  });

  it("inicia sesión con correo normalizado", async () => {
    const credential = { user: { uid: "cliente-1" } };
    authMocks.signInWithEmailAndPassword.mockResolvedValue(credential);

    await expect(loginWithEmail(" cliente@ops.co ", "secreto" )).resolves.toBe(credential);
    expect(authMocks.signInWithEmailAndPassword).toHaveBeenCalledWith({ id: "auth" }, "cliente@ops.co", "secreto");
  });

  it("inicia sesión con el proveedor de Google", async () => {
    authMocks.signInWithPopup.mockResolvedValue({ user: { uid: "cliente-1" } });

    await loginWithGoogle();

    expect(authMocks.signInWithPopup).toHaveBeenCalledWith({ id: "auth" }, { providerId: "google.com" });
  });

  it("rechaza contraseñas menores a 8 caracteres antes de crear la cuenta", async () => {
    await expect(registerWithEmail("cliente@ops.co", "corta", "Cliente")).rejects.toMatchObject({ code: "auth/weak-password" });
    expect(authMocks.createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("crea el perfil, verifica el correo y expone las acciones auxiliares", async () => {
    const user = { uid: "cliente-1" };
    const credential = { user };
    authMocks.createUserWithEmailAndPassword.mockResolvedValue(credential);
    authMocks.updateProfile.mockResolvedValue(undefined);
    authMocks.sendEmailVerification.mockResolvedValue(undefined);

    await registerWithEmail(" cliente@ops.co ", "suficientemente-larga", " Cliente OPS ");
    await sendPasswordReset(" cliente@ops.co ");
    await sendVerificationEmail(user as never);
    await logout();

    expect(authMocks.createUserWithEmailAndPassword).toHaveBeenCalledWith({ id: "auth" }, "cliente@ops.co", "suficientemente-larga");
    expect(authMocks.updateProfile).toHaveBeenCalledWith(user, { displayName: "Cliente OPS" });
    expect(authMocks.sendEmailVerification).toHaveBeenCalledWith(user);
    expect(authMocks.sendPasswordResetEmail).toHaveBeenCalledWith({ id: "auth" }, "cliente@ops.co");
    expect(authMocks.signOut).toHaveBeenCalledWith({ id: "auth" });
  });
});
