import { z } from 'zod';

const AI_FLAVOR_SUGGESTER_ERROR_MESSAGE = 'No pudimos generar una sugerencia en este momento.';

export const AIFlavorSuggesterInputSchema = z.object({
  preferences: z
    .string()
    .trim()
    .min(3)
    .max(240)
    .describe(
      'A description of the user\'s flavor preferences, preferred ingredients, or desired taste profile (e.g., "tropical fruits", "something sweet and tangy", "seasonal berries").'
    ),
});
export type AIFlavorSuggesterInput = z.infer<typeof AIFlavorSuggesterInputSchema>;

export const AIFlavorSuggesterOutputSchema = z.object({
  flavorName: z.string().max(80).describe('A creative and enticing name for the granizado flavor.'),
  description: z.string().max(300).describe('A short, appealing description of the flavor combination.'),
  ingredients: z.array(z.string().max(60)).max(8).describe('A list of the main ingredients used in this granizado flavor.'),
});
export type AIFlavorSuggesterOutput = z.infer<typeof AIFlavorSuggesterOutputSchema>;

export class AIFlavorSuggesterError extends Error {
  constructor() {
    super(AI_FLAVOR_SUGGESTER_ERROR_MESSAGE);
    this.name = 'AIFlavorSuggesterError';
  }
}
