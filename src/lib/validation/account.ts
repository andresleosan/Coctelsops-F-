import { z } from "zod";

const addressSchema = z.object({
  id: z.string().trim().min(1).max(80),
  alias: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(20),
  address: z.string().trim().min(3).max(200),
  neighborhood: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(300).optional(),
}).strict();

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(120).nullable().optional(),
  telefono: z.string().trim().min(7).max(20).nullable().optional(),
  addresses: z.array(addressSchema).max(10).optional(),
}).strict().refine((input) => Object.keys(input).length > 0, {
  message: "Debes enviar al menos un campo editable",
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
