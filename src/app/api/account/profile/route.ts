import { z } from "zod";

import { toAuthorizationResponse, verifyRequest } from "@/lib/auth/verify-request";
import { getUserProfile, updateUserProfile } from "@/lib/firestore/users";
import { profileUpdateSchema } from "@/lib/validation/account";
import type { UserProfile } from "@/types/auth";

function toCustomerProfile(profile: UserProfile) {
  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    telefono: profile.telefono,
    addresses: profile.addresses,
  };
}

function toProfileResponse(error: unknown): Response {
  if (error instanceof SyntaxError) {
    return Response.json({ error: "El cuerpo de la solicitud no es un JSON válido" }, { status: 422 });
  }
  if (error instanceof z.ZodError) {
    return Response.json({ error: error.issues[0]?.message ?? "Los datos del perfil no son válidos" }, { status: 422 });
  }
  return toAuthorizationResponse(error);
}

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await verifyRequest(request as never);
    const profile = await getUserProfile(user.uid);
    if (!profile) return Response.json({ error: "El perfil de usuario no está disponible" }, { status: 404 });
    return Response.json({ profile: toCustomerProfile(profile) });
  } catch (error) {
    return toProfileResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const user = await verifyRequest(request as never);
    const input = profileUpdateSchema.parse(await request.json());
    return Response.json({ profile: toCustomerProfile(await updateUserProfile(user.uid, input)) });
  } catch (error) {
    return toProfileResponse(error);
  }
}
