import { getStoreConfiguration } from "@/lib/firestore/configuration";

export async function GET(): Promise<Response> {
  return Response.json({ configuration: await getStoreConfiguration() });
}
