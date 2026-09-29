// ============================================================================
// QBase — AIClient (Prime §D5)
// ---------------------------------------------------------------------------
// Provider-agnostic client: the browser talks ONLY to our own server-side
// relay (/api/ai), never to the AI provider. The provider key never reaches
// the client bundle; the relay fails closed with 503 AI_DISABLED until the
// deployment supplies one (Prime: "fails closed when the provider secret is
// absent"). Session auth is attached from the current Supabase session.
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import {
  AiAuthRequiredError,
  AiDisabledError,
  type AiToolName,
} from './types';

export interface AiResult {
  tool: AiToolName;
  model: string | null;
  content: string;
}

export interface AiCallOptions {
  /** Optional system prompt (tool-specific instructions). */
  system?: string;
  /** Max tokens for the provider completion (16–8000). */
  maxTokens?: number;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}

interface EndpointErrorBody {
  error?: string;
  code?: string;
  retryable?: boolean;
}

/**
 * Invoke one AI tool through the server relay. Throws:
 *  - AiDisabledError (503 AI_DISABLED) when the deployment lacks a provider key
 *  - AiAuthRequiredError (401) when the session is missing/expired
 *  - Error with a readable message for provider/validation failures
 */
export async function aiComplete(
  tool: AiToolName,
  prompt: string,
  options: AiCallOptions = {}
): Promise<AiResult> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (sessionError || !accessToken) {
    // Fail closed client-side too: never even call the endpoint unauthenticated.
    throw new AiAuthRequiredError();
  }

  let res: Response;
  try {
    res = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        tool,
        prompt,
        system: options.system,
        max_tokens: options.maxTokens,
      }),
      signal: options.signal,
    });
  } catch (error) {
    // Network failure reaching our own relay — surface honestly, never silent.
    throw new Error(
      `AI request could not reach the server: ${(error as Error)?.message || 'network error'}`
    );
  }

  if (res.status === 503) {
    const body = (await res.json().catch(() => ({}))) as EndpointErrorBody;
    throw new AiDisabledError(body.error || undefined);
  }
  if (res.status === 401) {
    throw new AiAuthRequiredError();
  }

  const body = (await res.json().catch(() => ({}))) as EndpointErrorBody & {
    content?: string;
    model?: string | null;
  };

  if (!res.ok) {
    const retryNote = body.retryable
      ? ' (rate limited or provider busy — try again shortly)'
      : '';
    throw new Error((body.error || `AI request failed (${res.status})`) + retryNote);
  }

  if (!body.content) {
    throw new Error('AI relay returned no content.');
  }
  return { tool, model: body.model ?? null, content: body.content };
}