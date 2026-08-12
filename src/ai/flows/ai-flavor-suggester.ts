'use server';
/**
 * @fileOverview An AI granizado flavor suggester. Clients can use this to get unique flavor combinations.
 *
 * - aiFlavorSuggester - A function that handles the flavor suggestion process.
 * Input and output contracts live in the sibling contract module so they can be
 * shared without importing this server-only module into client components.
 */

import { ai } from '@/ai/genkit';
import { headers } from 'next/headers';

import { getAdminDb } from '@/lib/firebase-admin';
import { getRateLimitIdentity, hashRateLimitIdentity, reserveAIRateLimit } from '@/lib/ai/ai-rate-limit';
import { requireEnv } from '@/lib/server-env';
import {
  AIFlavorSuggesterError,
  AIFlavorSuggesterInputSchema,
  AIFlavorSuggesterOutputSchema,
  type AIFlavorSuggesterInput,
  type AIFlavorSuggesterOutput,
} from './ai-flavor-suggester-contract';

export async function aiFlavorSuggester(input: AIFlavorSuggesterInput): Promise<AIFlavorSuggesterOutput> {
  const validatedInput = AIFlavorSuggesterInputSchema.parse(input);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const deadline = Date.now() + 10_000;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        reject(new Error('AI flavor suggester timeout'));
      }, 10_000);
    });

    const flowOutput = await Promise.race([
      (async () => {
        const secret = requireEnv('AI_RATE_LIMIT_SECRET');
        const requestHeaders = await headers();
        const identity = getRateLimitIdentity(requestHeaders);
        const digest = hashRateLimitIdentity(identity, secret);
        const allowed = await reserveAIRateLimit({ db: getAdminDb(), digest });

        if (!allowed || timedOut || Date.now() >= deadline) {
          throw new Error('AI flavor suggester request unavailable');
        }

        return aiFlavorSuggesterFlow(validatedInput);
      })(),
      timeout,
    ]);
    return AIFlavorSuggesterOutputSchema.parse(flowOutput);
  } catch {
    throw new AIFlavorSuggesterError();
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

const aiFlavorSuggesterPrompt = ai.definePrompt({
  name: 'aiFlavorSuggesterPrompt',
  input: { schema: AIFlavorSuggesterInputSchema },
  output: { schema: AIFlavorSuggesterOutputSchema },
  prompt: `You are an expert granizado (shaved ice drink) flavor creator. Your goal is to suggest unique and delicious flavor combinations based on the user's preferences.

Consider popular ingredients, seasonal availability, and innovative pairings to create an exciting new granizado flavor.

User Preferences: {{{preferences}}}

Suggest a creative granizado flavor combination.`,
});

const aiFlavorSuggesterFlow = ai.defineFlow(
  {
    name: 'aiFlavorSuggesterFlow',
    inputSchema: AIFlavorSuggesterInputSchema,
    outputSchema: AIFlavorSuggesterOutputSchema,
  },
  async (input) => {
    const { output } = await aiFlavorSuggesterPrompt(input);
    return AIFlavorSuggesterOutputSchema.parse(output);
  }
);
